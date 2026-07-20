import React, { useState, useEffect, useRef } from 'react';
import { useGlobalUI } from '../components/common/GlobalUI';
import Api from '../services/api';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';
import { useBranch } from '../context/BranchContext';

const PriceQuotations = () => {
  const { toast, confirm } = useGlobalUI();
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branches, setBranches] = useState([]);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printQuotation, setPrintQuotation] = useState(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertQuotation, setConvertQuotation] = useState(null);
  const [convertPaidAmount, setConvertPaidAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountValue, setDiscountValue] = useState('0');
  const [discountType, setDiscountType] = useState('FIXED');
  const [taxValue, setTaxValue] = useState('0');
  const [taxType, setTaxType] = useState('PERCENTAGE');
  const [notes, setNotes] = useState('عرض السعر ساري لمدة 7 أيام من تاريخ الصدور');
  const [validDays, setValidDays] = useState(7);
  const [items, setItems] = useState([]);

  // Product Selection helper
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [customers, setCustomers] = useState([]);
  const printRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (globalBranchId) setSelectedBranchId(globalBranchId);
    if (contextBranches && contextBranches.length > 0) setBranches(contextBranches);
  }, [globalBranchId, contextBranches]);

  useEffect(() => {
    loadData(currentPage, debouncedSearch, statusFilter, selectedBranchId);
  }, [currentPage, debouncedSearch, statusFilter, selectedBranchId]);

  useEffect(() => {
    Api.getCustomers(0, 100, '').then(res => {
      setCustomers(res.content || res.items || []);
    }).catch(() => {});
  }, []);

  const loadData = async (page = 0, query = debouncedSearch, status = statusFilter, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const res = await Api.getPriceQuotations(page, pageSize, query, status, branchId);
      setData(res.content || res.items || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
      setCurrentPage(res.number || 0);
    } catch (err) {
      toast(err.message || 'فشل تحميل بيانات الأسعار', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Product Auto-complete
  useEffect(() => {
    if (!productSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await Api.getProductsPaged(0, 10, productSearch.trim(), 'id,desc', selectedBranchId);
        setSearchResults(res?.items || res?.content || []);
      } catch (err) {
        console.error("Error searching products in PriceQuotations:", err);
      } finally {
        setSearchingProducts(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, selectedBranchId]);

  const handleSelectCustomer = (e) => {
    const id = e.target.value;
    setCustomerId(id);
    if (id) {
      const found = customers.find(c => String(c.id) === String(id));
      if (found) {
        setCustomerName(found.name || '');
        setCustomerPhone(found.phone || '');
      }
    }
  };

  const handleAddProductToItems = (p) => {
    const existingIndex = items.findIndex(i => i.productId === p.id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      setItems([...items, {
        productId: p.id,
        productName: p.name,
        productCode: p.productCode || '',
        quantity: 1,
        unitPrice: p.salePrice || p.purchasePrice || 0,
        discountAmount: 0
      }]);
    }
    setProductSearch('');
    setSearchResults([]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = Number(value);
    setItems(updated);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const line = (Number(item.quantity || 0) * Number(item.unitPrice || 0)) - Number(item.discountAmount || 0);
      return sum + (line > 0 ? line : 0);
    }, 0);
  };

  const calculateDiscountAmount = () => {
    const sub = calculateSubtotal();
    const val = Number(discountValue || 0);
    if (val <= 0) return 0;
    if (discountType === 'PERCENTAGE') {
      return (sub * val) / 100;
    }
    return val;
  };

  const calculateTaxAmount = () => {
    const sub = calculateSubtotal();
    const disc = calculateDiscountAmount();
    const baseForTax = Math.max(0, sub - disc);
    const val = Number(taxValue || 0);
    if (val <= 0) return 0;
    if (taxType === 'PERCENTAGE') {
      return (baseForTax * val) / 100;
    }
    return val;
  };

  const calculateGrandTotal = () => {
    const sub = calculateSubtotal();
    const disc = calculateDiscountAmount();
    const tax = calculateTaxAmount();
    const total = sub - disc + tax;
    return total > 0 ? total : 0;
  };

  const openAddForm = () => {
    setEditingQuotation(null);
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setDiscountValue('0');
    setDiscountType('FIXED');
    setTaxValue('0');
    setTaxType('PERCENTAGE');
    setNotes('عرض السعر ساري لمدة 7 أيام من تاريخ الصدور');
    setValidDays(7);
    setItems([]);
    setIsFormOpen(true);
  };

  const openEditForm = (q) => {
    setEditingQuotation(q);
    setCustomerId(q.customerId ? String(q.customerId) : '');
    setCustomerName(q.customerName || '');
    setCustomerPhone(q.customerPhone || '');
    setDiscountValue(String(q.discountAmount || 0));
    setDiscountType('FIXED');
    setTaxValue(String(q.taxAmount || 0));
    setTaxType('FIXED');
    setNotes(q.notes || '');
    setValidDays(7);
    setItems((q.items || []).map(i => ({
      productId: i.productId,
      productName: i.productName,
      productCode: i.productCode,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discountAmount: Number(i.discountAmount || 0)
    })));
    setIsFormOpen(true);
  };

  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      toast('يرجى إضافة منتج واحد على الأقل لبيان الأسعار', 'warning');
      return;
    }

    const payload = {
      customerId: customerId ? Number(customerId) : null,
      customerName: customerName || 'عميل عام',
      customerPhone: customerPhone || '',
      discountAmount: Number(calculateDiscountAmount().toFixed(2)),
      taxAmount: Number(calculateTaxAmount().toFixed(2)),
      notes: notes,
      validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString(),
      branchId: selectedBranchId ? Number(selectedBranchId) : null,
      items: items.map(i => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discountAmount: Number(i.discountAmount || 0)
      }))
    };

    setSaving(true);
    try {
      if (editingQuotation) {
        await Api.updatePriceQuotation(editingQuotation.id, payload);
        toast('تم تحديث بيان الأسعار بنجاح', 'success');
      } else {
        await Api.createPriceQuotation(payload);
        toast('تم إنشاء بيان الأسعار بنجاح', 'success');
      }
      setIsFormOpen(false);
      loadData(currentPage);
    } catch (err) {
      toast(err.message || 'فشل حفظ بيان الأسعار', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!convertQuotation) return;
    setSaving(true);
    try {
      const amount = convertPaidAmount !== '' ? Number(convertPaidAmount) : null;
      const sale = await Api.convertPriceQuotationToSale(convertQuotation.id, amount);
      toast(`تم تحويل بيان الأسعار بنجاح إلى فاتورة مبيعات رقم #${sale.invoiceNumber}`, 'success');
      setIsConvertModalOpen(false);
      loadData(currentPage);
    } catch (err) {
      toast(err.message || 'فشل تحويل بيان الأسعار إلى فاتورة', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (q) => {
    confirm(`هل أنت تأكد من حذف بيان الأسعار رقم "${q.quotationNumber}"؟`, async () => {
      try {
        await Api.deletePriceQuotation(q.id);
        toast('تم حذف بيان الأسعار بنجاح', 'success');
        loadData(currentPage);
      } catch (err) {
        toast(err.message || 'فشل حذف بيان الأسعار', 'error');
      }
    });
  };

  const handlePrint = (q) => {
    setPrintQuotation(q);
    setIsPrintModalOpen(true);
  };

  const triggerBrowserPrint = () => {
    const printContent = printRef.current.innerHTML;
    const win = window.open('', '', 'width=900,height=800');
    win.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>بيان أسعار - ${printQuotation?.quotationNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; color: #111; direction: rtl; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #005a9e; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #005a9e; }
            .meta { font-size: 14px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: right; }
            th { background-color: #f3f4f6; color: #111; }
            .totals { margin-left: 0; margin-right: auto; width: 300px; }
            .totals div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
            .grand-total { font-weight: bold; font-size: 18px; color: #005a9e; border-bottom: 2px solid #005a9e !important; }
            .notes { margin-top: 30px; font-size: 13px; color: #555; background: #fafafa; padding: 10px; border-radius: 4px; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'CONVERTED': return 'badge-emerald';
      case 'ACCEPTED': return 'badge-blue';
      case 'SENT': return 'badge-amber';
      case 'REJECTED': return 'badge-rose';
      default: return 'badge-secondary';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'CONVERTED': return 'تم التحويل إلى فاتورة مبيعات';
      case 'ACCEPTED': return 'مقبول';
      case 'SENT': return 'تم الإرسال';
      case 'REJECTED': return 'مرفوض';
      case 'EXPIRED': return 'منتهي';
      default: return 'مسودة';
    }
  };

  return (
    <div className="page-section">
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <StatTile
          id="quo_total"
          label="إجمالي عروض الأسعار"
          value={totalElements}
          icon={<i className="fa-solid fa-file-signature"></i>}
          defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile
          id="quo_converted"
          label="المحولة لفواتير"
          value={data.filter(q => q.status === 'CONVERTED').length}
          icon={<i className="fa-solid fa-check-double"></i>}
          defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
        />
        <StatTile
          id="quo_pending"
          label="معلقة / مسودة"
          value={data.filter(q => q.status === 'DRAFT' || q.status === 'SENT').length}
          icon={<i className="fa-solid fa-clock"></i>}
          defaults={{ color: 'amber', size: 'tile-sq-sm', order: 3 }}
        />
        <StatTile
          id="quo_value"
          label="إجمالي القيم الكلية"
          value={`${data.reduce((sum, q) => sum + Number(q.grandTotal || 0), 0).toLocaleString()} ج.م`}
          icon={<i className="fa-solid fa-sack-dollar"></i>}
          defaults={{ color: 'magenta', size: 'tile-sq-sm', order: 4 }}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h3><i className="fa-solid fa-file-signature"></i> إدارة عروض وبيانات الأسعار</h3>
          <div className="toolbar" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              className="form-control"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{ width: '170px', height: '40px' }}
              disabled={!Api.can('ROLE_ADMIN')}
            >
              <option value="">كل الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '160px', height: '40px' }}
            >
              <option value="">كل الحالات</option>
              <option value="DRAFT">مسودة</option>
              <option value="SENT">تم الإرسال</option>
              <option value="ACCEPTED">مقبول</option>
              <option value="CONVERTED">تم التحويل لفاتورة</option>
              <option value="REJECTED">مرفوض</option>
            </select>

            <div className="search-input" style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                placeholder="بحث برقم العرض أو العميل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
            </div>

            <button className="btn btn-primary" onClick={openAddForm}>
              <span>+</span> إنشاء بيان أسعار جديد
            </button>
          </div>
        </div>

        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <Loader message="جاري تحميل بيانات الأسعار..." />
            ) : data.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><i className="fa-solid fa-file-signature"></i></div>
                <h4>لا توجد بيانات أسعار</h4>
                <p>قم بالضغط على "+ إنشاء بيان أسعار جديد" للبدء</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>رقم العرض</th>
                    <th>العميل</th>
                    <th>التاريخ</th>
                    <th>عدد الأصناف</th>
                    <th>الإجمالي</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((q) => (
                    <tr key={q.id}>
                      <td style={{ fontWeight: 700, color: 'var(--metro-blue)' }}>
                        {q.quotationNumber}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{q.customerName || 'عميل عام'}</div>
                        {q.customerPhone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{q.customerPhone}</div>}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(q.quotationDate).toLocaleDateString('ar-EG')}
                      </td>
                      <td>{(q.items || []).length} صنف</td>
                      <td style={{ fontWeight: 700 }}>
                        {Number(q.grandTotal || 0).toFixed(2)} ج.م
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(q.status)}`}>
                          {getStatusLabel(q.status)}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-icon btn-ghost" title="طباعة / معاينة" onClick={() => handlePrint(q)}>
                            <i className="fa-solid fa-print"></i>
                          </button>
                          {q.status !== 'CONVERTED' && (
                            <>
                              <button className="btn btn-sm btn-success" title="تحويل لفاتورة مبيعات" onClick={() => { setConvertQuotation(q); setConvertPaidAmount(String(q.grandTotal)); setIsConvertModalOpen(true); }}>
                                <i className="fa-solid fa-cart-shopping"></i> تحويل لفاتورة
                              </button>
                              <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => openEditForm(q)}>
                                <i className="fa-solid fa-pencil"></i>
                              </button>
                              <button className="btn btn-icon btn-ghost" title="حذف" onClick={() => handleDelete(q)}>
                                <i className="fa-solid fa-trash"></i>
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

          {totalPages > 1 && (
            <div className="pagination" style={{ borderTop: '1px solid var(--border-main)', padding: '12px' }}>
              <button className="btn btn-ghost btn-sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>السابق</button>
              <span>صفحة {currentPage + 1} من {totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>التالي</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add/Edit Price Quotation */}
      {isFormOpen && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setIsFormOpen(false); }}>
            <div className="modal" style={{ maxWidth: '850px', width: '90%' }}>
              <div className="modal-header">
                <h3>{editingQuotation ? `تعديل بيان أسعار - ${editingQuotation.quotationNumber}` : 'إنشاء بيان أسعار جديد'}</h3>
                <button className="modal-close" onClick={() => setIsFormOpen(false)}><i className="fa-solid fa-times"></i></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <form id="quotationForm" onSubmit={handleSaveQuotation}>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                    <div className="form-group">
                      <label>اختيار عميل مسجل</label>
                      <select className="form-control" value={customerId} onChange={handleSelectCustomer}>
                        <option value="">-- عميل جديد / نقدي --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>اسم العميل / الجهة *</label>
                      <input className="form-control" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="شركة الأمل / محمد علي" />
                    </div>
                    <div className="form-group">
                      <label>رقم هاتف العميل</label>
                      <input className="form-control" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="010xxxxxxx" />
                    </div>
                    <div className="form-group">
                      <label>مد الصلاحية (أيام)</label>
                      <input className="form-control" type="number" min="1" value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} />
                    </div>
                  </div>

                  {/* Add Products Section */}
                  <div style={{ background: 'var(--bg-elevated, #1e1e1e)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-subtle, #333)' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}><i className="fa-solid fa-box-open"></i> إضافة منتجات إلى بيان الأسعار</h4>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="form-control"
                        type="text"
                        placeholder="ابحث باسم المنتج أو البار كود لإضافته..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                      {searchingProducts && <div style={{ position: 'absolute', left: '10px', top: '10px', fontSize: '0.8rem', color: '#888' }}>جاري البحث...</div>}
                      {searchResults.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          right: 0,
                          left: 0,
                          background: 'var(--bg-elevated, #1a1a1a)',
                          border: '1px solid var(--border-color, #444)',
                          borderRadius: '8px',
                          zIndex: 9999,
                          maxHeight: '260px',
                          overflowY: 'auto',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                        }}>
                          {searchResults.map(p => (
                            <div
                              key={p.id}
                              onClick={() => handleAddProductToItems(p)}
                              style={{
                                padding: '10px 14px',
                                borderBottom: '1px solid var(--border-subtle, #333)',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                color: 'var(--text-main, #ffffff)',
                                transition: 'background-color 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover-tile, #2a2a2a)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888888)' }}>{p.productCode || p.barcode || 'بدون كود'}</div>
                              </div>
                              <span style={{ fontWeight: 700, color: 'var(--metro-blue, #3b82f6)', fontSize: '0.9rem' }}>
                                {(Number(p.salePrice) || Number(p.purchasePrice) || 0).toFixed(2)} ج.م
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="data-table" style={{ marginBottom: '20px' }}>
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th style={{ width: '100px' }}>الكمية</th>
                        <th style={{ width: '130px' }}>سعر الوحدة</th>
                        <th style={{ width: '110px' }}>خصم</th>
                        <th>الإجمالي</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', color: '#888' }}>لم يتم إضافة أي منتجات بعد</td></tr>
                      ) : (
                        items.map((item, idx) => {
                          const total = (item.quantity * item.unitPrice) - item.discountAmount;
                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600 }}>{item.productName}</td>
                              <td>
                                <input className="form-control" type="number" step="0.01" min="0.01" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} style={{ padding: '4px 8px', height: '32px' }} />
                              </td>
                              <td>
                                <input className="form-control" type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)} style={{ padding: '4px 8px', height: '32px' }} />
                              </td>
                              <td>
                                <input className="form-control" type="number" step="0.01" min="0" value={item.discountAmount} onChange={(e) => handleItemChange(idx, 'discountAmount', e.target.value)} style={{ padding: '4px 8px', height: '32px' }} />
                              </td>
                              <td style={{ fontWeight: 700 }}>{(total > 0 ? total : 0).toFixed(2)}</td>
                              <td>
                                <button type="button" className="btn btn-icon btn-ghost" onClick={() => handleRemoveItem(idx)} style={{ color: 'var(--rose-red)' }}>
                                  <i className="fa-solid fa-times"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Totals & Notes */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
                    <div className="form-group">
                      <label>ملاحظات وشروط عرض السعر</label>
                      <textarea className="form-control" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="شروط التوريد والدفع..." />
                    </div>
                    <div style={{ background: 'var(--bg-elevated, #1a1a1a)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-subtle, #333)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>المجموع الفرعي:</span>
                        <span>{calculateSubtotal().toFixed(2)} ج.م</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span>الخصم:</span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input className="form-control" type="number" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} style={{ width: '85px', padding: '2px 6px', height: '28px', textAlign: 'center' }} />
                          <select className="form-control" value={discountType} onChange={(e) => setDiscountType(e.target.value)} style={{ width: '55px', padding: '2px', height: '28px', fontSize: '0.8rem' }}>
                            <option value="PERCENTAGE">%</option>
                            <option value="FIXED">ج.م</option>
                          </select>
                        </div>
                      </div>
                      {discountType === 'PERCENTAGE' && Number(discountValue) > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left', marginBottom: '6px' }}>
                          (-{calculateDiscountAmount().toFixed(2)} ج.م)
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span>ضريبة:</span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input className="form-control" type="number" step="0.01" value={taxValue} onChange={(e) => setTaxValue(e.target.value)} style={{ width: '85px', padding: '2px 6px', height: '28px', textAlign: 'center' }} />
                          <select className="form-control" value={taxType} onChange={(e) => setTaxType(e.target.value)} style={{ width: '55px', padding: '2px', height: '28px', fontSize: '0.8rem' }}>
                            <option value="PERCENTAGE">%</option>
                            <option value="FIXED">ج.م</option>
                          </select>
                        </div>
                      </div>
                      {taxType === 'PERCENTAGE' && Number(taxValue) > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left', marginBottom: '6px' }}>
                          (+{calculateTaxAmount().toFixed(2)} ج.م)
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--metro-blue)', paddingTop: '8px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--metro-blue)' }}>
                        <span>الإجمالي الكلي:</span>
                        <span>{calculateGrandTotal().toFixed(2)} ج.م</span>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsFormOpen(false)}>إلغاء</button>
                <button type="submit" form="quotationForm" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ بيان الأسعار'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* Modal: 1-Click Convert to Sale */}
      {isConvertModalOpen && convertQuotation && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setIsConvertModalOpen(false); }}>
            <div className="modal" style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h3>تحويل بيان الأسعار إلى فاتورة مبيعات</h3>
                <button className="modal-close" onClick={() => setIsConvertModalOpen(false)}><i className="fa-solid fa-times"></i></button>
              </div>
              <div className="modal-body">
                <p>سيتم تحويل بيان الأسعار رقم <strong>#{convertQuotation.quotationNumber}</strong> للعميل <strong>{convertQuotation.customerName}</strong> إلى فاتورة مبيعات فعلية وخصم الكميات من المخزن.</p>
                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>المبلغ المدفوع كاش/فيزا الآن (ج.م)</label>
                  <input className="form-control" type="number" step="0.01" value={convertPaidAmount} onChange={(e) => setConvertPaidAmount(e.target.value)} placeholder="0 لسداد آجل بالكامل" />
                  <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>إجمالي الفاتورة: {convertQuotation.grandTotal} ج.م</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsConvertModalOpen(false)}>إلغاء</button>
                <button type="button" className="btn btn-success" onClick={handleConvert} disabled={saving}>
                  {saving ? 'جاري التحويل...' : 'تأكيد التحويل إلى فاتورة'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* Modal: Print A4 Quotation Receipt */}
      {isPrintModalOpen && printQuotation && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setIsPrintModalOpen(false); }}>
            <div className="modal" style={{ maxWidth: '750px', width: '90%' }}>
              <div className="modal-header">
                <h3>معاينة طباعة بيان الأسعار</h3>
                <button className="modal-close" onClick={() => setIsPrintModalOpen(false)}><i className="fa-solid fa-times"></i></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', background: '#fff', color: '#000', padding: '25px', borderRadius: '4px' }}>
                <div ref={printRef}>
                  <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #005a9e', paddingBottom: '10px', marginBottom: '20px' }}>
                    <div>
                      <div className="title" style={{ fontSize: '22px', fontWeight: 'bold', color: '#005a9e' }}>عرض سعر / Price Quotation</div>
                      <div style={{ fontSize: '13px', color: '#666' }}>رقم العرض: {printQuotation.quotationNumber}</div>
                    </div>
                    <div style={{ textAlign: 'left', fontSize: '12px' }}>
                      <div>التاريخ: {new Date(printQuotation.quotationDate).toLocaleDateString('ar-EG')}</div>
                      <div>صالح حتى: {printQuotation.validUntil ? new Date(printQuotation.validUntil).toLocaleDateString('ar-EG') : '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '14px', background: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                    <div><strong>إلى العميل:</strong> {printQuotation.customerName || 'عميل عام'}</div>
                    {printQuotation.customerPhone && <div><strong>الهاتف:</strong> {printQuotation.customerPhone}</div>}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f1f3f5' }}>
                        <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'right' }}>#</th>
                        <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'right' }}>المنتج</th>
                        <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'center' }}>الكمية</th>
                        <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'right' }}>سعر الوحدة</th>
                        <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'right' }}>الخصم</th>
                        <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'right' }}>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(printQuotation.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '8px', fontWeight: 'bold' }}>{item.productName}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'center' }}>{item.quantity} {item.unitName || ''}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>{Number(item.unitPrice).toFixed(2)}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>{Number(item.discountAmount || 0).toFixed(2)}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '8px', fontWeight: 'bold' }}>{Number(item.totalPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ marginLeft: 0, marginRight: 'auto', width: '280px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>المجموع الفرعي:</span> <span>{Number(printQuotation.subtotal || 0).toFixed(2)} ج.م</span></div>
                    {Number(printQuotation.discountAmount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'red' }}><span>الخصم:</span> <span>-{Number(printQuotation.discountAmount).toFixed(2)} ج.م</span></div>}
                    {Number(printQuotation.taxAmount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>الضريبة:</span> <span>+{Number(printQuotation.taxAmount).toFixed(2)} ج.م</span></div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #005a9e', fontWeight: 'bold', fontSize: '16px', color: '#005a9e' }}>
                      <span>الإجمالي الكلي:</span> <span>{Number(printQuotation.grandTotal || 0).toFixed(2)} ج.م</span>
                    </div>
                  </div>

                  {printQuotation.notes && (
                    <div style={{ marginTop: '25px', fontSize: '12px', color: '#555', background: '#f8f9fa', padding: '10px', borderRadius: '4px', borderRight: '3px solid #005a9e' }}>
                      <strong>الشروط والملاحظات:</strong>
                      <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{printQuotation.notes}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsPrintModalOpen(false)}>إغلاق</button>
                <button type="button" className="btn btn-primary" onClick={triggerBrowserPrint}>
                  <i className="fa-solid fa-print"></i> طباعة A4
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default PriceQuotations;
