import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import Categories from './pages/Categories.jsx'
import Suppliers from './pages/Suppliers.jsx'
import ProductAnalytics from './pages/ProductAnalytics.jsx'
import Purchases from './pages/Purchases.jsx'
import Users from './pages/Users.jsx'
import Audit from './pages/Audit.jsx'
import Notifications from './pages/Notifications.jsx'
import ProductDetails from './pages/ProductDetails.jsx'
import SupplierDetails from './pages/SupplierDetails.jsx'
import AuditDetails from './pages/AuditDetails.jsx'
import Roles from './pages/Roles.jsx'
import StockReceipts from './pages/StockReceipts.jsx'
import POS from './pages/POS.jsx'
import Customers from './pages/Customers.jsx'
import Sales from './pages/Sales.jsx'
import Returns from './pages/Returns.jsx'
import Treasury from './pages/Treasury.jsx'
import CustomerOrder from './pages/CustomerOrder.jsx'
import DamagedProducts from './pages/DamagedProducts.jsx'
import SalesAnalytics from './pages/SalesAnalytics.jsx'
import DebtManagement from './pages/DebtManagement.jsx'
import InstallmentCalendar from './pages/InstallmentCalendar.jsx'
import Employees from './pages/Employees.jsx'
import EmployeeDetails from './pages/EmployeeDetails.jsx'

import OrderCustomer from './pages/OrderCustomer.jsx'
import OrderCashier from './pages/OrderCashier.jsx'

import MainLayout from './components/layout/MainLayout.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'

import { GlobalUIProvider } from './components/common/GlobalUI'
import { ThemeProvider } from './components/common/ThemeContext'

import Messages from './pages/Messages.jsx'

function App() {
  return (
    <ThemeProvider>
      <GlobalUIProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/customer-order" element={<CustomerOrder />} />
          <Route path="/order-customer" element={<OrderCustomer />} />
          <Route path="/order-cashier" element={<OrderCashier />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/purchases/:supplierName" element={<Purchases />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/analytics" element={<SalesAnalytics />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/users" element={<Users />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/audit/:id" element={<AuditDetails />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/products/analytics" element={<ProductAnalytics />} />
          <Route path="/damaged" element={<DamagedProducts />} />
          <Route path="/suppliers/:id" element={<SupplierDetails />} />
          <Route path="/stock-receipts" element={<StockReceipts />} />
          <Route path="/treasury" element={<Treasury />} />
          <Route path="/debts" element={<DebtManagement />} />
          <Route path="/installments-calendar" element={<InstallmentCalendar />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/:id" element={<EmployeeDetails />} />
          <Route path="/messages" element={<Messages />} />
        </Route>
      </Route>
    </Routes>
    </BrowserRouter>
    </GlobalUIProvider>
    </ThemeProvider>
  )
}

export default App
