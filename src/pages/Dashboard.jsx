import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useBranch } from '../context/BranchContext';
import SalesAnalytics from './SalesAnalytics';
import Purchases from './Purchases';
import Returns from './Returns';
import ProfitLoss from './ProfitLoss';
import Customers from './Customers';
import Expenses from './Expenses';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { selectedBranchId: globalBranchId } = useBranch();
  const [user, setUser] = useState(Api._getUser());
  const [tenantInfo, setTenantInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [counts, setCounts] = useState({
    branches: 0,
    sales: 0,
    purchases: 0,
    customers: 0,
    suppliers: 0,
    products: 0,
    expenses: 0,
    receipts: 0
  });

  useEffect(() => {
    Api.getCurrentTenantDetails()
      .then(res => {
        if (res) setTenantInfo(res);
      })
      .catch(err => console.error('Error fetching tenant details:', err));
  }, []);

  useEffect(() => {
    const loadCounts = async () => {
      setLoading(true);
      try {
        const [
          branchesData,
          salesData,
          purchasesData,
          customersData,
          suppliersData,
          productsData,
          expensesData,
          debtsData
        ] = await Promise.all([
          Api.getBranches().catch(() => []),
          Api.getSales(0, 1, '', globalBranchId).catch(() => ({})),
          Api.getPurchases(0, 1, '', globalBranchId).catch(() => ({})),
          Api.getCustomers(0, 1, '', globalBranchId).catch(() => ({})),
          Api.getSuppliers(0, 1, '', '', globalBranchId).catch(() => ({})),
          Api.getProductsPaged(0, 1, '', 'id,desc', globalBranchId).catch(() => ({})),
          Api.getExpenses(0, 1, '', '', '', globalBranchId).catch(() => ({})),
          Api.getDebts(0, 1, '', '', '', '', globalBranchId).catch(() => ({}))
        ]);

        setCounts({
          branches: Array.isArray(branchesData) ? branchesData.length : 0,
          sales: salesData?.totalElements || salesData?.totalItems || salesData?.content?.length || 0,
          purchases: purchasesData?.totalElements || purchasesData?.totalItems || purchasesData?.content?.length || 0,
          customers: customersData?.totalElements || customersData?.totalItems || customersData?.content?.length || 0,
          suppliers: suppliersData?.totalElements || suppliersData?.totalItems || suppliersData?.content?.length || 0,
          products: productsData?.totalElements || productsData?.totalItems || productsData?.items?.length || 0,
          expenses: expensesData?.totalElements || expensesData?.totalItems || expensesData?.content?.length || 0,
          receipts: debtsData?.totalElements || debtsData?.totalItems || debtsData?.content?.length || 0
        });
      } catch (err) {
        console.error('Error loading dashboard counts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCounts();
  }, [globalBranchId]);

  const storeUrl = tenantInfo
    ? `https://${window.location.hostname === 'localhost' ? 'digitalrace.net' : window.location.host}/${tenantInfo.slug}/login`
    : '';

  const handleCopyLink = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy text: ', err));
  };

  const handleManageSubscription = () => {
    alert('إدارة الاشتراك: للترقية أو تجديد الاشتراك، يرجى التواصل مع الدعم الفني لمجموعة ديجيتال ريس.');
  };

  const formatDateArabic = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const isExpired = tenantInfo?.subscriptionExpiry 
    ? new Date(tenantInfo.subscriptionExpiry) < new Date() 
    : false;

  if (loading) {
    return <Loader message="جاري التحميل..." />;
  }

  return (
    <div className="page-section">
      <style dangerouslySetInnerHTML={{__html: `
        .subscription-banner-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, var(--metro-indigo, #6A00FF) 0%, var(--metro-purple, #881798) 100%);
          border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
          padding: 24px 30px;
          margin-bottom: 30px;
          color: #ffffff;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        [data-theme='light'] .subscription-banner-card {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-color: #e2e8f0;
        }

        .sub-banner-right {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: right;
          z-index: 2;
        }

        .sub-banner-greeting {
          font-family: 'Cairo', sans-serif;
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .sub-banner-plan {
          font-family: 'Cairo', sans-serif;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .plan-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 10px;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 0;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .sub-banner-dates {
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.85);
          display: flex;
          gap: 15px;
          align-items: center;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .date-highlight {
          color: #ffffff;
          font-weight: 700;
        }

        .date-separator {
          color: rgba(255, 255, 255, 0.4);
          margin: 0 4px;
        }

        .sub-banner-left {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-end;
          z-index: 2;
        }

        .store-link-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 320px;
          max-width: 100%;
        }

        .store-link-label {
          font-family: 'Cairo', sans-serif;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.9);
          text-align: right;
        }

        .store-link-input-wrapper {
          display: flex;
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: rgba(0, 0, 0, 0.2);
        }

        .store-link-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 8px 12px;
          color: #ffffff;
          font-family: monospace;
          font-size: 0.9rem;
          outline: none;
          text-align: left;
          direction: ltr;
        }

        .store-link-copy-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-right: 1px solid rgba(255, 255, 255, 0.4);
          color: #ffffff;
          padding: 0 15px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .store-link-copy-btn:hover {
          background: rgba(255, 255, 255, 0.35);
        }

        .manage-sub-btn {
          background: #ffffff;
          color: #6A00FF;
          border: none;
          padding: 10px 20px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          width: fit-content;
        }

        [data-theme='light'] .manage-sub-btn {
          color: #4f46e5;
        }

        .manage-sub-btn:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .manage-sub-btn:active {
          transform: translateY(0);
        }

        /* ─── Dashboard Tabs styles ─── */
        .dashboard-tabs-container {
          margin-bottom: 24px;
          overflow-x: auto;
          scrollbar-width: none; /* Firefox */
        }
        
        .dashboard-tabs-container::-webkit-scrollbar {
          display: none; /* Safari & Chrome */
        }
        
        .dashboard-tabs {
          display: flex;
          gap: 12px;
          background: var(--bg-tile);
          border: 1px solid var(--border-subtle);
          padding: 8px 12px;
          border-radius: 40px;
          width: max-content;
          min-width: 100%;
          direction: rtl;
        }
        
        .tab-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 30px;
          text-decoration: none;
          color: var(--text-light);
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .tab-item:hover {
          color: var(--text-white);
          background: var(--bg-hover-tile);
        }
        
        .tab-item.active {
          background: rgba(106, 0, 255, 0.15);
          color: #a855f7;
          border: 1px solid rgba(106, 0, 255, 0.3);
        }
        
        [data-theme='light'] .tab-item.active {
          background: rgba(79, 70, 229, 0.1);
          color: #4f46e5;
          border-color: rgba(79, 70, 229, 0.2);
        }
        
        .tab-icon {
          font-size: 1.1rem;
          display: flex;
          align-items: center;
        }
        
        /* ─── Shortcut Grid styles ─── */
        .shortcut-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          direction: rtl;
          margin-bottom: 30px;
        }
        
        .shortcut-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-tile);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 20px 24px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        
        .shortcut-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.1);
          border-color: var(--border-hover);
        }
        
        [data-theme='dark'] .shortcut-card:hover {
          box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.4);
        }
        
        .shortcut-card-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: right;
        }
        
        .shortcut-title {
          font-family: 'Cairo', sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-white);
        }
        
        .shortcut-subtitle {
          font-family: 'Cairo', sans-serif;
          font-size: 0.9rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        
        .shortcut-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
        }
        
        /* Brand Colors for Icons */
        .bg-blue-light {
          background: rgba(37, 99, 235, 0.1);
          color: #2563eb;
        }
        .bg-gold-light {
          background: rgba(245, 158, 11, 0.15);
          color: #d97706;
        }
        .bg-rose-light {
          background: rgba(225, 29, 72, 0.1);
          color: #e11d48;
        }
        .bg-purple-light {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }
        .bg-teal-light {
          background: rgba(13, 148, 136, 0.1);
          color: #0d9488;
        }
        .bg-violet-light {
          background: rgba(168, 85, 247, 0.1);
          color: #a855f7;
        }
        .bg-green-light {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        @media (max-width: 992px) {
          .subscription-banner-card {
            flex-direction: column;
            gap: 20px;
            align-items: stretch;
            padding: 20px;
          }
          
          .sub-banner-left {
            align-items: stretch;
          }
          
          .store-link-section {
            width: 100%;
          }
          
          .manage-sub-btn {
            width: 100%;
            text-align: center;
          }
          
          .shortcut-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 576px) {
          .shortcut-grid {
            grid-template-columns: 1fr;
          }
        }
      `}} />

      {/* Subscription Banner */}
      {tenantInfo && (
        <div className="subscription-banner-card">
          <div className="sub-banner-right">
            <div className="sub-banner-greeting">
              أهلاً بك {user?.name || 'المستخدم'}، مرحباً بعودتك
            </div>
            <div className="sub-banner-plan">
              <span className="plan-label">الباقة الحالية :</span>
              <span className="plan-badge">
                {isExpired ? 'المجانية (منتهية)' : 'التجريبية (نشطة)'}
              </span>
            </div>
            <div className="sub-banner-dates">
              <span>تاريخ الإشتراك: <strong className="date-highlight">{formatDateArabic(user?.createdAt)}</strong></span>
              <span className="date-separator">|</span>
              <span>تاريخ الإنتهاء: <strong className="date-highlight">{formatDateArabic(tenantInfo?.subscriptionExpiry)}</strong></span>
            </div>
          </div>
          <div className="sub-banner-left">
            <div className="store-link-section">
              <label className="store-link-label">رابط تسجيل دخول الموظفين / المتجر</label>
              <div className="store-link-input-wrapper">
                <input 
                  type="text" 
                  readOnly 
                  value={storeUrl} 
                  className="store-link-input"
                  onClick={(e) => e.target.select()}
                />
                <button 
                  onClick={handleCopyLink} 
                  className="store-link-copy-btn"
                >
                  {copied ? '✓ تم النسخ' : 'نسخ الرابط'}
                </button>
              </div>
            </div>
            <button className="manage-sub-btn" onClick={handleManageSubscription}>
              إدارة إشتراكك ⚡
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="dashboard-tabs-container">
        <div className="dashboard-tabs">
          <div className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">🖥️</span>
            <span className="tab-text">نظرة عامة</span>
          </div>
          <div className={`tab-item ${activeTab === 'sales-analytics' ? 'active' : ''}`} onClick={() => setActiveTab('sales-analytics')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">📊</span>
            <span className="tab-text">إحصائيات المبيعات</span>
          </div>
          <div className={`tab-item ${activeTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveTab('purchases')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">🛒</span>
            <span className="tab-text">إحصائيات المشتريات</span>
          </div>
          <div className={`tab-item ${activeTab === 'returns' ? 'active' : ''}`} onClick={() => setActiveTab('returns')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">🔄</span>
            <span className="tab-text">إحصائيات المرتجعات</span>
          </div>
          <div className={`tab-item ${activeTab === 'profit-loss' ? 'active' : ''}`} onClick={() => setActiveTab('profit-loss')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">💵</span>
            <span className="tab-text">إحصائيات أرباح المبيعات</span>
          </div>
          <div className={`tab-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">👥</span>
            <span className="tab-text">إحصائيات الموردين والعملاء</span>
          </div>
          <div className={`tab-item ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">💸</span>
            <span className="tab-text">إحصائيات المصروفات</span>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {/* Tab Content */}
      {activeTab === 'sales-analytics' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <SalesAnalytics />
        </div>
      )}
      {activeTab === 'purchases' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <Purchases />
        </div>
      )}
      {activeTab === 'returns' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <Returns />
        </div>
      )}
      {activeTab === 'profit-loss' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <ProfitLoss />
        </div>
      )}
      {activeTab === 'customers' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <Customers />
        </div>
      )}
      {activeTab === 'expenses' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <Expenses />
        </div>
      )}

      {activeTab === 'overview' && (
      <div className="shortcut-grid">
        {/* Branches */}
        {Api.can('BRANCH_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/branches')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">الفروع</span>
              <span className="shortcut-subtitle">{counts.branches}+ فرع</span>
            </div>
            <div className="shortcut-icon-wrapper bg-purple-light">
              <span className="shortcut-icon text-purple">🏢</span>
            </div>
          </div>
        )}

        {/* Sales */}
        {Api.can('SALE_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/sales')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">المبيعات</span>
              <span className="shortcut-subtitle">{counts.sales} فاتورة</span>
            </div>
            <div className="shortcut-icon-wrapper bg-blue-light">
              <span className="shortcut-icon text-blue">📈</span>
            </div>
          </div>
        )}

        {/* Purchases */}
        {Api.can('PURCHASE_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/purchases')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">المشتريات</span>
              <span className="shortcut-subtitle">{counts.purchases} فاتورة</span>
            </div>
            <div className="shortcut-icon-wrapper bg-gold-light">
              <span className="shortcut-icon text-gold">🛒</span>
            </div>
          </div>
        )}

        {/* Customers */}
        {Api.can('CUSTOMER_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/customers')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">العملاء</span>
              <span className="shortcut-subtitle">{counts.customers}+ عميل</span>
            </div>
            <div className="shortcut-icon-wrapper bg-purple-light">
              <span className="shortcut-icon text-purple">👥</span>
            </div>
          </div>
        )}

        {/* Suppliers */}
        {Api.can('SUPPLIER_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/suppliers')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">الموردين</span>
              <span className="shortcut-subtitle">{counts.suppliers}+ مورد</span>
            </div>
            <div className="shortcut-icon-wrapper bg-blue-light">
              <span className="shortcut-icon text-blue">📦</span>
            </div>
          </div>
        )}

        {/* Products */}
        {Api.can('PRODUCT_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/products')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">الاصناف</span>
              <span className="shortcut-subtitle">{counts.products}+ صنف</span>
            </div>
            <div className="shortcut-icon-wrapper bg-violet-light">
              <span className="shortcut-icon text-violet">▨</span>
            </div>
          </div>
        )}

        {/* Payment Vouchers (Expenses) */}
        {Api.can('EXPENSE_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/expenses')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">سندات الصرف</span>
              <span className="shortcut-subtitle">{counts.expenses} سند</span>
            </div>
            <div className="shortcut-icon-wrapper bg-green-light">
              <span className="shortcut-icon text-green">📄</span>
            </div>
          </div>
        )}

        {/* Receipt Vouchers (Debts) */}
        {Api.can('TREASURY_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/debts')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">سند القبض</span>
              <span className="shortcut-subtitle">{counts.receipts} سند</span>
            </div>
            <div className="shortcut-icon-wrapper bg-green-light">
              <span className="shortcut-icon text-green">💵</span>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default Dashboard;
