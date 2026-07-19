import React, { createContext, useContext, useState, useEffect } from 'react';
import StoreApi from '../services/storeApi';
import * as fbPixel from '../services/fbPixel';

const StoreContext = createContext();

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};

/**
 * Compute a tenant-scoped localStorage key so that different stores
 * (different tenants) do NOT share the same cart/wishlist data.
 */
const getTenantKey = (base) => {
  const tenantId = sessionStorage.getItem('public_tenant_id') || 'default';
  return `${base}_${tenantId}`;
};

export const StoreProvider = ({ children }) => {
  // ── Cart: scoped per tenant ──────────────────────────────────────────────
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(getTenantKey('ec_cart'));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // ── Wishlist: scoped per tenant ──────────────────────────────────────────
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem(getTenantKey('ec_wishlist'));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [toast, setToast] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [storeInfoError, setStoreInfoError] = useState(false);

  /**
   * categories is fetched ONCE here and shared across all store pages.
   * EcommerceStore and StoreLayout consume this from context
   * instead of making their own redundant API calls.
   */
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  useEffect(() => {
    // Fetch store info and categories once when the provider mounts
    StoreApi.getStoreInfoPublic()
      .then(res => {
        if (res && res.success) setStoreInfo(res.data);
        else if (res && res.data) setStoreInfo(res.data);
      })
      .catch(() => setStoreInfoError(true));

    StoreApi.getCategories()
      .then(res => {
        if (Array.isArray(res)) {
          setCategories(res);
        } else if (res && res.success && Array.isArray(res.data)) {
          setCategories(res.data);
        } else if (res && Array.isArray(res.data)) {
          setCategories(res.data);
        }
        setCategoriesLoaded(true);
      })
      .catch(() => setCategoriesLoaded(true));
  }, []);

  // Persist cart to tenant-scoped key
  useEffect(() => {
    localStorage.setItem(getTenantKey('ec_cart'), JSON.stringify(cart));
  }, [cart]);

  // Persist wishlist to tenant-scoped key
  useEffect(() => {
    localStorage.setItem(getTenantKey('ec_wishlist'), JSON.stringify(wishlist));
  }, [wishlist]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      const resolvedImage = (product.imageUrls && product.imageUrls.length > 0)
        ? StoreApi.getImageUrl(product.imageUrls[0])
        : (product.image ? StoreApi.getImageUrl(product.image)
        : (product.imageUrl ? StoreApi.getImageUrl(product.imageUrl) : null));

      if (existing) {
        return prev.map(i => i.id === product.id ? {
          ...i,
          qty: i.qty + quantity,
          price: product.appliedOfferId ? Number(product.salePrice) : i.price,
          appliedOfferId: product.appliedOfferId || i.appliedOfferId,
          image: i.image || resolvedImage
        } : i);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: Number(product.salePrice),
        qty: quantity,
        image: resolvedImage,
        appliedOfferId: product.appliedOfferId
      }];
    });
    StoreApi.trackInteraction(product.id, 'CART');
    fbPixel.trackAddToCart(product);
    showToast(`تمت إضافة ${product.name} للسلة `);
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) return removeFromCart(id);
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);

  const toggleWishlist = (productId) => {
    setWishlist(prev => {
      const isFav = prev.includes(productId);
      if (isFav) {
        showToast("تمت الإزالة من المفضلة ");
        return prev.filter(id => id !== productId);
      } else {
        StoreApi.trackInteraction(productId, 'FAVORITE');
        fbPixel.trackAddToWishlist({ id: productId });
        showToast("تمت الإضافة للمفضلة ️");
        return [...prev, productId];
      }
    });
  };

  const isWishlisted = (productId) => wishlist.includes(productId);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const value = {
    cart,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    cartCount,
    cartTotal,
    cartOpen,
    setCartOpen,
    checkoutOpen,
    setCheckoutOpen,
    toast,
    showToast,
    storeInfo,
    storeInfoError,
    categories,
    categoriesLoaded,
    wishlist,
    toggleWishlist,
    isWishlisted
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};
