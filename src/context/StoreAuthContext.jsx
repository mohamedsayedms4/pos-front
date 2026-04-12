import React, { createContext, useContext, useState, useEffect } from 'react';
import StoreApi from '../services/storeApi';

const StoreAuthContext = createContext();

export const useStoreAuth = () => {
  const context = useContext(StoreAuthContext);
  if (!context) throw new Error('useStoreAuth must be used within StoreAuthProvider');
  return context;
};

export const StoreAuthProvider = ({ children }) => {
  const [storeCustomer, setStoreCustomer] = useState(null);
  const [isStoreAuthLoading, setIsStoreAuthLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('store_access_token');
    if (token) {
      fetchProfile();
    } else {
      setIsStoreAuthLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await StoreApi.getProfile();
      setStoreCustomer(res.data);
    } catch (e) {
      console.error('Failed to load store profile:', e);
      localStorage.removeItem('store_access_token');
      localStorage.removeItem('store_refresh_token');
      setStoreCustomer(null);
    } finally {
      setIsStoreAuthLoading(false);
    }
  };

  const storeLogin = async (phone, password) => {
    const res = await StoreApi.storeLogin(phone, password);
    localStorage.setItem('store_access_token', res.data.accessToken);
    localStorage.setItem('store_refresh_token', res.data.refreshToken);
    setStoreCustomer(res.data.customer);
    return res;
  };

  const storeRegister = async (data) => {
    const res = await StoreApi.storeRegister(data);
    localStorage.setItem('store_access_token', res.data.accessToken);
    localStorage.setItem('store_refresh_token', res.data.refreshToken);
    setStoreCustomer(res.data.customer);
    return res;
  };

  const storeLogout = () => {
    localStorage.removeItem('store_access_token');
    localStorage.removeItem('store_refresh_token');
    setStoreCustomer(null);
  };

  const value = {
    storeCustomer,
    isStoreAuthLoading,
    storeLogin,
    storeRegister,
    storeLogout,
    fetchProfile
  };

  return <StoreAuthContext.Provider value={value}>{children}</StoreAuthContext.Provider>;
};
