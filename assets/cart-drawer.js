/**
 * Modern Shopify Ajax Cart Drawer Script
 */

class CartDrawer {
  constructor() {
    this.container = document.getElementById('CartDrawerContainer');
    this.drawer = document.getElementById('CartDrawer');
    this.overlay = document.getElementById('CartDrawerOverlay');
    this.closeBtn = document.getElementById('CartDrawerClose');
    
    this.init();
  }

  init() {
    if (!this.container) return;

    // Global toggle listeners
    document.querySelectorAll('[data-cart-drawer-toggle]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    });

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    // Delegated events for quantity changes and item removals
    this.container.addEventListener('click', (e) => {
      const qtyBtn = e.target.closest('.js-cart-qty-btn');
      if (qtyBtn) {
        const action = qtyBtn.dataset.action;
        const key = qtyBtn.dataset.key;
        let currentQty = parseInt(qtyBtn.dataset.qty, 10);
        let newQty = action === 'increase' ? currentQty + 1 : currentQty - 1;
        this.updateQuantity(key, newQty);
        return;
      }

      const removeBtn = e.target.closest('.js-cart-remove');
      if (removeBtn) {
        const key = removeBtn.dataset.key;
        this.updateQuantity(key, 0);
        return;
      }
    });

    // Change event for direct quantity input typing
    this.container.addEventListener('change', (e) => {
      const qtyInput = e.target.closest('.js-cart-qty-input');
      if (qtyInput) {
        const key = qtyInput.dataset.key;
        const newQty = parseInt(qtyInput.value, 10);
        if (!isNaN(newQty)) {
          this.updateQuantity(key, newQty);
        }
      }
    });

    // Intercept form submissions for Add to Cart forms
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('form[action*="/cart/add"]');
      if (form) {
        e.preventDefault();
        this.addToCart(form);
      }
    });
  }

  isOpen() {
    return this.container.getAttribute('data-open') === 'true';
  }

  open() {
    this.container.setAttribute('data-open', 'true');
    document.body.setAttribute('data-cart-open', 'true');
  }

  close() {
    this.container.setAttribute('data-open', 'false');
    document.body.removeAttribute('data-cart-open');
  }

  async addToCart(form) {
    const submitBtn = form.querySelector('[type="submit"]');
    const originalText = submitBtn ? submitBtn.value || submitBtn.innerText : '';
    
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
        await this.refreshCart();
        this.open();
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
      const response = await fetch(`${window.Shopify ? window.Shopify.routes.root : '/'}cart/change.js`, {
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
      // Re-fetch page content to extract rendered cart-drawer HTML
      const response = await fetch(window.location.pathname + '?sections=header');
      const cartResponse = await fetch(`${window.Shopify ? window.Shopify.routes.root : '/'}cart.js`);
      const cartData = await cartResponse.json();

      // Update header badges
      document.querySelectorAll('.cart-count-badge, [data-cart-count]').forEach(badge => {
        badge.textContent = cartData.item_count;
        if (cartData.item_count > 0) {
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      });

      const drawerCount = document.getElementById('CartDrawerCount');
      if (drawerCount) {
        drawerCount.textContent = `(${cartData.item_count})`;
      }

      // Re-fetch current window HTML to update drawer markup
      const htmlResponse = await fetch(window.location.href);
      const htmlText = await htmlResponse.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      const newDrawerBody = doc.getElementById('CartDrawerBody');
      const newDrawerFooter = doc.getElementById('CartDrawerFooter');
      const newShippingBar = doc.getElementById('CartShippingBar');

      const currentDrawerBody = document.getElementById('CartDrawerBody');
      const currentDrawerFooter = document.getElementById('CartDrawerFooter');
      const currentShippingBar = document.getElementById('CartShippingBar');

      if (newDrawerBody && currentDrawerBody) {
        currentDrawerBody.innerHTML = newDrawerBody.innerHTML;
      }

      if (currentShippingBar && newShippingBar) {
        currentShippingBar.innerHTML = newShippingBar.innerHTML;
      }

      if (newDrawerFooter && currentDrawerFooter) {
        currentDrawerFooter.innerHTML = newDrawerFooter.innerHTML;
      } else if (newDrawerFooter && !currentDrawerFooter) {
        this.drawer.appendChild(newDrawerFooter.cloneNode(true));
      } else if (!newDrawerFooter && currentDrawerFooter) {
        currentDrawerFooter.remove();
      }

    } catch (err) {
      console.error('Error refreshing cart:', err);
      // Fallback: reload page if DOM update fails
      window.location.reload();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.cartDrawer = new CartDrawer();
});
