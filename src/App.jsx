import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import AddProduct from './pages/AddProduct.jsx'
import Categories from './pages/Categories.jsx'
import CategoryDetails from './pages/CategoryDetails.jsx'
import Suppliers from './pages/Suppliers.jsx'
import ProductAnalytics from './pages/ProductAnalytics.jsx'
import Purchases from './pages/Purchases.jsx'
import PurchaseDetails from './pages/PurchaseDetails.jsx'
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
import StockTransfers from './pages/StockTransfers.jsx'
import POS from './pages/POS.jsx'
import Customers from './pages/Customers.jsx'
import CustomerDetails from './pages/CustomerDetails.jsx'
import Sales from './pages/Sales.jsx'
import SaleDetails from './pages/SaleDetails.jsx'
import SessionsLog from './pages/SessionsLog.jsx'
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
import AttendanceSettings from './pages/AttendanceSettings.jsx'
import EmployeeQrScan from './pages/EmployeeQrScan.jsx'
import ViolationMap from './pages/ViolationMap.jsx'
import AttendanceViolationsLog from './pages/AttendanceViolationsLog.jsx'
import EcommerceStore from './pages/EcommerceStore.jsx'
import OnlineOrders from './pages/OnlineOrders.jsx'
import StoreProductDetail from './pages/StoreProductDetail.jsx'
import StoreCategoryPage from './pages/StoreCategoryPage.jsx'
import StoreAccountPage from './pages/StoreAccountPage.jsx'
import StoreWishlistPage from './pages/StoreWishlistPage.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import TermsOfUse from './pages/TermsOfUse.jsx'
import PrivacyPolicyCorp from './pages/PrivacyPolicyCorp.jsx'
import TermsOfUseCorp from './pages/TermsOfUseCorp.jsx'
import FixedAssets from './pages/FixedAssets.jsx'
import DeletedProducts from './pages/DeletedProducts.jsx'
import LeaveTypes from './pages/LeaveTypes.jsx'
import LeaveRequests from './pages/LeaveRequests.jsx'
import DownloadDesktopApp from './pages/DownloadDesktopApp.jsx'
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
import InventoryChecks from './pages/InventoryChecks.jsx'
import InventoryCheckDetails from './pages/InventoryCheckDetails.jsx'
import FacebookAdsDashboard from './pages/FacebookAdsDashboard.jsx'
import EmployeeCustody from './pages/EmployeeCustody.jsx'
import TenantRegister from './pages/TenantRegister.jsx'
import LandingPage from './pages/LandingPage.jsx'
import WelcomePage from './pages/WelcomePage.jsx'
import SubscriptionSuccess from './pages/SubscriptionSuccess.jsx'
import FinancialAnalytics from './pages/FinancialAnalytics.jsx'
import TrialBalance from './pages/TrialBalance.jsx'
import SuperAdminSubscriptions from './pages/SuperAdminSubscriptions.jsx'
import SuperAdminTenantCommunications from './pages/SuperAdminTenantCommunications.jsx'
import StoreInactive from './pages/StoreInactive.jsx'
import SubscriptionHistory from './pages/SubscriptionHistory.jsx'
import Tickets from './pages/Tickets.jsx'
import Articles from './pages/Articles.jsx'
import ArticleDetail from './pages/ArticleDetail.jsx'
import SuperAdminArticles from './pages/SuperAdminArticles.jsx'
import SuperAdminDesktopApp from './pages/SuperAdminDesktopApp.jsx'
import { StoreProvider } from './context/StoreContext.jsx'
import { StoreAuthProvider } from './context/StoreAuthContext.jsx'
import { TileProvider } from './context/TileContext.jsx'
import TileEditorModal from './components/common/TileEditorModal.jsx'

import OrderCustomer from './pages/OrderCustomer.jsx'
import OrderCashier from './pages/OrderCashier.jsx'
import PrintInvoice from './pages/PrintInvoice.jsx'

import CostCenterSetup from './pages/manufacturing/CostCenterSetup.jsx'
import WorkstationSetup from './pages/manufacturing/WorkstationSetup.jsx'
import BomManagement from './pages/manufacturing/BomManagement.jsx'
import RoutingEditor from './pages/manufacturing/RoutingEditor.jsx'
import ProductionOrderList from './pages/manufacturing/ProductionOrderList.jsx'
import ProductionOrderForm from './pages/manufacturing/ProductionOrderForm.jsx'
import MrpDashboard from './pages/manufacturing/MrpDashboard.jsx'
import QualityControlBoard from './pages/manufacturing/QualityControlBoard.jsx'
import ProductionCostReport from './pages/manufacturing/ProductionCostReport.jsx'
import RawMaterials from './pages/manufacturing/RawMaterials.jsx'

