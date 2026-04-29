import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const StockReceipts = () => {
  const { toast, confirm } = useGlobalUI();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receivedQuantities, setReceivedQuantities] = useState({}); // itemId -> qty
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState({ pending: 0, received: 0, completed: 0, trend: [] });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAdmin = Api.isAdminOrBranchManager();
  
  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadReceipts(currentPage, pageSize, debouncedSearch, selectedBranchId);
  }, [currentPage, debouncedSearch, selectedBranchId]);

  const loadReceipts = async (pageIndex = currentPage, size = pageSize, query = debouncedSearch, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const response = await Api.getStockReceipts(pageIndex, size, query, branchId);
      setReceipts(response?.items || []);
      setTotalPages(response?.totalPages || 1);
      setTotalElements(response?.totalItems || 0);
      setCurrentPage(response?.currentPage || pageIndex);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const stats = await Api.getStockReceiptAnalytics();
      
      // Calculate current totals from stats
      const today = new Date().toISOString().split('T')[0];
      const summary = { pending: 0, received: 0, completed: 0, trend: [] };
      
      // Group trend by date
      const trendMap = {};
      
      stats.forEach(s => {
        if (!trendMap[s.receiptDate]) trendMap[s.receiptDate] = { date: s.receiptDate, PENDING: 0, RECEIVED: 0, COMPLETED: 0 };
        trendMap[s.receiptDate][s.receiptStatus] = s.receiptCount;
        
        // Sum totals for all-time categories
        if (s.receiptStatus === 'PENDING') summary.pending += s.receiptCount;
        if (s.receiptStatus === 'RECEIVED') summary.received += s.receiptCount;
        if (s.receiptStatus === 'COMPLETED') summary.completed += s.receiptCount;
      });
      
      summary.trend = Object.values(trendMap).sort((a,b) => a.date.localeCompare(b.date)).slice(-15);
      setAnalytics(summary);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    if (isAdmin && branches.length === 0) {
      Api.getBranches().then(setBranches).catch(() => {});
    }
  }, []);

  const handleSaveQuantities = async (receiptId, qtys = null) => {
    confirm('هل أنت متأكد من تسجيل هذه الكميات؟ سيتم حفظها دون تحديث المخزون الفعلي.', async () => {
      try {
        await Api.saveStockReceiptQuantities(receiptId, qtys);
        toast('تم تسجيل الاستلام بنجاح. يمكنك الآن الإضافة للمخزن.', 'success');
        loadReceipts();
        closeModal();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const handleCommitToInventory = async (receiptId) => {
    confirm('هل أنت متأكد من إضافة الأصناف للمخزن؟ سيتم زيادة رصيد المنتجات الفعلي الآن.', async () => {
      try {
        await Api.commitStockReceiptToInventory(receiptId);
        toast('تمت إضافة الكميات للمخزن بنجاح', 'success');
        loadReceipts();
        closeModal();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const openDetails = (receipt) => {
    setSelectedReceipt(receipt);
    // Initialize quantities with full original quantities
    const initialQtys = {};
    receipt.items.forEach(item => {
      initialQtys[item.id] = item.quantity;
    });
    setReceivedQuantities(initialQtys);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReceipt(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span className="badge badge-warning">بانتظار الاستلام</span>;
      case 'RECEIVED': return <span className="badge badge-info">تم الاستلام</span>;
      case 'COMPLETED': return <span className="badge badge-success">تمت الإضافة للمخزن</span>;
      case 'CANCELLED': return <span className="badge badge-danger">ملغي</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="page-section">
      {/* Stock Receipts Analytics Dashboard */}
      {/* Analytics Dashboard */}
      <div className="stats-grid mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
        <StatTile 
          id="stk_pending"
          label="بانتظار المورد"
          value={`${analytics.pending} أمر`}
          icon="🕒"
          defaults={{ color: 'amber', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile 
          id="stk_received"
          label="استلام مؤقت (لم يرحل)"
          value={analytics.received}
          icon="📦"
          defaults={{ color: 'blue', size: 'tile-wd-sm', order: 2 }}
        />
        <StatTile 
          id="stk_completed"
          label="تم التخزين"
          value={analytics.completed}
          icon="✅"
          defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 3 }}
        />
      </div>

      <div className="card mb-4">
        <div className="card-header no-border">
          <h3>📊 اتجاه التوريد (آخر 15 يوم توريد)</h3>
          {analyticsLoading && <small style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>جاري التحديث...</small>}
        </div>
        <div className="card-body" style={{ minHeight: '300px', height: '300px', padding: '15px', position: 'relative' }}>
          {analytics.trend.length > 0 ? (
            <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={analytics.trend} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{fontSize: 10, fill: 'var(--text-dim)'}} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
                <YAxis tick={{fontSize: 10, fill: 'var(--text-dim)'}} />
                <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
                <Bar dataKey="PENDING" name="بانتظار المورد" fill="var(--metro-orange)" stackId="a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="RECEIVED" name="استلام جزئي" fill="var(--metro-blue)" stackId="a" />
                <Bar dataKey="COMPLETED" name="مرحل للمخزن" fill="var(--metro-green)" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-dim)' }}>لا توجد بيانات كافية للرسم البياني</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>📦 أذونات استلام المخزون</h3>
          <div className="toolbar">
            {isAdmin && (
              <select className="form-control" value={selectedBranchId} onChange={e => { setSelectedBranchId(e.target.value); setCurrentPage(0); }} style={{ width: '150px', height: '40px' }}>
                <option value="">جميع الفروع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <div className="search-input">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="بحث سريع..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => loadReceipts()}>تحديث</button>
            </div>
          </div>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <Loader message="جاري تحميل أذونات الاستلام..." />
            ) : receipts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h4>لا توجد أذونات استلام</h4>
                <p>تنشأ الأذونات تلقائياً عند تسجيل فواتير شراء جديدة</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>رقم الإذن</th>
                    <th>رقم الفاتورة</th>
                    <th>المورد</th>
                    <th>التاريخ</th>
                    <th>الحالة</th>
                    <th>المستلم</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{(currentPage * pageSize) + i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{r.receiptNumber}</td>
                      <td>{r.invoiceNumber}</td>
                      <td>{r.supplierName}</td>
                      <td>{new Date(r.receiptDate).toLocaleString('ar-EG')}</td>
                      <td>{getStatusBadge(r.status)}</td>
                      <td>{r.receivedBy || '—'}</td>
                      <td>
                        <div className="table-actions" style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn btn-icon btn-ghost" title="التفاصيل" onClick={() => openDetails(r)}>👁️</button>
                          
                          {Api.can('STOCK_WRITE') && (
                            <>
                              <button 
                                className="btn btn-sm btn-primary" 
                                disabled={r.status !== 'PENDING'}
                                onClick={() => openDetails(r)}
                                title={r.status === 'PENDING' ? "تسجيل الكميات المستلمة" : "تم تسجيل الاستلام"}
                              >
                                📦 استلام
                              </button>

                              <button 
                                className="btn btn-sm btn-success" 
                                disabled={r.status !== 'RECEIVED'}
                                onClick={() => handleCommitToInventory(r.id)}
                                title={r.status === 'RECEIVED' ? "ترحيل الكميات للمخزن" : (r.status === 'COMPLETED' ? "تمت الإضافة للمخزن" : "انتظر الاستلام أولاً")}
                              >
                                ➕ للمخزن
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: '10px' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: 'auto', padding: '0 15px' }}
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            السابق
          </button>
          <button className="active">{currentPage + 1}</button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: 'auto', padding: '0 15px' }}
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            التالي
          </button>
        </div>
      )}

      {isModalOpen && selectedReceipt && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '800px' }}>
              <div className="modal-header">
                <h3>تفاصيل إذن الاستلام: {selectedReceipt.receiptNumber}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', padding: '10px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <div><strong>المورد:</strong> {selectedReceipt.supplierName}</div>
                  <div><strong>رقم الفاتورة:</strong> {selectedReceipt.invoiceNumber}</div>
                  <div><strong>الحالة:</strong> {getStatusBadge(selectedReceipt.status)}</div>
                  <div><strong>التاريخ:</strong> {new Date(selectedReceipt.receiptDate).toLocaleString('ar-EG')}</div>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>الوحدة</th>
                      <th>الكمية المطلوبة</th>
                      <th style={{ width: '150px' }}>الكمية المستلمة</th>
                      <th>إجمالي القطع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceipt.items.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.productName}</td>
                        <td>{item.unitName}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'center', color: (item.receivedQuantity && item.receivedQuantity < item.quantity) ? 'var(--accent-red)' : 'inherit' }}>
                          {selectedReceipt.status === 'PENDING' ? (
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={receivedQuantities[item.id] || ''}
                              onChange={(e) => setReceivedQuantities(prev => ({
                                ...prev,
                                [item.id]: e.target.value
                              }))}
                              step="0.001"
                              min="0"
                              max={item.quantity}
                            />
                          ) : (
                            <span style={{ fontWeight: 600 }}>{item.receivedQuantity ?? item.quantity}</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                          {(((selectedReceipt.status === 'PENDING' ? receivedQuantities[item.id] : item.receivedQuantity) || item.quantity) * item.conversionFactor).toFixed(2)} قطعة
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={closeModal}>إغلاق</button>
                {selectedReceipt.status === 'PENDING' && Api.can('STOCK_WRITE') && (
                  <button className="btn btn-primary" onClick={() => handleSaveQuantities(selectedReceipt.id, receivedQuantities)}>📦 تسجيل وحفظ الكميات</button>
                )}
                {selectedReceipt.status === 'RECEIVED' && Api.can('STOCK_WRITE') && (
                  <button className="btn btn-success" onClick={() => handleCommitToInventory(selectedReceipt.id)}>➕ إضافة للمخزن الآن</button>
                )}
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default StockReceipts;
