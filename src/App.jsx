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
import ProductInteractions from './pages/ProductInteractions.jsx'
import CustomerOffers from './pages/CustomerOffers.jsx'
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
import TreasuryManagement from './pages/TreasuryManagement.jsx'
import CustomerOrder from './pages/CustomerOrder.jsx'
import DamagedProducts from './pages/DamagedProducts.jsx'
import SalesAnalytics from './pages/SalesAnalytics.jsx'
import DebtManagement from './pages/DebtManagement.jsx'
import InstallmentCalendar from './pages/InstallmentCalendar.jsx'
import Employees from './pages/Employees.jsx'
import EmployeeDetails from './pages/EmployeeDetails.jsx'
import ShiftsManagement from './pages/ShiftsManagement.jsx'
import PayrollDashboard from './pages/PayrollDashboard.jsx'
import AttendanceDashboard from './pages/AttendanceDashboard.jsx'
import EcommerceStore from './pages/EcommerceStore.jsx'
import OnlineOrders from './pages/OnlineOrders.jsx'
import StoreProductDetail from './pages/StoreProductDetail.jsx'
import StoreCategoryPage from './pages/StoreCategoryPage.jsx'
import StoreAccountPage from './pages/StoreAccountPage.jsx'
import StoreWishlistPage from './pages/StoreWishlistPage.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import TermsOfUse from './pages/TermsOfUse.jsx'
import FixedAssets from './pages/FixedAssets.jsx'
import LeaveTypes from './pages/LeaveTypes.jsx'
import LeaveRequests from './pages/LeaveRequests.jsx'
import Settings from './pages/Settings.jsx'
import Expenses from './pages/Expenses.jsx'
import FinancialAccounts from './pages/FinancialAccounts.jsx'
import CheckManagement from './pages/CheckManagement.jsx'
import ProfitLoss from './pages/ProfitLoss.jsx'
import Partners from './pages/Partners.jsx'
import Branches from './pages/Branches.jsx'
import BranchManagement from './pages/BranchManagement.jsx'
import Warehouses from './pages/Warehouses.jsx'
import InventoryReport from './pages/InventoryReport.jsx'
import FacebookAdsDashboard from './pages/FacebookAdsDashboard.jsx'
import OfflineAudit from './pages/OfflineAudit.jsx'
import EmployeeCustody from './pages/EmployeeCustody.jsx'
import FinancialAnalytics from './pages/FinancialAnalytics.jsx'
import TrialBalance from './pages/TrialBalance.jsx'
import { StoreProvider } from './context/StoreContext.jsx'
import { StoreAuthProvider } from './context/StoreAuthContext.jsx'
import { TileProvider } from './context/TileContext.jsx'
import TileEditorModal from './components/common/TileEditorModal.jsx'

import OrderCustomer from './pages/OrderCustomer.jsx'
import OrderCashier from './pages/OrderCashier.jsx'

import MainLayout from './components/layout/MainLayout.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'

import { GlobalUIProvider } from './components/common/GlobalUI'
import { ThemeProvider } from './components/common/ThemeContext'
import { BranchProvider } from './context/BranchContext.jsx'

import Messages from './pages/Messages.jsx'