import MainLayout from './components/layout/MainLayout.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import Error403 from './pages/Error403.jsx'
import Error404 from './pages/Error404.jsx'
import Error500 from './pages/Error500.jsx'

import { GlobalUIProvider } from './components/common/GlobalUI'
import { ThemeProvider } from './components/common/ThemeContext'
import { BranchProvider } from './context/BranchContext.jsx'

import Messages from './pages/Messages.jsx'
import Campaigns from './pages/Campaigns.jsx'

/**
 * Main application component setting up global contexts, router, and route definitions.
 * <p>
 * Providers are stacked hierarchically to manage themes, dialog overlays, active branches, and dashboards:
 * <ul>
 *   <li>{@code ThemeProvider}: Manages the dark/light mode toggle across the application.</li>
 *   <li>{@code GlobalUIProvider}: Handles global snackbars, confirmation dialogs, and loaders.</li>
 *   <li>{@code BranchProvider}: Stores the active selected store branch context.</li>
 *   <li>{@code TileProvider}: Controls dashboard layout tiles customizer.</li>
 * </ul>
 * </p>
 * <p>
 * Routes are split into three main access categories:
 * <ol>
 *   <li><b>Public Landing & Registration</b>: Guest registration for tenants and SaaS landing page.</li>
 *   <li><b>Public Storefront</b>: Customer e-commerce catalog pages wrapping with {@code StoreProvider} and {@code StoreAuthProvider}.</li>
 *   <li><b>Protected ERP Modules</b>: Restricts access to authenticated users and validates active permissions (e.g., `PRODUCT_READ`, `SALE_READ`) via the {@code ProtectedRoute} wrapper.</li>
 * </ol>
 * </p>
 *
 * @component
 * @returns {React.ReactElement} The rendered global application context tree and routes.
 */
