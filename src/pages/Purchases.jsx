import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useSearchParams, Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useBranch } from '../context/BranchContext';
import '../styles/pages/PurchasesPremium.css';

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
    <div className="pur-custom-select-container" ref={containerRef}>
      <div 
        className={`pur-custom-select-header ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} arrow-icon`}></i>
        <span className="selected-text">{selectedOption?.label}</span>
        {icon && <span className="select-icon">{icon}</span>}
      </div>
      
      {isOpen && (
        <>
          <div className="pur-custom-select-overlay" onClick={() => setIsOpen(false)} />
          <div className="pur-custom-select-dropdown">
            {options.map((opt) => (
              <div 
                key={opt.value} 
                className={`pur-custom-select-option ${value === opt.value ? 'active' : ''}`}
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

const Purchases = () => {
  const { toast } = useGlobalUI();
  const { supplierName } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();
  
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState(supplierName || '');
  const [debouncedSearch, setDebouncedSearch] = useState(supplierName || '');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;
  
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [modalType, setModalType] = useState(null);
  const [activePurchase, setActivePurchase] = useState(null);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState({
    supplierId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    paidAmount: 0
  });
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [formSelectedBranchId, setFormSelectedBranchId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  const [itemForm, setItemForm] = useState({
    productId: '',
    unitId: '',
    quantity: 1,
    unitPrice: 0
  });
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    const user = Api._getUser();
    const branchFromUrl = searchParams.get('branchId');
    if (branchFromUrl) setSelectedBranchId(branchFromUrl);
    else if (globalBranchId) setSelectedBranchId(globalBranchId);
    else if (user && user.branchId) setSelectedBranchId(user.branchId);

    if (contextBranches && contextBranches.length > 0) {
      setBranches(contextBranches);
      setAvailableBranches(contextBranches);
    }
  }, [location.search, globalBranchId, contextBranches]);

  const loadData = async (page = 0, size = 10, query = debouncedSearch, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const res = await Api.getPurchases(page, size, query, branchId);
      const itemsArray = res.items || res.content || (Array.isArray(res) ? res : []);
      setData(itemsArray);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalItems || res.totalElements || 0);
      setCurrentPage(res.currentPage ?? res.number ?? 0);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (branchId = selectedBranchId) => {
    setLoadingAnalytics(true);
    try {
      const res = await Api.getPurchaseAnalytics(branchId);
      setAnalytics(res);
    } catch (err) {
      console.error('Failed to load purchase analytics', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    loadData(currentPage, pageSize, debouncedSearch, selectedBranchId);
    if (currentPage === 0 && !debouncedSearch) {
      loadAnalytics(selectedBranchId);
    }
  }, [currentPage, debouncedSearch, selectedBranchId]);

  const openForm = async () => {
    try {
      const user = Api._getUser();
      const initialBranchId = selectedBranchId || user?.branchId || '';
      setFormSelectedBranchId(initialBranchId);

      const [sups, prods] = await Promise.all([
        Api.getSuppliers(0, 1000, '', '', initialBranchId), 
        Api.getProductsPaged(0, 1000, '', '', initialBranchId)
      ]);
      
      const supsArray = Array.isArray(sups) ? sups : (sups.items || sups.content || sups);
      const prodsArray = Array.isArray(prods) ? prods : (prods.items || prods.content || prods);

      setSuppliers(supsArray);
      setProducts(prodsArray);

      if (initialBranchId) {
        const whs = await Api.getWarehousesByBranch(initialBranchId);
        setWarehouses(whs);
        if (whs.length > 0) setSelectedWarehouseId(whs[0].id);
      } else {
        setWarehouses([]);
        setSelectedWarehouseId('');
      }

      setInvoiceForm({ supplierId: '', invoiceDate: new Date().toISOString().split('T')[0], paidAmount: 0 });
      setInvoiceItems([]);
      setItemForm({ productId: '', unitId: '', quantity: 1, unitPrice: 0 });
      setAvailableUnits([]);
      setModalType('form');
    } catch (err) {
      toast('فشل في جلب البيانات الأساسية', 'error');
    }
  };

  const handleBranchChange = async (branchId) => {
    setFormSelectedBranchId(branchId);
    if (branchId) {
      try {
        const whs = await Api.getWarehousesByBranch(branchId);
        setWarehouses(whs);
        if (whs.length > 0) setSelectedWarehouseId(whs[0].id);
        else setSelectedWarehouseId('');

        const [sups, prods] = await Promise.all([
          Api.getSuppliers(0, 1000, '', '', branchId), 
          Api.getProductsPaged(0, 1000, '', '', branchId)
        ]);
        setSuppliers(Array.isArray(sups) ? sups : (sups.items || sups.content || sups));
        setProducts(Array.isArray(prods) ? prods : (prods.items || prods.content || prods));

      } catch {
        setWarehouses([]);
        setSelectedWarehouseId('');
      }
    } else {
      setWarehouses([]);
      setSelectedWarehouseId('');
    }
  };

  const openPayment = (purchase) => {
    setActivePurchase(purchase);
    setPaymentAmount(purchase.remainingAmount);
    setModalType('payment');
  };

  const openDetails = (purchase) => {
    setActivePurchase(purchase);
    setModalType('details');
  };

  const closeModal = () => {
    setModalType(null);
    setActivePurchase(null);
  };

  const handleProductChange = async (productId) => {
    const prod = products.find(p => p.id == productId);
    if (!productId || !prod) {
      setItemForm({ productId: '', unitId: '', quantity: 1, unitPrice: 0 });
      setAvailableUnits([]);
      return;
    }

    setItemForm(prev => ({ ...prev, productId, unitId: '', unitPrice: prod.purchasePrice || 0 }));

    setLoadingUnits(true);
    try {
      const units = await Api.getProductUnits(productId);
      setAvailableUnits(units || []);

      const defaultUnit = units?.find(u => u.isDefaultPurchase);
      if (defaultUnit) {
        setItemForm(prev => ({
          ...prev,
          productId,
          unitId: defaultUnit.id,
          unitPrice: defaultUnit.purchasePrice || prod.purchasePrice || 0
        }));
      }
    } catch {
      setAvailableUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleUnitChange = (unitId) => {
    if (!unitId) {
      const prod = products.find(p => p.id == itemForm.productId);
      setItemForm(prev => ({ ...prev, unitId: '', unitPrice: prod?.purchasePrice || 0 }));
      return;
    }
    const unit = availableUnits.find(u => u.id == unitId);
    setItemForm(prev => ({
      ...prev,
      unitId,
      unitPrice: unit?.purchasePrice || prev.unitPrice
    }));
  };

  const handleAddItem = () => {
    if (!itemForm.productId) { toast('يرجى اختيار المنتج', 'warning'); return; }
    const qty = parseFloat(itemForm.quantity);
    const price = parseFloat(itemForm.unitPrice);
    if (isNaN(qty) || qty <= 0) { toast('الكمية غير صحيحة', 'warning'); return; }
    if (isNaN(price) || price < 0) { toast('السعر غير صحيح', 'warning'); return; }

    const product = products.find(p => p.id == itemForm.productId);
    const unit = availableUnits.find(u => u.id == itemForm.unitId);
    const factor = unit ? parseFloat(unit.conversionFactor) : 1;
    const qtyInBase = qty * factor;

    const unitLabel = unit
      ? `${unit.unitName} (تحتوي على ${unit.conversionFactor} ${product?.unitName || 'قطعة'})`
      : (product?.unitName || 'الوحدة الأساسية');

    setInvoiceItems(prev => [...prev, {
      productId: parseInt(itemForm.productId),
      unitId: itemForm.unitId ? parseInt(itemForm.unitId) : null,
      name: product?.name,
      unitLabel,
      unitName: product?.unitName || 'قطعة',
      quantity: qty,
      factor,
      qtyInBase,
      unitPrice: price,
      totalPrice: qtyInBase * price
    }]);

    setItemForm(prev => ({ ...prev, quantity: 1 }));
  };

  const handleRemoveItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.supplierId) { toast('يرجى اختيار المورد', 'warning'); return; }
    if (invoiceItems.length === 0) { toast('يجب إضافة منتج واحد على الأقل', 'warning'); return; }

    if (!formSelectedBranchId || !selectedWarehouseId) {
      toast('يرجى اختيار الفرع والمخزن', 'warning');
      return;
    }

    setSaving(true);
    const payload = {
      supplierId: parseInt(invoiceForm.supplierId),
      branchId: parseInt(formSelectedBranchId),
      warehouseId: parseInt(selectedWarehouseId),
      invoiceDate: new Date(invoiceForm.invoiceDate).toISOString(),
      paidAmount: parseFloat(invoiceForm.paidAmount) || 0,
      items: invoiceItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitId: item.unitId || null
      }))
    };

    try {
      await Api.createPurchase(payload);
      toast('تم إضافة الفاتورة بنجاح', 'success');
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    const remaining = Number(activePurchase.remainingAmount);
    if (!amount || amount <= 0 || amount > remaining) {
      toast('يرجى إدخال مبلغ صحيح لا يتجاوز المتبقي', 'warning');
      return;
    }
    setSaving(true);
    try {
      await Api.payPurchaseInvoice(activePurchase.id, amount);
      toast('تم تسجيل الدفعة بنجاح', 'success');
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const invoiceTotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="purchases-page-container">
      {/* HEADER SECTION */}
      <div className="pur-header-container">
        <div className="pur-breadcrumbs">
          <Link to="/">الرئيسية</Link>
          <span>/</span>
          <span>المشتريات</span>
        </div>
        <div className="pur-header-row">
          <h1>المشتريات</h1>
          <div className="pur-header-actions">
            <button className="pur-btn-primary" onClick={openForm}>
              <span>فاتورة جديدة</span>
              <i className="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </div>

      {/* ANALYTICS SECTION */}
      {!loadingAnalytics && analytics && (
        <div className="pur-analytics-grid">
          <div className="pur-analytics-card">
            <div className="pur-card-header">
              <i className="fas fa-chart-pie"></i>
              <h3>توزيع المديونيات</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ width: '200px', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={['PAID', 'PARTIAL', 'UNPAID'].map(status => {
                        const stat = analytics.statusStats.find(s => s.status === status) || { count: 0, totalAmount: 0 };
                        return {
                          name: status === 'PAID' ? 'مدفوع' : status === 'PARTIAL' ? 'جزئي' : 'غير مدفوع',
                          value: Number(stat.totalAmount) || 0,
                          color: status === 'PAID' ? '#10b981' : status === 'PARTIAL' ? '#f59e0b' : '#f43f5e'
                        };
                      }).filter(d => d.value > 0)}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value"
                    >
                      {['PAID', 'PARTIAL', 'UNPAID'].map((status, index) => (
                        <Cell key={`cell-${index}`} fill={status === 'PAID' ? '#10b981' : status === 'PARTIAL' ? '#f59e0b' : '#f43f5e'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--pur-card-bg)', border: '1px solid var(--pur-glass-border)', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="pur-kpi-list" style={{ flex: 1, minWidth: '200px' }}>
                {['PAID', 'PARTIAL', 'UNPAID'].map(status => {
                  const stat = analytics.statusStats.find(s => s.status === status) || { count: 0, totalAmount: 0 };
                  const label = status === 'PAID' ? 'مدفوعة بالكامل' : status === 'PARTIAL' ? 'مدفوعة جزئياً' : 'غير مدفوعة';
                  const color = status === 'PAID' ? '#10b981' : status === 'PARTIAL' ? '#f59e0b' : '#f43f5e';
                  return (
                    <div key={status} className="pur-kpi-item">
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--pur-text-secondary)' }}>{label}</div>
                        <div style={{ fontWeight: 800 }}>{Number(stat.totalAmount).toLocaleString()} ج.م</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pur-analytics-card">
            <div className="pur-card-header">
              <i className="fas fa-chart-line"></i>
              <h3>أهم الموردين</h3>
            </div>
            <div className="pur-kpi-list">
              {analytics.topSuppliers.length > 0 ? (
                analytics.topSuppliers.slice(0, 4).map((sup, idx) => {
                  const maxVal = analytics.topSuppliers[0].totalAmount || 1;
                  const percent = (sup.totalAmount / maxVal) * 100;
                  return (
                    <div key={idx} className="pur-kpi-item">
                      <div className="pur-kpi-bar-container">
                        <div className="pur-kpi-label-row">
                          <span style={{ fontWeight: 700 }}>{sup.name}</span>
                          <span>{Number(sup.totalAmount).toLocaleString()} ج.م</span>
                        </div>
                        <div className="pur-kpi-bar">
                          <div className="pur-kpi-fill" style={{ width: `${percent}%`, background: `linear-gradient(90deg, var(--pur-primary), ${idx % 2 === 0 ? '#10b981' : '#6366f1'})` }} />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : <Loader message="لا توجد بيانات" />}
            </div>
          </div>
        </div>
      )}

      {/* TREND CHART */}
      {!loadingAnalytics && analytics && (
        <div className="pur-analytics-card" style={{ marginBottom: '32px' }}>
          <div className="pur-card-header">
            <i className="fas fa-history"></i>
            <h3>المشتريات اليومية (آخر 30 يوم)</h3>
          </div>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics.dailyTrend.map(d => ({
                date: new Date(d.statDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
                total: d.totalPurchases
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--pur-glass-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--pur-text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--pur-text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--pur-card-bg)', border: '1px solid var(--pur-glass-border)', borderRadius: '12px' }} />
                <Bar dataKey="total" fill="var(--pur-primary)" radius={[6, 6, 0, 0]} barSize={25} opacity={0.6} />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* MAIN DATA CARD */}
      <div className="pur-main-card">
        <div className="pur-toolbar">
          <div className="pur-toolbar-left">
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

          <div className="pur-toolbar-right">
            <div className="pur-search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="رقم الفاتورة أو المورد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="pur-table-wrapper">
          {loading ? (
            <Loader message="جاري جلب الفواتير..." />
          ) : data.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <i className="fas fa-shopping-cart" style={{ fontSize: '3rem', color: 'var(--pur-text-secondary)', marginBottom: '16px', display: 'block' }}></i>
              <h3 style={{ color: 'var(--pur-text-primary)' }}>لا توجد فواتير حالياً</h3>
            </div>
          ) : (
            <table className="pur-table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>المورد</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th style={{ textAlign: 'center' }}>الحالة</th>
                  <th style={{ textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td><span className="pur-invoice-code" onClick={() => openDetails(p)}>{p.invoiceNumber || '—'}</span></td>
                    <td>{p.invoiceDate ? new Date(p.invoiceDate).toLocaleDateString('ar-EG') : '—'}</td>
                    <td style={{ fontWeight: 800, color: 'var(--pur-primary)' }}>{p.supplierName}</td>
                    <td style={{ fontWeight: 800 }}>{Number(p.totalAmount).toLocaleString()}</td>
                    <td style={{ color: 'var(--pur-accent-emerald)' }}>{Number(p.paidAmount).toLocaleString()}</td>
                    <td style={{ color: 'var(--pur-accent-rose)' }}>{Number(p.remainingAmount).toLocaleString()}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`pur-badge ${p.status === 'PAID' ? 'pur-badge-paid' : p.status === 'PARTIAL' ? 'pur-badge-partial' : 'pur-badge-unpaid'}`}>
                        <i className={`fas fa-${p.status === 'PAID' ? 'check-circle' : p.status === 'PARTIAL' ? 'clock' : 'exclamation-circle'}`}></i>
                        {p.status === 'PAID' ? 'مدفوعة' : p.status === 'PARTIAL' ? 'جزئي' : 'غير مدفوعة'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="pur-action-btn" onClick={() => openDetails(p)} title="التفاصيل">
                          <i className="fas fa-eye"></i>
                        </button>
                        {p.status !== 'PAID' && (
                          <button className="pur-action-btn" style={{ color: 'var(--pur-accent-emerald)' }} onClick={() => openPayment(p)} title="تسديد دفعة">
                            <i className="fas fa-hand-holding-usd"></i>
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
          <div className="pur-pagination">
            <div style={{ color: 'var(--pur-text-secondary)', fontSize: '0.9rem' }}>
              عرض صفحة {currentPage + 1} من {totalPages}
            </div>
            <div className="pur-page-buttons">
              <button className="pur-page-btn" disabled={currentPage === 0} onClick={() => setCurrentPage(prev => prev - 1)}>
                <i className="fas fa-chevron-right"></i>
              </button>
              <button className="pur-page-btn active">{currentPage + 1}</button>
              <button className="pur-page-btn" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(prev => prev + 1)}>
                <i className="fas fa-chevron-left"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {modalType === 'form' && (
        <ModalContainer>
          <div className="prd-modal-overlay active" onClick={(e) => { if (e.target.classList.contains('prd-modal-overlay')) closeModal(); }}>
            <div className="prd-modal" style={{ maxWidth: '900px' }}>
              <div className="prd-card-title-row" style={{ padding: '24px 24px 0' }}>
                <h3 className="prd-card-title">إنشاء فاتورة مشتريات جديدة</h3>
                <button className="prd-modal-close" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSaveInvoice}>
                <div className="prd-modal-body">
                  <div className="prd-form-row">
                    <div className="prd-form-group">
                      <label className="prd-label">الفرع *</label>
                      <select className="prd-input" value={formSelectedBranchId} onChange={(e) => handleBranchChange(e.target.value)} required>
                        <option value="">-- اختر الفرع --</option>
                        {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="prd-form-group">
                      <label className="prd-label">المخزن *</label>
                      <select className="prd-input" value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)} required>
                        <option value="">-- اختر المخزن --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="prd-form-row">
                    <div className="prd-form-group">
                      <label className="prd-label">المورد *</label>
                      <select className="prd-input" value={invoiceForm.supplierId} onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierId: e.target.value })} required>
                        <option value="">-- اختر المورد --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="prd-form-group">
                      <label className="prd-label">التاريخ *</label>
                      <input className="prd-input" type="date" value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} required />
                    </div>
                    <div className="prd-form-group">
                      <label className="prd-label">المدفوع الآن</label>
                      <input className="prd-input" type="number" step="0.01" value={invoiceForm.paidAmount} onChange={(e) => setInvoiceForm({ ...invoiceForm, paidAmount: e.target.value })} />
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', padding: '20px', background: 'var(--pur-bg-dark)', borderRadius: '16px' }}>
                    <h4 style={{ marginBottom: '15px', color: 'var(--pur-primary)' }}>📦 إضافة منتجات</h4>
                    <div className="prd-form-row" style={{ alignItems: 'flex-end' }}>
                      <div className="prd-form-group" style={{ flex: 2 }}>
                        <label className="prd-label">المنتج</label>
                        <select className="prd-input" value={itemForm.productId} onChange={(e) => handleProductChange(e.target.value)}>
                          <option value="">-- اختر المنتج --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="prd-form-group" style={{ flex: 1.5 }}>
                        <label className="prd-label">الوحدة</label>
                        <select className="prd-input" value={itemForm.unitId} onChange={(e) => handleUnitChange(e.target.value)}>
                          <option value="">الوحدة الأساسية</option>
                          {availableUnits.map(u => <option key={u.id} value={u.id}>{u.unitName}</option>)}
                        </select>
                      </div>
                      <div className="prd-form-group" style={{ flex: 0.8 }}>
                        <label className="prd-label">الكمية</label>
                        <input className="prd-input" type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                      </div>
                      <div className="prd-form-group" style={{ flex: 1 }}>
                        <label className="prd-label">السعر</label>
                        <input className="prd-input" type="number" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })} />
                      </div>
                      <button type="button" className="pur-btn-primary" style={{ padding: '12px' }} onClick={handleAddItem}>
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>

                    {invoiceItems.length > 0 && (
                      <div className="pur-table-wrapper" style={{ marginTop: '20px', maxHeight: '200px' }}>
                        <table className="pur-table" style={{ minWidth: '0' }}>
                          <thead>
                            <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th><th></th></tr>
                          </thead>
                          <tbody>
                            {invoiceItems.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.name} <br/><small style={{ color: 'var(--pur-text-secondary)' }}>{item.unitLabel}</small></td>
                                <td>{item.quantity}</td>
                                <td>{Number(item.unitPrice).toLocaleString()}</td>
                                <td style={{ fontWeight: 800 }}>{Number(item.totalPrice).toLocaleString()}</td>
                                <td><button type="button" className="pur-action-btn" style={{ color: 'var(--pur-accent-rose)' }} onClick={() => handleRemoveItem(idx)}><i className="fas fa-times"></i></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                <div className="prd-modal-footer">
                  <div style={{ flex: 1, fontSize: '1.2rem', fontWeight: 800, color: 'var(--pur-accent-emerald)' }}>
                    الإجمالي: {invoiceTotal.toLocaleString()} ج.م
                  </div>
                  <button type="button" className="pur-btn-ghost" onClick={closeModal}>إلغاء</button>
                  <button type="submit" className="pur-btn-primary" disabled={saving}>
                    <span>{saving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}</span>
                    <i className="fas fa-save"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}

      {modalType === 'payment' && (
        <ModalContainer>
          <div className="prd-modal-overlay active" onClick={closeModal}>
            <div className="prd-modal" style={{ maxWidth: '500px' }}>
              <div className="prd-card-title-row" style={{ padding: '24px 24px 0' }}>
                <h3 className="prd-card-title">تسديد دفعة: {activePurchase?.invoiceNumber}</h3>
                <button className="prd-modal-close" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSavePayment}>
                <div className="prd-modal-body">
                  <div className="pur-analytics-card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--pur-accent-rose)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--pur-text-secondary)' }}>المبلغ المتبقي</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--pur-accent-rose)' }}>{Number(activePurchase?.remainingAmount).toLocaleString()} ج.م</div>
                  </div>
                  <div className="prd-form-group">
                    <label className="prd-label">مبلغ التحصيل</label>
                    <input className="prd-input" type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
                  </div>
                </div>
                <div className="prd-modal-footer">
                  <button type="button" className="pur-btn-ghost" onClick={closeModal}>إلغاء</button>
                  <button type="submit" className="pur-btn-primary" disabled={saving}>
                    <span>تأكيد الدفع</span>
                    <i className="fas fa-check"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}

      {modalType === 'details' && (
        <ModalContainer>
          <div className="prd-modal-overlay active" onClick={closeModal}>
            <div className="prd-modal" style={{ maxWidth: '700px' }}>
              <div className="prd-card-title-row" style={{ padding: '24px 24px 0' }}>
                <h3 className="prd-card-title">تفاصيل الفاتورة: {activePurchase?.invoiceNumber}</h3>
                <button className="prd-modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="prd-modal-body">
                <div className="pur-analytics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '24px' }}>
                  <div className="pur-analytics-card" style={{ padding: '15px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--pur-text-secondary)' }}>الإجمالي</div>
                    <div style={{ fontWeight: 800 }}>{Number(activePurchase?.totalAmount).toLocaleString()}</div>
                  </div>
                  <div className="pur-analytics-card" style={{ padding: '15px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--pur-text-secondary)' }}>المدفوع</div>
                    <div style={{ fontWeight: 800, color: 'var(--pur-accent-emerald)' }}>{Number(activePurchase?.paidAmount).toLocaleString()}</div>
                  </div>
                  <div className="pur-analytics-card" style={{ padding: '15px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--pur-text-secondary)' }}>المتبقي</div>
                    <div style={{ fontWeight: 800, color: 'var(--pur-accent-rose)' }}>{Number(activePurchase?.remainingAmount).toLocaleString()}</div>
                  </div>
                </div>
                <div className="pur-table-wrapper">
                  <table className="pur-table" style={{ minWidth: '0' }}>
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>سعر الوحدة</th>
                        <th>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePurchase.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.productName}</td>
                          <td>{item.quantity} {item.unitName}</td>
                          <td>{item.unitPrice.toFixed(2)}</td>
                          <td style={{ fontWeight: 600 }}>{item.totalPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <td colSpan="3" style={{ textAlign: 'left' }}>إجمالي الفاتورة:</td>
                        <td style={{ fontWeight: 800, fontSize: '1.1rem' }}>{Number(activePurchase.totalAmount).toFixed(2)} ج.م</td>
                      </tr>
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'left' }}>المدفوع:</td>
                        <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{Number(activePurchase.paidAmount).toFixed(2)} ج.م</td>
                      </tr>
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'left' }}>المتبقي:</td>
                        <td style={{ color: 'var(--metro-red)', fontWeight: 800 }}>{Number(activePurchase.remainingAmount).toFixed(2)} ج.م</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>إغلاق</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Purchases;
