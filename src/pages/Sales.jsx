import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import ReactDOM from 'react-dom';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useBranch } from '../context/BranchContext';
import '../styles/pages/SalesPremium.css';

// Modal Container for Portal
const ModalContainer = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

// Reusable CustomSelect Component
const CustomSelect = ({ options, value, onChange, icon, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="sal-custom-select-container" ref={containerRef}>
      <div 
        className={`sal-custom-select-header ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} arrow-icon`}></i>
        <span className="selected-text">{selectedOption?.label}</span>
        {icon && <span className="select-icon">{icon}</span>}
      </div>
      
      {isOpen && (
        <>
          <div className="sal-custom-select-overlay" onClick={() => setIsOpen(false)} />
          <div className="sal-custom-select-dropdown">
            {options.map((opt) => (
              <div 
                key={opt.value} 
                className={`sal-custom-select-option ${value === opt.value ? 'active' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <i className={`fas fa-check ${value === opt.value ? '' : 'invisible'}`} style={{ opacity: value === opt.value ? 1 : 0 }}></i>
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Sales = () => {
    const { toast, confirm } = useGlobalUI();
    const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSale, setActiveSale] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnItems, setReturnItems] = useState([]);
    const [returnNotes, setReturnNotes] = useState('');

    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const pageSize = 10;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const user = Api._getUser();
        const branchFromUrl = searchParams.get('branchId');
        
        if (branchFromUrl) {
          setSelectedBranchId(branchFromUrl);
        } else if (globalBranchId) {
          setSelectedBranchId(globalBranchId);
        } else if (user && user.branchId) {
          setSelectedBranchId(user.branchId);
        }

        if (contextBranches && contextBranches.length > 0) {
          setBranches(contextBranches);
        }
    }, [location.search, globalBranchId, contextBranches]);

    useEffect(() => {
        loadSales(currentPage, pageSize, debouncedSearch, selectedBranchId);
    }, [currentPage, debouncedSearch, selectedBranchId]);

    const loadSales = async (page = 0, size = 10, query = debouncedSearch, branchId = selectedBranchId) => {
        setLoading(true);
        try {
            const res = await Api.getSales(page, size, query, branchId);
            setSales(res.items || res.content || []);
            setTotalPages(res.totalPages || 0);
            setTotalElements(res.totalItems || res.totalElements || 0);
            setCurrentPage(res.currentPage ?? res.number ?? 0);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const openDetails = (sale) => {
        setActiveSale(sale);
        setShowDetails(true);
    };

    const openReturnModal = (sale) => {
        setActiveSale(sale);
        setReturnItems((sale.items || []).map(i => ({
            ...i,
            returnQty: 0
        })));
        setReturnNotes('');
        setShowReturnModal(true);
    };

    const handleReturn = async () => {
        const itemsToReturn = returnItems.filter(i => i.returnQty > 0);
        if (itemsToReturn.length === 0) {
            toast('يجب تحديد أصناف للرجوع أولاً', 'warning');
            return;
        }

        confirm('هل أنت متأكد من اتمام عملية المرتجع؟ سيتم استرجاع الأصناف للمخزن وخصم المبلغ من الخزنة.', async () => {
            try {
                const request = {
                    invoiceId: activeSale.id,
                    notes: returnNotes,
                    items: itemsToReturn.map(i => ({
                        productId: i.productId,
                        quantity: i.returnQty
                    }))
                };
                await Api.createSaleReturn(request);
                toast('تمت عملية المرتجع بنجاح', 'success');
                setShowReturnModal(false);
                loadSales();
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    };

    return (
        <div className="sales-page-container">
            {/* HEADER SECTION */}
            <div className="sal-header-container">
                <div className="sal-breadcrumbs">
                    <Link to="/">الرئيسية</Link>
                    <span>/</span>
                    <span>المبيعات</span>
                </div>
                <div className="sal-header-row">
                    <h1>سجل المبيعات</h1>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="sal-btn-ghost" onClick={() => navigate('/sales/analytics')}>
                            <i className="fas fa-chart-line"></i>
                            <span>الإحصائيات</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CARD */}
            <div className="sal-main-card">
                <div className="sal-toolbar">
                    <div className="sal-toolbar-left">
                        <CustomSelect 
                          label="كل الفروع"
                          value={selectedBranchId}
                          options={[
                            { label: 'جميع الفروع', value: '' },
                            ...branches.map(b => ({ label: b.name, value: b.id }))
                          ]}
                          onChange={setSelectedBranchId}
                          icon={<i className="fas fa-building"></i>}
                        />
                    </div>

                    <div className="sal-toolbar-right">
                        <div className="sal-search-box">
                            <i className="fas fa-search"></i>
                            <input
                                type="text"
                                placeholder="رقم الفاتورة أو العميل..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="sal-table-wrapper">
                    {loading ? (
                        <div style={{ padding: '60px' }}><Loader message="جاري جلب الفواتير..." /></div>
                    ) : sales.length === 0 ? (
                        <div style={{ padding: '80px', textAlign: 'center' }}>
                            <i className="fas fa-file-invoice" style={{ fontSize: '3rem', color: 'var(--sal-text-secondary)', marginBottom: '16px', display: 'block' }}></i>
                            <h3 style={{ color: 'var(--sal-text-primary)' }}>لا توجد فواتير مبيعات حالياً</h3>
                        </div>
                    ) : (
                        <table className="sal-table">
                            <thead>
                                <tr>
                                    <th>رقم الفاتورة</th>
                                    <th>التاريخ</th>
                                    <th>العميل</th>
                                    <th>الإجمالي</th>
                                    <th>المدفوع</th>
                                    <th>المتبقي</th>
                                    <th style={{ textAlign: 'center' }}>الحالة</th>
                                    <th style={{ textAlign: 'center' }}>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((s) => (
                                    <tr key={s.id}>
                                        <td><span className="sal-invoice-code" onClick={() => openDetails(s)}>{s.invoiceNumber}</span></td>
                                        <td>{new Date(s.invoiceDate).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                        <td style={{ fontWeight: 800, color: 'var(--sal-primary)' }}>{s.customerName}</td>
                                        <td style={{ fontWeight: 800 }}>{(s.totalAmount || 0).toLocaleString()}</td>
                                        <td style={{ color: 'var(--sal-accent-emerald)' }}>{(s.paidAmount || 0).toLocaleString()}</td>
                                        <td style={{ color: (s.remainingAmount || 0) > 0 ? 'var(--sal-accent-rose)' : 'var(--sal-accent-emerald)' }}>
                                            {(s.remainingAmount || 0).toLocaleString()}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`sal-badge ${
                                                s.status === 'PAID' ? 'sal-badge-paid' :
                                                s.status === 'PARTIAL' ? 'sal-badge-partial' :
                                                s.status === 'RETURNED' ? 'sal-badge-returned' :
                                                s.status === 'PARTIALLY_RETURNED' ? 'sal-badge-partial-returned' :
                                                'sal-badge-unpaid'
                                            }`}>
                                                <i className={`fas fa-${
                                                    s.status === 'PAID' ? 'check-circle' :
                                                    s.status === 'PARTIAL' ? 'clock' :
                                                    s.status === 'RETURNED' ? 'undo' :
                                                    s.status === 'PARTIALLY_RETURNED' ? 'exchange-alt' :
                                                    'exclamation-circle'
                                                }`}></i>
                                                {s.status === 'PAID' ? 'مدفوعة' :
                                                 s.status === 'PARTIAL' ? 'جزئي' :
                                                 s.status === 'RETURNED' ? 'مرتجع كلي' :
                                                 s.status === 'PARTIALLY_RETURNED' ? 'مرتجع جزئي' :
                                                 'آجل'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button className="sal-action-btn" onClick={() => openDetails(s)} title="التفاصيل">
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                {Api.can('SALE_WRITE') && s.status !== 'RETURNED' && (
                                                    <button className="sal-action-btn return" onClick={() => openReturnModal(s)} title="إرجاع">
                                                        <i className="fas fa-undo"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="sal-pagination">
                        <div style={{ color: 'var(--sal-text-secondary)', fontSize: '0.9rem' }}>
                            عرض {sales.length} من {totalElements} فاتورة
                        </div>
                        <div className="sal-page-buttons">
                            <button className="sal-page-btn" disabled={currentPage === 0} onClick={() => setCurrentPage(prev => prev - 1)}>
                                <i className="fas fa-chevron-right"></i>
                            </button>
                            <button className="sal-page-btn active">{currentPage + 1}</button>
                            <button className="sal-page-btn" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(prev => prev + 1)}>
                                <i className="fas fa-chevron-left"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* DETAILS MODAL */}
            {showDetails && activeSale && (
                <ModalContainer>
                    <div className="prd-modal-overlay active" onClick={(e) => { if (e.target.classList.contains('prd-modal-overlay')) setShowDetails(false); }}>
                        <div className="prd-modal" style={{ maxWidth: '700px' }}>
                            <div className="prd-card-title-row" style={{ padding: '24px 24px 0' }}>
                                <h3 className="prd-card-title">تفاصيل الفاتورة: {activeSale.invoiceNumber}</h3>
                                <button className="prd-modal-close" onClick={() => setShowDetails(false)}>✕</button>
                            </div>
                            <div className="prd-modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', padding: '20px', background: 'var(--sal-bg-dark)', borderRadius: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--sal-text-secondary)' }}>العميل</div>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{activeSale.customerName}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--sal-text-secondary)' }}>التاريخ</div>
                                        <div style={{ fontWeight: 800 }}>{new Date(activeSale.invoiceDate).toLocaleString('ar-EG')}</div>
                                    </div>
                                </div>

                                <div className="sal-table-wrapper">
                                    <table className="sal-table" style={{ minWidth: '0' }}>
                                        <thead>
                                            <tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
                                        </thead>
                                        <tbody>
                                            {activeSale.items?.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.productName}</td>
                                                    <td>{item.quantity} {item.unitName}</td>
                                                    <td>{(item.unitPrice || 0).toLocaleString()}</td>
                                                    <td style={{ fontWeight: 800 }}>{(item.totalPrice || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                <td colSpan="3" style={{ textAlign: 'left', fontWeight: 800 }}>الإجمالي الكلي:</td>
                                                <td style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--sal-primary)' }}>{(activeSale.totalAmount || 0).toLocaleString()} <small>ج.م</small></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                            <div className="prd-modal-footer">
                                <button className="sal-btn-ghost" onClick={() => setShowDetails(false)}>إغلاق</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}

            {/* RETURN MODAL */}
            {showReturnModal && activeSale && (
                <ModalContainer>
                    <div className="prd-modal-overlay active" onClick={(e) => { if (e.target.classList.contains('prd-modal-overlay')) setShowReturnModal(false); }}>
                        <div className="prd-modal" style={{ maxWidth: '900px' }}>
                            <div className="prd-card-title-row" style={{ padding: '24px 24px 0' }}>
                                <h3 className="prd-card-title">إجراء مرتجع مبيعات - {activeSale.invoiceNumber}</h3>
                                <button className="prd-modal-close" onClick={() => setShowReturnModal(false)}>✕</button>
                            </div>
                            <div className="prd-modal-body">
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--sal-glass-border)', padding: '15px', borderRadius: '12px', marginBottom: '20px', color: 'var(--sal-primary)', fontSize: '0.9rem' }}>
                                    <i className="fas fa-info-circle" style={{ marginLeft: '8px' }}></i>
                                    حدد الكميات المراد إرجاعها للمخزن من القائمة أدناه
                                </div>
                                
                                <div className="sal-table-wrapper">
                                    <table className="sal-table" style={{ minWidth: '0' }}>
                                        <thead>
                                            <tr>
                                                <th>الصنف</th>
                                                <th>الكمية المباعة</th>
                                                <th>السعر</th>
                                                <th style={{ textAlign: 'center' }}>كمية المرتجع</th>
                                                <th>الإجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {returnItems.map((item, idx) => (
                                                <tr key={item.id}>
                                                    <td>{item.productName}</td>
                                                    <td>{item.quantity} {item.unitName}</td>
                                                    <td>{(item.unitPrice || 0).toLocaleString()}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="number"
                                                            className="prd-input"
                                                            style={{ width: '80px', margin: '0 auto', textAlign: 'center' }}
                                                            min="0"
                                                            max={item.quantity}
                                                            value={item.returnQty}
                                                            onChange={e => {
                                                                const val = Math.min(item.quantity, Math.max(0, parseFloat(e.target.value) || 0));
                                                                const newItems = [...returnItems];
                                                                newItems[idx].returnQty = val;
                                                                setReturnItems(newItems);
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ fontWeight: 800 }}>{(item.returnQty * (item.unitPrice || 0)).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="prd-form-group" style={{ marginTop: '24px' }}>
                                    <label className="prd-label">ملاحظات المرتجع (سبب الإرجاع) *</label>
                                    <textarea
                                        className="prd-input"
                                        rows="3"
                                        value={returnNotes}
                                        onChange={e => setReturnNotes(e.target.value)}
                                        placeholder="اكتب سبب المرتجع هنا..."
                                        style={{ resize: 'none' }}
                                    ></textarea>
                                </div>
                            </div>
                            <div className="prd-modal-footer">
                                <button className="sal-btn-ghost" onClick={() => setShowReturnModal(false)}>إلغاء</button>
                                <button className="pur-btn-primary" style={{ background: 'var(--sal-accent-rose)', boxShadow: '0 4px 15px rgba(244, 63, 94, 0.3)' }} onClick={handleReturn}>
                                    <span>اتمام المرتجع</span>
                                    <i className="fas fa-box-open"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default Sales;
