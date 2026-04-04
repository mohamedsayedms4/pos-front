import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import Categories from './pages/Categories.jsx'
import Suppliers from './pages/Suppliers.jsx'
import Purchases from './pages/Purchases.jsx'
import Users from './pages/Users.jsx'
import Audit from './pages/Audit.jsx'
import Notifications from './pages/Notifications.jsx'
import ProductDetails from './pages/ProductDetails.jsx'
import SupplierDetails from './pages/SupplierDetails.jsx'
import AuditDetails from './pages/AuditDetails.jsx'
import Roles from './pages/Roles.jsx'

import MainLayout from './components/layout/MainLayout.jsx'

import { GlobalUIProvider } from './components/common/GlobalUI'

function App() {
  return (
    <GlobalUIProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/purchases/:supplierName" element={<Purchases />} />
          <Route path="/users" element={<Users />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/audit/:id" element={<AuditDetails />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/suppliers/:id" element={<SupplierDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </GlobalUIProvider>
  )
}

export default App
