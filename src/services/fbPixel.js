/**
 * Facebook Pixel Utility — Centralized tracking service for the e-commerce store.
 * Uses the native fbq() API directly (no external library needed).
 *
 * The Pixel ID is stored in StoreInfo (DB) and configured by the admin from Settings.
 *
 * Usage:
 *   import * as fbPixel from './fbPixel';
 *   fbPixel.initPixel(storeInfo.facebookPixelId);
 *   fbPixel.trackPageView();
 *   fbPixel.trackAddToCart(product);
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Guard: only call fbq if the script is loaded. */
const fbq = (...args) => {
  if (typeof window.fbq === 'function') {
    window.fbq(...args);
  }
};

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Initializes the Facebook Pixel and loads the fbevents.js script.
 * @param {string} pixelId - The Pixel ID from StoreInfo (saved in DB via Settings page).
 * Should be called once when storeInfo is loaded, passing storeInfo.facebookPixelId.
 */
export function initPixel(pixelId) {
  if (!pixelId || window._fbPixelInitialized) return;
  window._fbPixelInitialized = true;

  /* eslint-disable */
  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', pixelId);
}

// ─── Standard Events ──────────────────────────────────────────────────────────

/** Fires on every page navigation. */
export function trackPageView() {
  fbq('track', 'PageView');
}

/**
 * Fires when a customer views a product detail page.
 * @param {object} product - PublicProductDto
 */
export function trackViewContent(product) {
  if (!product) return;
  fbq('track', 'ViewContent', {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: 'product',
    value: Number(product.salePrice) || 0,
    currency: 'EGP',
  });
}

/**
 * Fires when a product is added to the cart.
 * @param {object} product - cart item or product object
 */
export function trackAddToCart(product) {
  if (!product) return;
  fbq('track', 'AddToCart', {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: 'product',
    value: Number(product.salePrice ?? product.price) || 0,
    currency: 'EGP',
  });
}

/**
 * Fires when a product is added to the wishlist.
 * @param {object|number} product - product object or just the product ID
 */
export function trackAddToWishlist(product) {
  if (!product) return;
  const id = typeof product === 'object' ? product.id : product;
  const name = typeof product === 'object' ? product.name : undefined;
  fbq('track', 'AddToWishlist', {
    content_ids: [String(id)],
    ...(name ? { content_name: name } : {}),
    content_type: 'product',
  });
}

/**
 * Fires when the checkout modal is opened.
 * @param {Array} cart - array of cart items
 * @param {number} total - cart total value
 */
export function trackInitiateCheckout(cart, total) {
  fbq('track', 'InitiateCheckout', {
    content_ids: cart.map(i => String(i.id)),
    num_items: cart.reduce((s, i) => s + i.qty, 0),
    value: Number(total) || 0,
    currency: 'EGP',
  });
}

/**
 * Fires when an order is successfully placed.
 * @param {object} orderData - the returned order object from placeOrder API
 * @param {number} total - order total value
 */
export function trackPurchase(orderData, total) {
  fbq('track', 'Purchase', {
    content_type: 'product',
    value: Number(total) || 0,
    currency: 'EGP',
    order_id: orderData?.orderNumber,
  });
}

/**
 * Fires when the customer performs a search.
 * @param {string} query - the search term
 */
export function trackSearch(query) {
  if (!query || query.trim().length < 2) return;
  fbq('track', 'Search', {
    search_string: query.trim(),
  });
}
