/**
 * Shopify Multi-Step Product Configurator Engine
 * Powered by Metaobjects & Product Metafields
 */

const CONFIGURATOR_DEBUG = true;

class ProductConfiguratorEngine {
  constructor() {
    this.container = document.getElementById('ProductConfigurator');
    this.jsonPayload = document.getElementById('ConfiguratorDataJSON');
    
    if (!this.container || !this.jsonPayload) return;

    try {
      this.data = JSON.parse(this.jsonPayload.textContent);
    } catch (err) {
      console.error('[Configurator Error] Could not parse Metaobject JSON:', err);
      return;
    }

    if (!this.data || !this.data.steps || !this.data.steps.length) return;

    // Elements
    this.navContainer = document.getElementById('ConfiguratorStepsNav');
    this.summariesContainer = document.getElementById('ConfiguratorCompletedSummaries');
    this.activeStepContainer = document.getElementById('ConfiguratorActiveStepContainer');
    this.liveTotalEl = document.getElementById('ConfiguratorLiveTotal');
    this.mainPriceEl = document.getElementById('ProductPrice');
    this.prevBtn = document.getElementById('ConfiguratorPrevBtn');
    this.nextBtn = document.getElementById('ConfiguratorNextBtn');
    this.variantSelect = document.getElementById('Option-Variant-Select');
    this.qtyInput = document.getElementById('ConfiguratorQuantityInput');
    this.btnQtyDec = document.getElementById('ConfigQtyDecrease');
    this.btnQtyInc = document.getElementById('ConfigQtyIncrease');

    // State
    this.currentStepIndex = 0;
    this.selections = {}; // { [handleField]: { value, label, price_adjustment, fieldLabel } }
    this.visibility = {}; // { [handleField]: boolean }
    this.enabled = {};    // { [handleField]: boolean }

    if (CONFIGURATOR_DEBUG) {
      console.log('[Configurator Debug] Initialized Engine with Metaobject Data:', this.data);
    }

    this.init();
  }