function App() {
  return (
    <ThemeProvider>
      <GlobalUIProvider>
        <BranchProvider>
          <TileProvider>
            <TileEditorModal />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Login />} />
                
                {/* Public Store Routes with Context */}
                <Route path="/store" element={<StoreAuthProvider><StoreProvider><EcommerceStore /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/account" element={<StoreAuthProvider><StoreProvider><StoreAccountPage /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/product/:id" element={<StoreAuthProvider><StoreProvider><StoreProductDetail /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/category/:id" element={<StoreAuthProvider><StoreProvider><StoreCategoryPage /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/wishlist" element={<StoreAuthProvider><StoreProvider><StoreWishlistPage /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/privacy-policy" element={<StoreAuthProvider><StoreProvider><PrivacyPolicy /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/terms-of-use" element={<StoreAuthProvider><StoreProvider><TermsOfUse /></StoreProvider></StoreAuthProvider>} />
                
                <Route element={<ProtectedRoute />}>
                  <Route path="/customer-order" element={<CustomerOrder />} />
                  <Route path="/order-customer" element={<OrderCustomer />} />
                  <Route path="/order-cashier" element={<OrderCashier />} />
                  <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    
                    {/* Sales & POS */}
                    <Route element={<ProtectedRoute permission="SALE_READ" />}>
                      <Route path="/pos" element={<POS />} />
                      <Route path="/sales" element={<Sales />} />
                      <Route path="/sales/analytics" element={<SalesAnalytics />} />
                      <Route path="/returns" element={<Returns />} />
                      <Route path="/online-orders" element={<OnlineOrders />} />
                    </Route>

                    {/* Products & Inventory */}
                    <Route element={<ProtectedRoute permission="PRODUCT_READ" />}>
                      <Route path="/products" element={<Products />} />
                      <Route path="/products/:id" element={<ProductDetails />} />
                      <Route path="/products/analytics" element={<ProductAnalytics />} />
                      <Route path="/products/interactions" element={<ProductInteractions />} />
                      <Route path="/products/offers" element={<CustomerOffers />} />
                      <Route path="/categories" element={<Categories />} />
                      <Route path="/inventory/report" element={<InventoryReport />} />
                    </Route>

                    {/* Damaged Goods */}
                    <Route element={<ProtectedRoute permission="DAMAGED_GOODS_MANAGE" />}>
                      <Route path="/damaged" element={<DamagedProducts />} />
                    </Route>

                    {/* Suppliers & Purchases */}
                    <Route element={<ProtectedRoute permission="SUPPLIER_READ" />}>
                      <Route path="/suppliers" element={<Suppliers />} />
                      <Route path="/suppliers/:id" element={<SupplierDetails />} />
                    </Route>
                    <Route element={<ProtectedRoute permission="PURCHASE_READ" />}>
                      <Route path="/purchases" element={<Purchases />} />
                      <Route path="/purchases/:supplierName" element={<Purchases />} />
                      <Route path="/stock-receipts" element={<StockReceipts />} />
                    </Route>

                    {/* Customers */}
                    <Route element={<ProtectedRoute permission="CUSTOMER_READ" />}>
                      <Route path="/customers" element={<Customers />} />
                    </Route>

                    {/* Treasury & Finance */}
                    <Route element={<ProtectedRoute permission="TREASURY_READ" />}>
                      <Route path="/treasury" element={<Treasury />} />
                      <Route path="/financial-accounts" element={<FinancialAccounts />} />
                      <Route path="/financial-analytics" element={<FinancialAnalytics />} />
                      <Route path="/checks" element={<CheckManagement />} />
                      <Route path="/treasury-management" element={<TreasuryManagement />} />
                      <Route path="/debts" element={<DebtManagement />} />
                      <Route path="/installments-calendar" element={<InstallmentCalendar />} />
                      <Route path="/profit-loss" element={<ProfitLoss />} />
                      <Route path="/partners" element={<Partners />} />
                      <Route path="/facebook-ads" element={<FacebookAdsDashboard />} />
                      <Route path="/trial-balance" element={<TrialBalance />} />
                    </Route>

                    <Route element={<ProtectedRoute permission="EXPENSE_READ" />}>
                      <Route path="/expenses" element={<Expenses />} />
                    </Route>

                    <Route element={<ProtectedRoute permission="FIXED_ASSET_READ" />}>
                      <Route path="/fixed-assets" element={<FixedAssets />} />
                    </Route>

                    {/* HR & Employees */}
                    <Route element={<ProtectedRoute permission="EMPLOYEE_READ" />}>
                      <Route path="/employees" element={<Employees />} />
                      <Route path="/employees/:id" element={<EmployeeDetails />} />
                      <Route path="/custody" element={<EmployeeCustody />} />
                    </Route>
                    <Route element={<ProtectedRoute permission="ATTENDANCE_READ" />}>
                      <Route path="/attendance" element={<AttendanceDashboard />} />
                    </Route>
                    <Route element={<ProtectedRoute permission="LEAVE_READ" />}>
                      <Route path="/leave-requests" element={<LeaveRequests />} />
                    </Route>
                    <Route element={<ProtectedRoute permission="PAYROLL_READ" />}>
                      <Route path="/payroll" element={<PayrollDashboard />} />
                    </Route>
                    <Route element={<ProtectedRoute permission="SHIFT_MANAGE" />}>
                      <Route path="/shifts" element={<ShiftsManagement />} />
                    </Route>

                    {/* Administration */}
                    <Route element={<ProtectedRoute permission="USER_READ" />}>
                      <Route path="/users" element={<Users />} />
                    </Route>
                    <Route element={<ProtectedRoute permission="ROLE_READ" />}>
                      <Route path="/roles" element={<Roles />} />
                    </Route>
                    <Route element={<ProtectedRoute permission="AUDIT_READ" />}>
                      <Route path="/audit" element={<Audit />} />
                      <Route path="/audit/:id" element={<AuditDetails />} />
                      <Route path="/offline-audit" element={<OfflineAudit />} />
                    </Route>
                    <Route element={<ProtectedRoute permission="BRANCH_READ" />}>
                      <Route path="/branches" element={<Branches />} />
                      <Route path="/branches/:id/manage" element={<BranchManagement />} />
                    </Route>
                    <Route element={<ProtectedRoute permission="WAREHOUSE_READ" />}>
                      <Route path="/warehouses" element={<Warehouses />} />
                    </Route>

                    {/* Generic */}
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/leave-types" element={<LeaveTypes />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </TileProvider>
        </BranchProvider>
      </GlobalUIProvider>
    </ThemeProvider>
  )
}

export default App
