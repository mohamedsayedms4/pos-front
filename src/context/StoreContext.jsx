import React, { createContext, useContext, useState, useEffect } from 'react';
import StoreApi from '../services/storeApi';
import * as fbPixel from '../services/fbPixel';

const StoreContext = createContext();

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};

export const StoreProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('ec_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem('ec_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  const [toast, setToast] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    StoreApi.getStoreInfoPublic().then(res => {
      if (res.success) setStoreInfo(res.data);
    }).catch(() => { });

    StoreApi.getCategories().then(res => {
      if (res.success) setCategories(res.data);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    localStorage.setItem('ec_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('ec_wishlist', JSON.stringify(wishlist));
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
        : (product.image ? StoreApi.getImageUrl(product.image) : (product.imageUrl ? StoreApi.getImageUrl(product.imageUrl) : null));

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
    showToast(`تمت إضافة ${product.name} للسلة ✅`);
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
        showToast("تمت الإزالة من المفضلة 🤍");
        return prev.filter(id => id !== productId);
      } else {
        StoreApi.trackInteraction(productId, 'FAVORITE');
        fbPixel.trackAddToWishlist({ id: productId });
        showToast("تمت الإضافة للمفضلة ❤️");
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
    categories,
    wishlist,
    toggleWishlist,
    isWishlisted
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};