  init() {
    // 1. Sort Steps
    this.steps = this.data.steps.sort((a, b) => (a.step_number || 0) - (b.step_number || 0));

    // 2. Sort Fields & Options within Steps & Set Default Values
    this.steps.forEach(step => {
      if (step.fields) {
        step.fields.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        step.fields.forEach(field => {
          if (field.options) {
            field.options.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          }
          this.visibility[field.handleField] = true;
          this.enabled[field.handleField] = true;

          // Apply default_value if provided
          if (field.default_value && field.options) {
            const defaultOpt = field.options.find(o => 
              String(o.value).toLowerCase().trim() === String(field.default_value).toLowerCase().trim() ||
              String(o.label).toLowerCase().trim() === String(field.default_value).toLowerCase().trim()
            );
            if (defaultOpt) {
              this.selections[field.handleField] = {
                value: defaultOpt.value,
                label: defaultOpt.label,
                price_adjustment: parseInt(defaultOpt.price_adjustment || 0, 10),
                fieldLabel: field.label
              };
            }
          }
        });
      }
    });

    // 3. Listen to Base Variant changes
    if (this.variantSelect) {
      this.variantSelect.addEventListener('change', () => {
        this.evaluateConfiguratorRules();
        this.updateFieldVisibilityDOM();
        this.updatePrice();
      });
    }

    // 4. Internal Quantity Button Listeners
    if (this.qtyInput && this.btnQtyDec && this.btnQtyInc) {
      this.btnQtyDec.addEventListener('click', () => {
        let val = parseInt(this.qtyInput.value, 10) || 1;
        if (val > 1) this.qtyInput.value = val - 1;
      });
      this.btnQtyInc.addEventListener('click', () => {
        let val = parseInt(this.qtyInput.value, 10) || 1;
        this.qtyInput.value = val + 1;
      });
    }

    // 5. Action Button Listeners
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.goToStep(this.currentStepIndex - 1));
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.handleNextStep());
    }

    // 6. Initial Rule Evaluation & Initial Rendering
    this.evaluateConfiguratorRules();
    this.renderNav();
    this.renderCurrentStep();
    this.updatePrice();
  }

  findFieldHandle(ref) {
    if (!ref) return '';
    if (typeof ref === 'object') {
      ref = ref.handleField || ref.label || ref.value || JSON.stringify(ref);
    }
    const str = String(ref).trim().toLowerCase();

    for (const step of this.steps) {
      if (step.fields) {
        for (const field of step.fields) {
          const fHandle = String(field.handleField || '').trim().toLowerCase();
          const fLabel = String(field.label || '').trim().toLowerCase();
          if (str === fHandle || str === fLabel) {
            return field.handleField;
          }
        }
      }
    }
    return String(ref).trim();
  }

  evaluateConfiguratorRules() {
    if (!this.data.rules || !this.data.rules.length) return;

    // Reset default visibility for fields
    this.steps.forEach(step => {
      if (step.fields) {
        step.fields.forEach(field => {
          this.visibility[field.handleField] = true;
          this.enabled[field.handleField] = true;
        });
      }
    });

    this.data.rules.forEach(rule => {
      const condFieldHandle = this.findFieldHandle(rule.condition_field);
      const targetFieldHandle = this.findFieldHandle(rule.target_field);

      const operator = String(rule.operatorRule || 'equals').trim().toLowerCase();
      const expectedValue = String(rule.condition_value || '').trim().toLowerCase();
      const action = String(rule.actionRule || 'show').trim().toLowerCase();

      // Read current selected value & label for condition field
      const currentSel = this.selections[condFieldHandle];
      const actualVal = currentSel ? String(currentSel.value || '').trim().toLowerCase() : '';
      const actualLabel = currentSel ? String(currentSel.label || '').trim().toLowerCase() : '';

      let isMatch = false;
      if (operator === 'equals') {
        isMatch = (actualVal === expectedValue) || (actualLabel === expectedValue);
      } else if (operator === 'not_equals') {
        isMatch = actualVal !== '' && actualVal !== expectedValue && actualLabel !== expectedValue;
      } else if (operator === 'contains') {
        isMatch = actualVal.includes(expectedValue) || actualLabel.includes(expectedValue);
      }

      if (CONFIGURATOR_DEBUG) {
        console.log(`[Configurator Rule] "${rule.name}" | ConditionField: "${rule.condition_field}" -> Resolved: "${condFieldHandle}" (${operator}) "${expectedValue}" | Actual: "${actualVal}" | Match: ${isMatch} | Action: ${action} -> Target: "${targetFieldHandle}"`);
      }

      if (action === 'show') {
        this.visibility[targetFieldHandle] = isMatch;
      } else if (action === 'hide') {
        this.visibility[targetFieldHandle] = !isMatch;
      } else if (action === 'enable') {
        this.enabled[targetFieldHandle] = isMatch;
      } else if (action === 'disable') {
        this.enabled[targetFieldHandle] = !isMatch;
      }
    });

    // RESET STALE VALUES & PRICE ADJUSTMENTS for fields that became hidden
    Object.keys(this.visibility).forEach(handleField => {
      if (this.visibility[handleField] === false) {
        if (this.selections[handleField]) {
          if (CONFIGURATOR_DEBUG) {
            console.log(`[Configurator Stale Reset] Clearing hidden field selection: ${handleField}`);
          }
          delete this.selections[handleField];
        }
      }
    });
  }

  updateFieldVisibilityDOM() {
    const activeEl = document.activeElement;

    Object.keys(this.visibility).forEach(handleField => {
      const group = document.getElementById(`field-group-${handleField}`);
      if (group) {
        const isVisible = this.visibility[handleField] !== false;
        const isEnabled = this.enabled[handleField] !== false;

        group.classList.toggle('is-hidden', !isVisible);

        // Update disabled state without touching active focused input element
        group.querySelectorAll('input, select, button').forEach(el => {
          if (el === activeEl || el.classList.contains('btn-edit-step')) return;
          const newDisabled = !isEnabled || !isVisible;
          if (el.disabled !== newDisabled) {
            el.disabled = newDisabled;
          }
        });

        // Update radio card selected classes
        const currentSel = this.selections[handleField];
        group.querySelectorAll('.configurator-radio-card').forEach(card => {
          const radio = card.querySelector('input[type="radio"]');
          if (radio) {
            const isChecked = currentSel && String(currentSel.value) === String(radio.value);
            if (radio !== activeEl && radio.checked !== isChecked) {
              radio.checked = isChecked;
            }
            card.classList.toggle('is-selected', isChecked);
            card.classList.toggle('is-disabled', !isEnabled || !isVisible);
          }
        });
      }
    });
  }

  renderNav() {
    if (!this.navContainer) return;
    this.navContainer.innerHTML = '';

    this.steps.forEach((step, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `configurator-step-tab ${idx === this.currentStepIndex ? 'is-active' : ''} ${idx < this.currentStepIndex ? 'is-completed' : ''}`;
      btn.innerHTML = `<span class="step-num">${idx < this.currentStepIndex ? '✓' : idx + 1}</span><span>${this.escapeHtml(step.title)}</span>`;
      btn.addEventListener('click', () => {
        if (idx <= this.currentStepIndex) {
          this.goToStep(idx);
        }
      });
      this.navContainer.appendChild(btn);
    });
  }

  renderCompletedSummaries() {
    if (!this.summariesContainer) return;
    this.summariesContainer.innerHTML = '';

    for (let i = 0; i < this.currentStepIndex; i++) {
      const step = this.steps[i];
      const summaryCard = document.createElement('div');
      summaryCard.className = 'completed-step-card';

      let selectedSummaryText = [];
      if (step.fields) {
        step.fields.forEach(field => {
          if (this.visibility[field.handleField] !== false && this.selections[field.handleField]) {
            const sel = this.selections[field.handleField];
            let summaryVal = sel.label || sel.value;
            if (sel.price_adjustment && sel.price_adjustment > 0) {
              summaryVal += ` (+${this.formatMoney(sel.price_adjustment)})`;
            }
            selectedSummaryText.push(`${field.label}: ${summaryVal}`);
          }
        });
      }

      summaryCard.innerHTML = `
        <div class="completed-step-info">
          <span class="completed-step-title">✓ Step ${i + 1}: ${this.escapeHtml(step.title)}</span>
          <span class="completed-step-values">${this.escapeHtml(selectedSummaryText.join(' · ') || 'Completed')}</span>
        </div>
        <button type="button" class="btn-edit-step" data-step="${i}">Edit</button>
      `;

      summaryCard.querySelector('.btn-edit-step').addEventListener('click', () => this.goToStep(i));
      this.summariesContainer.appendChild(summaryCard);
    }
  }

  renderCurrentStep() {
    if (!this.activeStepContainer) return;
    this.activeStepContainer.innerHTML = '';

    this.renderCompletedSummaries();
    this.renderNav();

    const currentStep = this.steps[this.currentStepIndex];
    if (!currentStep) return;

    // Step Header inside active fields box
    const stepHeader = document.createElement('div');
    stepHeader.className = 'active-step-header';
    stepHeader.innerHTML = `
      <h3 style="font-size:1.25rem; font-weight:800; margin-bottom:0.35rem;">Step ${this.currentStepIndex + 1}: ${this.escapeHtml(currentStep.title)}</h3>
      ${currentStep.description ? `<p style="font-size:0.875rem; color:#6b7280; margin-bottom:1.25rem;">${this.escapeHtml(currentStep.description)}</p>` : ''}
    `;
    this.activeStepContainer.appendChild(stepHeader);

    // Render Fields
    if (currentStep.fields) {
      currentStep.fields.forEach(field => {
        const isVisible = this.visibility[field.handleField] !== false;
        const isEnabled = this.enabled[field.handleField] !== false;
        const fieldGroup = document.createElement('div');
        fieldGroup.className = `configurator-field-group ${!isVisible ? 'is-hidden' : ''}`;
        fieldGroup.id = `field-group-${field.handleField}`;

        const isRequired = field.requiredField === true || field.requiredField === 'true';

        let labelHtml = `
          <label class="configurator-field-label">
            ${this.escapeHtml(field.label)}
            ${isRequired ? '<span class="required-asterisk">*</span>' : ''}
          </label>
          ${field.description ? `<p class="configurator-field-desc">${this.escapeHtml(field.description)}</p>` : ''}
        `;

        if (field.field_type === 'radio') {
          let radioCardsHtml = '<div class="configurator-radio-grid">';
          if (field.options) {
            field.options.forEach(opt => {
              const currentSel = this.selections[field.handleField];
              const isChecked = currentSel && currentSel.value === opt.value;
              
              radioCardsHtml += `
                <label class="configurator-radio-card ${isChecked ? 'is-selected' : ''} ${!isEnabled ? 'is-disabled' : ''}">
                  <input type="radio" name="config_${field.handleField}" value="${this.escapeHtml(opt.value)}" ${isChecked ? 'checked' : ''} ${!isEnabled ? 'disabled' : ''}>
                  <span class="radio-option-title">${this.escapeHtml(opt.label)}</span>
                  ${opt.description ? `<span class="radio-option-desc">${this.escapeHtml(opt.description)}</span>` : ''}
                  ${opt.price_adjustment ? `<span class="radio-option-price">+${this.formatMoney(opt.price_adjustment)}</span>` : ''}
                </label>
              `;
            });
          }
          radioCardsHtml += '</div>';
          fieldGroup.innerHTML = labelHtml + radioCardsHtml;

          // Event listeners for radio inputs
          fieldGroup.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
              const opt = field.options.find(o => String(o.value) === String(radio.value));
              if (opt) {
                this.selections[field.handleField] = {
                  value: opt.value,
                  label: opt.label,
                  price_adjustment: parseInt(opt.price_adjustment || 0, 10),
                  fieldLabel: field.label
                };
              }
              this.onFieldChange();
            });
          });

        } else if (field.field_type === 'select') {
          let selectHtml = `<select class="configurator-select" name="config_${field.handleField}" ${!isEnabled ? 'disabled' : ''}>`;
          selectHtml += `<option value="">-- Select ${this.escapeHtml(field.label)} --</option>`;
          if (field.options) {
            field.options.forEach(opt => {
              const currentSel = this.selections[field.handleField];
              const isSelected = currentSel && String(currentSel.value) === String(opt.value);
              const priceText = opt.price_adjustment ? ` (+${this.formatMoney(opt.price_adjustment)})` : '';
              selectHtml += `<option value="${this.escapeHtml(opt.value)}" ${isSelected ? 'selected' : ''}>${this.escapeHtml(opt.label)}${priceText}</option>`;
            });
          }
          selectHtml += `</select>`;
          fieldGroup.innerHTML = labelHtml + selectHtml;

          const selectEl = fieldGroup.querySelector('select');
          selectEl.addEventListener('change', () => {
            const opt = field.options.find(o => String(o.value) === String(selectEl.value));
            if (opt) {
              this.selections[field.handleField] = {
                value: opt.value,
                label: opt.label,
                price_adjustment: parseInt(opt.price_adjustment || 0, 10),
                fieldLabel: field.label
              };
            } else {
              delete this.selections[field.handleField];
            }
            this.onFieldChange();
          });

        } else if (field.field_type === 'text') {
          const currentSel = this.selections[field.handleField];
          const textVal = currentSel ? currentSel.value : '';
          const textHtml = `<input type="text" class="configurator-text-input" name="config_${field.handleField}" value="${this.escapeHtml(textVal)}" placeholder="${this.escapeHtml(field.placeholder || '')}" ${!isEnabled ? 'disabled' : ''}>`;
          fieldGroup.innerHTML = labelHtml + textHtml;

          const inputEl = fieldGroup.querySelector('input');
          inputEl.addEventListener('input', () => {
            const val = inputEl.value;
            if (val !== '') {
              this.selections[field.handleField] = {
                value: val,
                label: val,
                price_adjustment: 0,
                fieldLabel: field.label
              };
            } else {
              delete this.selections[field.handleField];
            }
            this.evaluateConfiguratorRules();
            this.updateFieldVisibilityDOM();
            this.updatePrice();
          });

          inputEl.addEventListener('change', () => {
            this.onFieldChange();
          });

        } else if (field.field_type === 'message') {
          fieldGroup.innerHTML = `<div class="configurator-message-block"><strong>${this.escapeHtml(field.label)}</strong><p>${this.escapeHtml(field.description || '')}</p></div>`;
        }

        this.activeStepContainer.appendChild(fieldGroup);
      });
    }

    // Update Back & Continue / Add to Cart Button Text
    if (this.prevBtn) {
      this.prevBtn.style.display = this.currentStepIndex > 0 ? 'inline-flex' : 'none';
    }

    if (this.nextBtn) {
      if (this.currentStepIndex === this.steps.length - 1) {
        this.nextBtn.textContent = 'Add Configured Item to Cart';
        this.nextBtn.className = 'btn btn-primary btn-add-to-cart';
      } else {
        this.nextBtn.textContent = 'Continue';
        this.nextBtn.className = 'btn btn-primary';
      }
    }

    this.updateFieldVisibilityDOM();
  }

  onFieldChange() {
    this.evaluateConfiguratorRules();
    this.updateFieldVisibilityDOM();
    this.updatePrice();
  }

  validateStep(stepIndex) {
    const step = this.steps[stepIndex];
    if (!step || !step.fields) return true;

    let isValid = true;

    step.fields.forEach(field => {
      const isVisible = this.visibility[field.handleField] !== false;
      const isRequired = field.requiredField === true || field.requiredField === 'true';

      const group = document.getElementById(`field-group-${field.handleField}`);
      if (group) {
        group.classList.remove('has-error');
        const oldErr = group.querySelector('.field-error-message');
        if (oldErr) oldErr.remove();
      }

      if (isVisible && isRequired) {
        const sel = this.selections[field.handleField];
        if (!sel || !sel.value || !String(sel.value).trim()) {
          isValid = false;
          if (group) {
            group.classList.add('has-error');
            const errEl = document.createElement('div');
            errEl.className = 'field-error-message';
            errEl.textContent = `Please select or enter ${field.label}`;
            group.appendChild(errEl);
          }
        }
      }
    });

    return isValid;
  }

  handleNextStep() {
    this.evaluateConfiguratorRules();

    if (!this.validateStep(this.currentStepIndex)) {
      return;
    }

    if (this.currentStepIndex < this.steps.length - 1) {
      this.goToStep(this.currentStepIndex + 1);
    } else {
      // Final Step Add to Cart
      this.submitConfiguredItemToCart();
    }
  }

  goToStep(index) {
    if (index >= 0 && index < this.steps.length) {
      this.currentStepIndex = index;
      this.renderCurrentStep();
      window.scrollTo({ top: this.container.offsetTop - 80, behavior: 'smooth' });
    }
  }

  updatePrice() {
    let basePriceCents = 0;

    // Read current selected Shopify variant price
    if (this.variantSelect) {
      const opt = this.variantSelect.options[this.variantSelect.selectedIndex];
      if (opt && opt.dataset.price) {
        const cleanPrice = opt.dataset.price.replace(/[^0-9]/g, '');
        basePriceCents = parseInt(cleanPrice, 10) || 0;
      }
    }

    // Add active, visible option price adjustments
    let addersCents = 0;
    Object.keys(this.selections).forEach(handleField => {
      if (this.visibility[handleField] !== false) {
        addersCents += (this.selections[handleField].price_adjustment || 0);
      }
    });

    const totalCents = basePriceCents + addersCents;

    // 1. Update Configurator Total at bottom
    if (this.liveTotalEl) {
      this.liveTotalEl.textContent = this.formatMoney(totalCents);
    }

    // 2. Update Main PDP Price at top of product details
    if (this.mainPriceEl) {
      this.mainPriceEl.textContent = this.formatMoney(totalCents);
    }
  }

  async submitConfiguredItemToCart() {
    this.evaluateConfiguratorRules();

    if (!this.validateStep(this.currentStepIndex)) {
      return;
    }

    // 1. Get Selected Shopify Variant ID
    let selectedVariantId = null;
    if (this.variantSelect) {
      selectedVariantId = this.variantSelect.value;
    } else {
      const hiddenVarInput = document.querySelector('input[name="id"]');
      if (hiddenVarInput) selectedVariantId = hiddenVarInput.value;
    }

    if (!selectedVariantId) {
      alert('Please select a valid product variant.');
      return;
    }

    // 2. Calculate Total Configured Unit Price
    let basePriceCents = 0;
    if (this.variantSelect) {
      const opt = this.variantSelect.options[this.variantSelect.selectedIndex];
      if (opt && opt.dataset.price) {
        const cleanPrice = opt.dataset.price.replace(/[^0-9]/g, '');
        basePriceCents = parseInt(cleanPrice, 10) || 0;
      }
    }
    let addersCents = 0;
    Object.keys(this.selections).forEach(handleField => {
      if (this.visibility[handleField] !== false) {
        addersCents += (this.selections[handleField].price_adjustment || 0);
      }
    });

    const totalCents = basePriceCents + addersCents;
    const formattedConfiguredPrice = this.formatMoney(totalCents);

    // 3. Build Line Item Properties from Active Visible Selections
    // Private property starting with _ for internal total calculation
    const properties = {
      '_configured_price': formattedConfiguredPrice
    };

    // Public properties displayed to customer
    Object.keys(this.selections).forEach(handleField => {
      if (this.visibility[handleField] !== false) {
        const sel = this.selections[handleField];
        if (sel && sel.value) {
          const key = sel.fieldLabel || handleField;
          let val = sel.label || sel.value;
          if (sel.price_adjustment && sel.price_adjustment > 0) {
            val += ` (+${this.formatMoney(sel.price_adjustment)})`;
          }
          properties[key] = val;
        }
      }
    });

    const quantityVal = this.qtyInput ? (parseInt(this.qtyInput.value, 10) || 1) : 1;

    if (CONFIGURATOR_DEBUG) {
      console.log('[Configurator Submit] Submitting Item to Ajax Cart:', {
        id: selectedVariantId,
        quantity: quantityVal,
        properties: properties
      });
    }

    if (this.nextBtn) {
      this.nextBtn.disabled = true;
      this.nextBtn.textContent = 'Adding to Cart...';
    }

    try {
      const payload = {
        items: [
          {
            id: parseInt(selectedVariantId, 10),
            quantity: quantityVal,
            properties: properties
          }
        ]
      };

      const response = await fetch(`${window.Shopify ? window.Shopify.routes.root : '/'}cart/add.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        if (window.cartDrawer) {
          await window.cartDrawer.refreshCart();
          window.cartDrawer.open();
        } else {
          window.location.href = '/cart';
        }
      } else {
        const err = await response.json();
        alert(err.description || 'Could not add product to cart.');
      }
    } catch (err) {
      console.error('[Configurator Error] Failed submitting to cart:', err);
    } finally {
      if (this.nextBtn) {
        this.nextBtn.disabled = false;
        this.nextBtn.textContent = 'Add Configured Item to Cart';
      }
    }
  }

  formatMoney(cents) {
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(cents);
    }
    const dollars = (cents / 100).toFixed(2);
    return `$${dollars}`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.productConfigurator = new ProductConfiguratorEngine();
});
