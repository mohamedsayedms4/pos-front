import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import ReactDOM from 'react-dom';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useBranch } from '../context/BranchContext';

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
    const [formErrors, setFormErrors] = useState({});

    const fileInputRef = React.useRef(null);
    const [importingExcel, setImportingExcel] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            const menu = document.getElementById('importSalesDropdownMenu');
            if (menu && menu.style.display === 'block' && !e.target.closest('.dropdown-import-container')) {
                menu.style.display = 'none';
            }
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');

    // Pagination & Search state
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const navigate = useNavigate();
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
            const res = await Api.getSalesInvoicesSummary(page, size, query, branchId);
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

    const openDetails = async (sale) => {
        setLoading(true);
        try {
            const fullSale = await Api.getSaleById(sale.id);
            setActiveSale(fullSale);
            setShowDetails(true);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const openReturnModal = async (sale) => {
        setLoading(true);
        try {
            const fullSale = await Api.getSaleById(sale.id);
            setActiveSale(fullSale);
            setFormErrors({});
            // Initialize return items with 0 quantity
            setReturnItems((fullSale.items || []).map(i => ({
                ...i,
                returnQty: 0
            })));
            setReturnNotes('');
            setShowReturnModal(true);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!selectedBranchId) {
            toast('يرجى اختيار الفرع أولاً لتحديد وجهة الاستيراد', 'warning');
            return;
        }

        setImportingExcel(true);
        toast('جاري استيراد الفواتير من ملف إكسيل...', 'info');
        try {
            const res = await Api.importSalesExcel(file, selectedBranchId);
            toast(res.data || res.message || 'تم استيراد فواتير المبيعات بنجاح', 'success');
            loadSales();
        } catch (err) {
            toast(err.message || 'فشل استيراد فواتير المبيعات', 'error');
        } finally {
            setImportingExcel(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownloadTemplate = async () => {
        toast('جاري تحميل نموذج الاستيراد...', 'info');
        try {
            await Api.downloadSalesImportTemplate();
            toast('تم تحميل النموذج بنجاح', 'success');
        } catch (err) {
            toast(err.message || 'فشل تحميل النموذج', 'error');
        }
    };

    const handleExportExcel = async () => {
        setExportingExcel(true);
        toast('جاري تصدير فواتير المبيعات...', 'info');
        try {
            await Api.exportSalesExcel(debouncedSearch, selectedBranchId);
            toast('تم تصدير ملف الإكسيل بنجاح', 'success');
        } catch (err) {
            toast(err.message || 'فشل تصدير ملف الإكسيل', 'error');
        } finally {
            setExportingExcel(false);
        }
    };

    const handleReturn = async () => {
        const itemsToReturn = returnItems.filter(i => i.returnQty > 0);
        if (itemsToReturn.length === 0) {
            toast('يجب تحديد أصناف للرجوع أولاً', 'warning');
            return;
        }

        confirm('هل أنت متأكد من اتمام عملية المرتجع؟ سيتم استرجاع الأصناف للمخزن وخصم المبلغ من الخزنة.', async () => {
            setFormErrors({});
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
                if (err.errors) {
                    setFormErrors(err.errors);
                    toast(err.message || 'يرجى تصحيح الأخطاء في الحقول المشار إليها', 'error');
                } else {
                    toast(err.message, 'error');
                }
            }
        });
    };

    return (
        <div className="page-section" style={{ direction: 'rtl' }}>
            <div className="card">
                <div className="card-header">
                    <h3>🧾 سجل فواتير المبيعات</h3>
                    <div className="toolbar">
                        <select 
                          className="form-control" 
                          value={selectedBranchId} 
                          onChange={(e) => setSelectedBranchId(e.target.value)}
                          style={{ width: '180px', height: '40px', padding: '0 10px' }}
                          disabled={!Api.can('ROLE_ADMIN')}
                        >
                          <option value="">كل الفروع</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>

                        <div className="search-input">
                            <input
                                type="text"
                                placeholder="بحث سريع..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(0);
                                }}
                            />
                            <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleImportExcel} 
                              accept=".xlsx, .xls" 
                              style={{ display: 'none' }} 
                            />

                            {Api.can('SALE_READ') && (
                              <button
                                className="btn btn-secondary"
                                onClick={handleExportExcel}
                                disabled={exportingExcel || sales.length === 0}
                              >
                                {exportingExcel ? '⏳' : '📊'} تصدير إكسيل
                              </button>
                            )}

                            {Api.can('SALE_WRITE') && (
                              <div className="dropdown-import-container" style={{ position: 'relative', display: 'inline-block' }}>
                                 <button
                                   type="button"
                                   className="btn btn-secondary"
                                   onClick={() => {
                                     const menu = document.getElementById('importSalesDropdownMenu');
                                     if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                                   }}
                                   disabled={importingExcel}
                                 >
                                   {importingExcel ? '⏳ جاري الاستيراد...' : '📥 استيراد'}
                                 </button>
                                 <div 
                                   id="importSalesDropdownMenu" 
                                   style={{ 
                                     display: 'none', 
                                     position: 'absolute', 
                                     background: 'var(--bg-elevated, #1a1a1a)', 
                                     minWidth: '200px', 
                                     boxShadow: '0px 8px 24px rgba(0,0,0,0.3)', 
                                     zIndex: 100, 
                                     right: 0, 
                                     borderRadius: '8px', 
                                     border: '1px solid var(--border-subtle, #333)',
                                     marginTop: '8px',
                                     overflow: 'hidden'
                                   }}
                                 >
                                   <button 
                                     type="button"
                                     onClick={() => {
                                       const menu = document.getElementById('importSalesDropdownMenu');
                                       if (menu) menu.style.display = 'none';
                                       if (fileInputRef.current) fileInputRef.current.click();
                                     }}
                                     style={{ 
                                       color: 'var(--text-main, #ffffff)', 
                                       padding: '12px 16px', 
                                       textDecoration: 'none', 
                                       display: 'flex', 
                                       alignItems: 'center',
                                       justifyContent: 'flex-start',
                                       gap: '10px',
                                       width: '100%', 
                                       border: 'none', 
                                       background: 'transparent', 
                                       textAlign: 'right', 
                                       fontSize: '0.9rem', 
                                       cursor: 'pointer',
                                       transition: 'background-color 0.2s'
                                     }}
                                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover-tile, #2a2a2a)'}
                                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                   >
                                     <span style={{ fontSize: '1.1rem' }}>📂</span>
                                     <span style={{ color: 'var(--text-main, #ffffff)' }}>رفع ملف إكسيل</span>
                                   </button>
                                   <button 
                                     type="button"
                                     onClick={() => {
                                       const menu = document.getElementById('importSalesDropdownMenu');
                                       if (menu) menu.style.display = 'none';
                                       handleDownloadTemplate();
                                     }}
                                     style={{ 
                                       color: 'var(--text-main, #ffffff)', 
                                       padding: '12px 16px', 
                                       textDecoration: 'none', 
                                       display: 'flex', 
                                       alignItems: 'center',
                                       justifyContent: 'flex-start',
                                       gap: '10px',
                                       width: '100%', 
                                       border: 'none', 
                                       background: 'transparent', 
                                       textAlign: 'right', 
                                       fontSize: '0.9rem', 
                                       cursor: 'pointer',
                                       borderTop: '1px solid var(--border-subtle, #333)',
                                       transition: 'background-color 0.2s'
                                     }}
                                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover-tile, #2a2a2a)'}
                                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                   >
                                     <span style={{ fontSize: '1.1rem' }}>📋</span>
                                     <span style={{ color: 'var(--text-main, #ffffff)' }}>تحميل نموذج فارغ</span>
                                   </button>
                                 </div>
                              </div>
                            )}

                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/sales/analytics')}
                            >
                                📊 إحصائيات المبيعات
                            </button>
                        </div>
                    </div>
                </div>

                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>رقم الفاتورة</th>
                                    <th>التاريخ</th>
                                    <th>العميل</th>
                                    <th>الإجمالي</th>
                                    <th>المدفوع</th>
                                    <th>المتبقي</th>
                                    <th>الحالة</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="9"><Loader message="جاري تحميل فواتير المبيعات..." /></td></tr>
                                ) : sales.length === 0 ? (
                                    <tr><td colSpan="9" style={{ textAlign: 'center' }}>لا يوجد فواتير مبيعات</td></tr>
                                ) : sales.map((s, i) => (
                            <tr key={s.id}>
                                <td data-label="#"><strong>{(currentPage * pageSize) + i + 1}</strong></td>
                                <td data-label="رقم الفاتورة"><strong>{s.invoiceNumber}</strong></td>
                                <td data-label="التاريخ">{new Date(s.invoiceDate).toLocaleString('ar-EG')}</td>
                                <td data-label="العميل">{s.customerName}</td>
                                <td data-label="الإجمالي">{(s.totalAmount || 0).toFixed(2)}</td>
                                <td data-label="المدفوع">{(s.paidAmount || 0).toFixed(2)}</td>
                                <td data-label="المتبقي" className={(s.remainingAmount || 0) > 0 ? 'text-danger' : 'text-success'}>
                                    {(s.remainingAmount || 0).toFixed(2)}
                                </td>
                                <td data-label="الحالة">
                                    <span className={`badge ${s.status === 'PAID' ? 'badge-success' :
                                            s.status === 'PARTIAL' ? 'badge-info' :
                                                s.status === 'RETURNED' ? 'badge-neutral' :
                                                    s.status === 'PARTIALLY_RETURNED' ? 'badge-warning' :
                                                        'badge-danger'
                                        }`}>
                                        {s.status === 'PAID' ? 'تم الدفع' :
                                            s.status === 'PARTIAL' ? 'دفع جزئي' :
                                                s.status === 'RETURNED' ? 'مرتجع كلي' :
                                                    s.status === 'PARTIALLY_RETURNED' ? 'مرتجع جزئي' :
                                                        'آجل'}
                                    </span>
                                </td>
                                <td data-label="الإجراءات">
                                    <button className="btn btn-secondary btn-sm" onClick={() => openDetails(s)}>التفاصيل</button>
                                    {Api.can('SALE_WRITE') && (
                                        <button className="btn btn-danger btn-sm" onClick={() => openReturnModal(s)}>↩ مرتجع</button>
                                    )}
                                </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="pagination" style={{ borderTop: '1px solid var(--border-main)' }}>
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
            </div>
        </div>

        {showDetails && activeSale && ReactDOM.createPortal(
            <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowDetails(false); }}>
                <div className="modal" style={{ width: '100%', maxWidth: '600px' }}>
                    <div className="modal-header">
                        <h2>تفاصيل الفاتورة: {activeSale.invoiceNumber}</h2>
                        <button onClick={() => setShowDetails(false)}>✕</button>
                    </div>
                    <div className="modal-body" style={{ padding: '15px' }}>
                        <div className="invoice-summary mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                            <p><strong>العميل:</strong><br /> {activeSale.customerName}</p>
                            <p><strong>التاريخ:</strong><br /> {new Date(activeSale.invoiceDate).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>الصنف</th>
                                        <th>الكمية</th>
                                        <th>السعر</th>
                                        <th>الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeSale.items && activeSale.items.map(item => (
                                        <tr key={item.id}>
                                            <td data-label="الصنف">{item.productName}</td>
                                            <td data-label="الكمية">{item.quantity} {item.unitName}</td>
                                            <td data-label="السعر">{(item.unitPrice || 0).toFixed(2)}</td>
                                            <td data-label="الإجمالي">{(item.totalPrice || 0).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4" style={{ textAlign: 'left', borderTop: '2px solid #222', paddingTop: '10px' }}>
                            <h3 style={{ color: 'var(--metro-blue)' }}>الإجمالي: {(activeSale.totalAmount || 0).toFixed(2)} <small>ج.م</small></h3>
                        </div>
                    </div>
                    <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => setShowDetails(false)}>إغلاق</button>
                        <button 
                            className="btn btn-primary" 
                            onClick={() => {
                                setShowDetails(false);
                                navigate(`/sales/view/${activeSale.id}`);
                            }}
                        >
                            عرض التفاصيل الكاملة 📄
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* Return Modal */}
        {showReturnModal && activeSale && ReactDOM.createPortal(
            <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowReturnModal(false); }}>
                <div className="modal" style={{ width: '900px', maxWidth: '95vw' }}>
                    <div className="modal-header">
                        <h2>إجراء مرتجع مبيعات - فاتورة {activeSale.invoiceNumber}</h2>
                        <button onClick={() => setShowReturnModal(false)}>✕</button>
                    </div>
                    <div className="modal-body">
                        <div className="alert alert-info" style={{ marginBottom: '15px' }}>حدد الكميات المراد إرجاعها للمخزن من القائمة أدناه</div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>الصنف</th>
                                        <th>الكمية المباعة</th>
                                        <th>السعر</th>
                                        <th>كمية المرتجع</th>
                                        <th>الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {returnItems.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td data-label="الصنف">{item.productName}</td>
                                            <td data-label="الكمية">{item.quantity} {item.unitName}</td>
                                            <td data-label="السعر">{(item.unitPrice || 0).toFixed(2)}</td>
                                            <td data-label="كمية المرتجع">
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    style={{ width: '80px', margin: '0 auto' }}
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
                                            <td data-label="الإجمالي">{(item.returnQty * (item.unitPrice || 0)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="form-group mt-4">
                            <label>ملاحظات المرتجع (سبب الإرجاع) *</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                value={returnNotes}
                                onChange={e => setReturnNotes(e.target.value)}
                                placeholder="اكتب سبب المرتجع هنا..."
                            ></textarea>
                            {formErrors.notes && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.notes}</span>}
                            {formErrors.items && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.items}</span>}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowReturnModal(false)}>إلغاء</button>
                        <button className="btn btn-danger" onClick={handleReturn}>📦 اتمام المرتجع</button>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </div>
);
};

export default Sales;