function App() {
  return (
    <ThemeProvider>
      <GlobalUIProvider>
        <BranchProvider>
          <TileProvider>
            <TileEditorModal />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/register" element={<TenantRegister />} />
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                
                {/* Public Store Routes with Context */}
                <Route path="/store" element={<StoreAuthProvider><StoreProvider><EcommerceStore /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/account" element={<StoreAuthProvider><StoreProvider><StoreAccountPage /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/product/:id" element={<StoreAuthProvider><StoreProvider><StoreProductDetail /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/category/:id" element={<StoreAuthProvider><StoreProvider><StoreCategoryPage /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/wishlist" element={<StoreAuthProvider><StoreProvider><StoreWishlistPage /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/privacy-policy" element={<StoreAuthProvider><StoreProvider><PrivacyPolicy /></StoreProvider></StoreAuthProvider>} />
                <Route path="/store/terms-of-use" element={<StoreAuthProvider><StoreProvider><TermsOfUse /></StoreProvider></StoreAuthProvider>} />
                <Route path="/terms" element={<TermsOfUseCorp />} />
                <Route path="/privacy" element={<PrivacyPolicyCorp />} />
                <Route path="/blog" element={<Articles />} />
                <Route path="/blog/:slug" element={<ArticleDetail />} />
                <Route path="/403" element={<Error403 />} />
                <Route path="/500" element={<Error500 />} />
                
                <Route element={<ProtectedRoute />}>
                  <Route path="/customer-order" element={<CustomerOrder />} />
                  <Route path="/order-customer" element={<OrderCustomer />} />
                  <Route path="/order-cashier" element={<OrderCashier />} />
                  <Route path="/store-inactive" element={<StoreInactive />} />
                  <Route path="/print-receipt/:id" element={<PrintInvoice />} />
                  <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    
                    {/* Sales & POS */}
                    <Route element={<ProtectedRoute permission="SALE_READ" />}>
                      <Route path="/pos" element={<POS />} />
                      <Route path="/sessions" element={<SessionsLog />} />
                      <Route path="/sales" element={<Sales />} />
                      <Route path="/sales/view/:id" element={<SaleDetails />} />
                      <Route path="/sales/analytics" element={<SalesAnalytics />} />
                      <Route path="/returns" element={<Returns />} />
                      <Route path="/online-orders" element={<OnlineOrders />} />
                    </Route>

                    {/* Products & Inventory */}
                    <Route element={<ProtectedRoute permission="PRODUCT_READ" />}>
                      <Route path="/products" element={<Products />} />
                      <Route path="/products/add" element={<AddProduct />} />
                      <Route path="/products/edit/:id" element={<AddProduct />} />
                      <Route path="/products/:id" element={<ProductDetails />} />
                      <Route path="/products/analytics" element={<ProductAnalytics />} />
                      <Route path="/products/deleted" element={<DeletedProducts />} />
                      <Route path="/products/interactions" element={<ProductInteractions />} />
                      <Route path="/products/offers" element={<CustomerOffers />} />
                      <Route path="/categories" element={<Categories />} />
                      <Route path="/categories/:id" element={<CategoryDetails />} />
                      <Route path="/categories/:categoryId/products" element={<Products />} />
                      <Route path="/inventory/report" element={<InventoryReport />} />
                      <Route path="/inventory-checks" element={<InventoryChecks />} />
                      <Route path="/inventory-checks/:id" element={<InventoryCheckDetails />} />
                      
                      {/* Manufacturing */}
                      <Route path="/manufacturing/cost-centers" element={<CostCenterSetup />} />
                      <Route path="/manufacturing/workstations" element={<WorkstationSetup />} />
                      <Route path="/manufacturing/raw-materials" element={<RawMaterials />} />
                      <Route path="/manufacturing/boms" element={<BomManagement />} />
                      <Route path="/manufacturing/routing" element={<RoutingEditor />} />
                      <Route path="/manufacturing/production-orders" element={<ProductionOrderList />} />
                      <Route path="/manufacturing/production-orders/new" element={<ProductionOrderForm />} />
                      <Route path="/manufacturing/mrp" element={<MrpDashboard />} />
                      <Route path="/manufacturing/quality" element={<QualityControlBoard />} />
                      <Route path="/manufacturing/cost-report" element={<ProductionCostReport />} />
                      <Route path="/manufacturing/production-orders/:id/cost-report" element={<ProductionCostReport />} />
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
                      <Route path="/purchases/view/:id" element={<PurchaseDetails />} />
                      <Route path="/stock-receipts" element={<StockReceipts />} />
                    </Route>

                    {/* Customers */}
                    <Route element={<ProtectedRoute permission="CUSTOMER_READ" />}>
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/customers/:id" element={<CustomerDetails />} />
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
                    </Route>
                    <Route element={<ProtectedRoute permission="BRANCH_READ" />}>
                      <Route path="/branches" element={<Branches />} />
                      <Route path="/branches/:id/manage" element={<BranchManagement />} />
                    </Route>
                    <Route element={<ProtectedRoute permission="WAREHOUSE_READ" />}>
                      <Route path="/warehouses" element={<Warehouses />} />
                      <Route path="/stock-transfers" element={<StockTransfers />} />
                      <Route path="/stock-transfers/new" element={<StockTransfers />} />
                    </Route>

                    {/* Super Admin */}
                    <Route path="/super-admin/subscriptions" element={<SuperAdminSubscriptions />} />
                    <Route path="/super-admin/tenants/:id/communications" element={<SuperAdminTenantCommunications />} />
                    <Route path="/super-admin/articles" element={<SuperAdminArticles />} />
                    <Route path="/super-admin/desktop-app" element={<SuperAdminDesktopApp />} />

                    {/* Technical Support */}
                    <Route path="/tickets" element={<Tickets />} />

                    {/* Generic */}
                    <Route path="/attendance/scan" element={<EmployeeQrScan />} />
                    <Route element={<ProtectedRoute permission="ATTENDANCE_GEO_ALERT" />}>
                      <Route path="/attendance/violation-map" element={<ViolationMap />} />
                      <Route path="/attendance/violations-log" element={<AttendanceViolationsLog />} />
                    </Route>
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/campaigns" element={<Campaigns />} />
                    <Route path="/leave-types" element={<LeaveTypes />} />
                    <Route path="/download-desktop-app" element={<DownloadDesktopApp />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/settings/smtp" element={<Settings />} />
                    <Route path="/settings/print" element={<Settings />} />
                    <Route path="/settings/banner" element={<Settings />} />
                    <Route path="/subscription-history" element={<SubscriptionHistory />} />
                    <Route element={<ProtectedRoute permission="SETTINGS_MANAGE" />}>
                      <Route path="/settings/attendance" element={<AttendanceSettings />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<Error404 />} />
              </Routes>
            </BrowserRouter>
          </TileProvider>
        </BranchProvider>
      </GlobalUIProvider>
    </ThemeProvider>
  )
}

export default App
