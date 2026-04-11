import React, { createContext, useContext, useState, useEffect } from 'react';
import StoreApi from '../services/storeApi';

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
  
  const [toast, setToast] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
   const [storeInfo, setStoreInfo] = useState(null);
   const [categories, setCategories] = useState([]);

   useEffect(() => {
     StoreApi.getStoreInfoPublic().then(res => {
         if (res.success) setStoreInfo(res.data);
     }).catch(() => {});

     StoreApi.getCategories().then(res => {
         if (res.success) setCategories(res.data);
     }).catch(() => {});
   }, []);

  useEffect(() => {
    localStorage.setItem('ec_cart', JSON.stringify(cart));
  }, [cart]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + quantity } : i);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: Number(product.salePrice),
        qty: quantity,
        image: product.imageUrls && product.imageUrls.length > 0 ? StoreApi.getImageUrl(product.imageUrls[0]) : null
      }];
    });
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
     categories
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};
