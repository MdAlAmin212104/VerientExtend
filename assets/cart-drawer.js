/**
 * Universal Shopify Ajax Cart Drawer Script
 * Fully compatible with Dawn and custom theme structures
 */

class CartDrawer {
  constructor() {
    this.getElements();
    this.init();
  }

  getElements() {
    this.container = document.getElementById('CartDrawerContainer') || document.querySelector('cart-drawer') || document.querySelector('.cart-drawer-container');
    this.drawer = document.getElementById('CartDrawer') || document.querySelector('.cart-drawer') || document.querySelector('.drawer__inner') || document.querySelector('.cart-drawer__inner');
    this.overlay = document.getElementById('CartDrawerOverlay') || document.getElementById('CartDrawer-Overlay') || document.querySelector('.cart-drawer__overlay');
  }

  init() {
    // Global toggle listeners for header cart button and trigger elements
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-cart-drawer-toggle], .header__cart-btn, .cart-count-badge');
      if (trigger && !e.target.closest('.cart-drawer, .cart-drawer-container, cart-drawer')) {
        e.preventDefault();
        this.open();
        return;
      }

      const closeTrigger = e.target.closest('#CartDrawerClose, .drawer__close, .cart-drawer__close, [data-cart-drawer-close]');
      if (closeTrigger) {
        e.preventDefault();
        this.close();
        return;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    // Delegate clicks inside cart drawer container
    document.addEventListener('click', (e) => {
      if (!this.container || !this.container.contains(e.target)) return;

      const qtyBtn = e.target.closest('.js-cart-qty-btn, .quantity__button');
      if (qtyBtn) {
        const input = qtyBtn.closest('.quantity-selector, .quantity, quantity-input')?.querySelector('input');
        if (input) {
          const action = qtyBtn.dataset.action || qtyBtn.name;
          const key = input.dataset.key || input.dataset.quantityLineKey;
          let currentQty = parseInt(input.value, 10) || 0;
          let newQty = (action === 'increase' || action === 'plus') ? currentQty + 1 : Math.max(0, currentQty - 1);
          if (key) this.updateQuantity(key, newQty);
        }
        return;
      }

      const removeBtn = e.target.closest('.js-cart-remove, cart-remove-button button, .cart-remove-button');
      if (removeBtn) {
        const key = removeBtn.dataset.key || removeBtn.closest('[data-quantity-line-key]')?.dataset.quantityLineKey || removeBtn.getAttribute('id')?.replace('CartDrawer-Remove-', '');
        const variantId = removeBtn.dataset.variantId;
        if (key) {
          this.updateQuantity(key, 0);
        } else if (variantId) {
          this.updateQuantity(variantId, 0);
        }
      }
    });

    // Direct quantity input change handler
    document.addEventListener('change', (e) => {
      if (!this.container || !this.container.contains(e.target)) return;
      const qtyInput = e.target.closest('.js-cart-qty-input, .quantity__input');
      if (qtyInput) {
        const key = qtyInput.dataset.key || qtyInput.dataset.quantityLineKey;
        const newQty = parseInt(qtyInput.value, 10);
        if (key && !isNaN(newQty)) {
          this.updateQuantity(key, newQty);
        }
      }
    });

    // Intercept standard product add-to-cart form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('form[action*="/cart/add"]');
      if (form && !form.closest('#ProductConfigurator')) {
        const cartType = (window.Shopify && window.Shopify.cartType) ? String(window.Shopify.cartType).toLowerCase() : 'drawer';
        if (cartType === 'drawer') {
          e.preventDefault();
          this.addToCart(form);
        }
      }
    });
  }

  isOpen() {
    this.getElements();
    if (!this.container) return false;
    return this.container.getAttribute('data-open') === 'true' || 
           this.container.classList.contains('active') || 
           this.container.classList.contains('is-active');
  }

  open() {
    this.getElements();
    if (!this.container) return;
    this.container.setAttribute('data-open', 'true');
    this.container.classList.add('active', 'is-active');
    if (this.drawer) this.drawer.classList.add('active', 'is-active');
    document.body.setAttribute('data-cart-open', 'true');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.getElements();
    if (!this.container) return;
    this.container.setAttribute('data-open', 'false');
    this.container.classList.remove('active', 'is-active');
    if (this.drawer) this.drawer.classList.remove('active', 'is-active');
    document.body.removeAttribute('data-cart-open');
    document.body.style.overflow = '';
  }

  async addToCart(form) {
    const submitBtn = form.querySelector('[type="submit"]');
    
    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('data-loading', 'true');
      }

      const formData = new FormData(form);

      const response = await fetch(`${window.Shopify ? window.Shopify.routes.root : '/'}cart/add.js`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
      });

      if (response.ok) {
        const cartType = (window.Shopify && window.Shopify.cartType) ? String(window.Shopify.cartType).toLowerCase() : 'drawer';
        if (cartType === 'page') {
          window.location.href = '/cart';
        } else {
          await this.refreshCart();
          this.open();
        }
      } else {
        const errorData = await response.json();
        alert(errorData.description || 'Could not add item to cart.');
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('data-loading');
      }
    }
  }

  async updateQuantity(key, quantity) {
    try {
      const rootUrl = window.Shopify ? window.Shopify.routes.root : '/';
      const response = await fetch(`${rootUrl}cart/change.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ id: key, quantity: quantity })
      });

      if (response.ok) {
        await this.refreshCart();
      }
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  }

  async refreshCart() {
    try {
      this.getElements();
      const rootUrl = window.Shopify ? window.Shopify.routes.root : '/';
      const timestamp = Date.now();
      const cartHtmlResponse = await fetch(`${rootUrl}cart?v=${timestamp}`);
      const cartResponse = await fetch(`${rootUrl}cart.js?v=${timestamp}`);
      const cartData = await cartResponse.json();

      // Update header cart counter badge
      document.querySelectorAll('.cart-count-badge, [data-cart-count], .cart-count').forEach(badge => {
        badge.textContent = cartData.item_count;
        badge.style.display = cartData.item_count > 0 ? 'inline-flex' : 'none';
      });

      const drawerCount = document.getElementById('CartDrawerCount');
      if (drawerCount) {
        drawerCount.textContent = `(${cartData.item_count})`;
      }

      if (cartHtmlResponse.ok) {
        const htmlText = await cartHtmlResponse.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const newDrawerContainer = doc.getElementById('CartDrawerContainer') || doc.querySelector('cart-drawer');
        const currentDrawerContainer = this.container;

        if (newDrawerContainer && currentDrawerContainer) {
          const newBody = newDrawerContainer.querySelector('#CartDrawerBody, #CartDrawer-CartItems, .drawer__contents, .cart-drawer__body');
          const currentBody = currentDrawerContainer.querySelector('#CartDrawerBody, #CartDrawer-CartItems, .drawer__contents, .cart-drawer__body');

          if (newBody && currentBody) {
            currentBody.innerHTML = newBody.innerHTML;
          }

          const newFooter = newDrawerContainer.querySelector('#CartDrawerFooter, .drawer__footer, .cart-drawer__footer');
          let currentFooter = currentDrawerContainer.querySelector('#CartDrawerFooter, .drawer__footer, .cart-drawer__footer');

          if (newFooter) {
            if (currentFooter) {
              currentFooter.innerHTML = newFooter.innerHTML;
              currentFooter.style.display = cartData.item_count > 0 ? 'block' : 'none';
            } else {
              const drawerInner = currentDrawerContainer.querySelector('#CartDrawer, .cart-drawer__inner, .drawer__inner') || currentDrawerContainer;
              drawerInner.appendChild(newFooter);
              newFooter.style.display = cartData.item_count > 0 ? 'block' : 'none';
            }
          } else if (currentFooter) {
            currentFooter.style.display = cartData.item_count > 0 ? 'block' : 'none';
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing cart:', err);
      window.location.reload();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.cartDrawer = new CartDrawer();
});
