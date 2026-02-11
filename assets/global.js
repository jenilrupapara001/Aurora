/**
 * AURORA FASHION OS 2.0 - Core JavaScript
 * Global utilities and cart management
 */

class AuroraTheme {
  constructor() {
    this.init();
  }

  init() {
    this.setupLazyLoading();
    this.setupCart();
    this.setupQuickView();
  }

  // Lazy loading with Intersection Observer
  setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            if (img.dataset.srcset) {
              img.srcset = img.dataset.srcset;
              img.removeAttribute('data-srcset');
            }
            observer.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  // Cart management
  setupCart() {
    this.cart = {
      items: [],
      total: 0,
      count: 0
    };

    // Fetch cart on load
    this.fetchCart();
  }

  async fetchCart() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      this.cart = {
        items: cart.items,
        total: cart.total_price,
        count: cart.item_count
      };
      this.updateCartUI();
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }

  async addToCart(variantId, quantity = 1) {
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            id: variantId,
            quantity: quantity
          }]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }

      await this.fetchCart();
      this.openCart();
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Sorry, there was an error adding this item to your cart.');
      return false;
    }
  }

  async updateCartItem(lineIndex, quantity) {
    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line: lineIndex,
          quantity: quantity
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update cart');
      }

      await this.fetchCart();
      return true;
    } catch (error) {
      console.error('Error updating cart:', error);
      return false;
    }
  }

  updateCartUI() {
    // Update cart count badges
    const cartCountElements = document.querySelectorAll('[data-cart-count]');
    cartCountElements.forEach(el => {
      el.textContent = this.cart.count;
    });

    // Dispatch custom event for other components
    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: this.cart
    }));
  }

  openCart() {
    const cartDrawer = document.querySelector('.cart-drawer');
    const cartOverlay = document.querySelector('.cart-drawer__overlay');
    
    if (cartDrawer) {
      cartDrawer.classList.add('active');
      cartOverlay?.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeCart() {
    const cartDrawer = document.querySelector('.cart-drawer');
    const cartOverlay = document.querySelector('.cart-drawer__overlay');
    
    if (cartDrawer) {
      cartDrawer.classList.remove('active');
      cartOverlay?.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Quick view functionality
  setupQuickView() {
    document.addEventListener('click', (e) => {
      const quickViewBtn = e.target.closest('[data-quick-view]');
      if (quickViewBtn) {
        e.preventDefault();
        const productHandle = quickViewBtn.dataset.quickView;
        this.openQuickView(productHandle);
      }
    });
  }

  async openQuickView(productHandle) {
    try {
      const response = await fetch(`/products/${productHandle}?view=quick`);
      const html = await response.text();
      
      // Create modal
      const modal = document.createElement('div');
      modal.className = 'quick-view-modal';
      modal.innerHTML = html;
      document.body.appendChild(modal);
      
      // Add close functionality
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('[data-close-modal]')) {
          modal.remove();
        }
      });
    } catch (error) {
      console.error('Error loading quick view:', error);
    }
  }
}

// Utility functions
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const formatMoney = (cents, format = '${{amount}}') => {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }
  let value = '';
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  const formatString = format;

  function formatWithDelimiters(number, precision, thousands, decimal) {
    thousands = thousands || ',';
    decimal = decimal || '.';

    if (isNaN(number) || number === null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    const parts = number.split('.');
    const dollarsAmount = parts[0].replace(
      /(\d)(?=(\d\d\d)+(?!\d))/g,
      '$1' + thousands
    );
    const centsAmount = parts[1] ? decimal + parts[1] : '';

    return dollarsAmount + centsAmount;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
    case 'amount_no_decimals_with_space_separator':
      value = formatWithDelimiters(cents, 0, ' ');
      break;
    case 'amount_with_apostrophe_separator':
      value = formatWithDelimiters(cents, 2, "'");
      break;
  }

  return formatString.replace(placeholderRegex, value);
};

// Initialize theme
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.aurora = new AuroraTheme();
  });
} else {
  window.aurora = new AuroraTheme();
}

// Export utilities
window.auroraUtils = {
  debounce,
  formatMoney
};
