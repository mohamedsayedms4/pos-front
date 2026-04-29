import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useSearchParams } from 'react-router-dom';
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
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useBranch } from '../context/BranchContext';

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
  
  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modal State
  const [modalType, setModalType] = useState(null); // 'form', 'payment', 'details'
  const [activePurchase, setActivePurchase] = useState(null);

  // Form State (New Invoice)
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

  // Item form — includes unit selection
  const [itemForm, setItemForm] = useState({
    productId: '',
    unitId: '',       // '' = base unit
    quantity: 1,
    unitPrice: 0
  });
  const [availableUnits, setAvailableUnits] = useState([]); // units of selected product
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState('');

  // ─── Data Loading ─────────────────────────────────────────────────────────
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
      setAvailableBranches(contextBranches);
    }
  }, [location.search, globalBranchId, contextBranches]);

  const loadData = async (page = 0, size = 10, query = debouncedSearch, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const res = await Api.getPurchases(page, size, query, branchId);
      // Support both PaginatedResponse and direct content
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

  useEffect(() => {
    if (supplierName) {
      setSearchTerm(supplierName);
      setDebouncedSearch(supplierName);
    }
  }, [supplierName]);

  // ─── Form Open ────────────────────────────────────────────────────────────
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

        // Reload suppliers and products for the new branch
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

  // ─── Product Selection → load units ───────────────────────────────────────
  const handleProductChange = async (productId) => {
    const prod = products.find(p => p.id == productId);
    if (!productId || !prod) {
      setItemForm({ productId: '', unitId: '', quantity: 1, unitPrice: 0 });
      setAvailableUnits([]);
      return;
    }

    setItemForm(prev => ({ ...prev, productId, unitId: '', unitPrice: prod.purchasePrice || 0 }));

    // Fetch units for this product
    setLoadingUnits(true);
    try {
      const units = await Api.getProductUnits(productId);
      setAvailableUnits(units || []);

      // Auto-select default purchase unit
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

  // ─── Unit Selection → update price ────────────────────────────────────────
  const handleUnitChange = (unitId) => {
    if (!unitId) {
      // Base unit selected
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

  // ─── Add Item to Invoice ───────────────────────────────────────────────────
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
      packagingDesc: unit ? `1 ${unit.unitName} = ${unit.conversionFactor} ${product?.unitName || 'قطعة'}` : 'قطاعي',
      quantity: qty,
      factor,
      qtyInBase,
      unitPrice: price,
      totalPrice: qtyInBase * price
    }]);

    // Reset item form but keep product for quick multi-unit entry
    setItemForm(prev => ({ ...prev, quantity: 1 }));
  };

  const handleRemoveItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Save Invoice ──────────────────────────────────────────────────────────
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.supplierId) { toast('يرجى اختيار المورد', 'warning'); return; }
    if (invoiceItems.length === 0) { toast('يجب إضافة منتج واحد على الأقل', 'warning'); return; }

    if (!formSelectedBranchId || !selectedWarehouseId) {
      toast('يرجى اختيار الفرع والمخزن', 'warning');
      setSaving(false);
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

  // ─── Save Payment ──────────────────────────────────────────────────────────
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
  const items = data;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="page-section" style={{ direction: 'rtl' }}>
        {/* Analytics Dashboard */}
        {!loadingAnalytics && analytics && (
          <div className="analytics-section" style={{ marginBottom: '24px' }}>
            <div className="analytics-dashboard-grid">
              {/* Status Distribution - Circular Chart */}
              <div className="card" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📊</span>
                  <h4 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>توزيع المديونيات</h4>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                  <div style={{ width: '180px', height: '180px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <PieChart>
                        <Pie
                          data={['PAID', 'PARTIAL', 'UNPAID'].map(status => {
                            const stat = analytics.statusStats.find(s => s.status === status) || { count: 0, totalAmount: 0 };
                            return {
                              name: status === 'PAID' ? 'مدفوع' : status === 'PARTIAL' ? 'جزئي' : 'غير مدفوع',
                              value: Number(stat.totalAmount) || 0,
                              count: stat.count,
                              color: status === 'PAID' ? '#10b981' : status === 'PARTIAL' ? '#f59e0b' : '#f43f5e'
                            };
                          }).filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {['PAID', 'PARTIAL', 'UNPAID'].map((status, index) => {
                            const color = status === 'PAID' ? '#10b981' : status === 'PARTIAL' ? '#f59e0b' : '#f43f5e';
                            return <Cell key={`cell-${index}`} fill={color} stroke="none" />;
                          })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                          formatter={(value) => [`${value.toLocaleString()} ج.م`, 'الإجمالي']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', minWidth: '150px' }}>
                    {['PAID', 'PARTIAL', 'UNPAID'].map(status => {
                      const stat = analytics.statusStats.find(s => s.status === status) || { count: 0, totalAmount: 0 };
                      const config = {
                        PAID: { label: 'مدفوعة بالكامل', color: '#10b981' },
                        PARTIAL: { label: 'مدفوعة جزئياً', color: '#f59e0b' },
                        UNPAID: { label: 'غير مدفوعة', color: '#f43f5e' }
                      }[status];
                      const totalAll = analytics.statusStats.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                      const percent = totalAll > 0 ? ((stat.totalAmount / totalAll) * 100).toFixed(1) : 0;

                      return (
                        <div key={status} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: config.color, marginTop: '4px' }} />
                          <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                              {config.label}
                              <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{percent}%</span>
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{Number(stat.totalAmount).toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top Suppliers Card */}
              <div className="card" style={{ margin: 0, padding: '15px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🏆</span>
                  <h4 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>أهم الموردين</h4>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analytics.topSuppliers.length > 0 ? (
                    analytics.topSuppliers.slice(0, 3).map((sup, idx) => {
                      const maxVal = analytics.topSuppliers[0].totalAmount || 1;
                      const percent = (sup.totalAmount / maxVal) * 100;
                      return (
                        <div key={idx} style={{ position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ 
                                width: '18px', height: '18px', borderRadius: '50%', 
                                background: idx === 0 ? 'var(--metro-yellow)' : idx === 1 ? '#C0C0C0' : '#CD7F32',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '10px', fontWeight: 800
                              }}>{idx + 1}</span>
                              <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-light)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sup.name}</span>
                            </div>
                            <span style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.85rem' }}>{Number(sup.totalAmount).toLocaleString()}</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: 'var(--metro-blue)', transition: 'width 1s ease-out' }} />
                          </div>
                        </div>
                      );
                    })
                  ) : <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dim)', padding: '10px' }}>لا توجد بيانات</div>}
                </div>
              </div>
            </div>

            {/* Daily Trend Chart */}
            <div className="card" style={{ padding: '15px' }}>
              <div className="card-header" style={{ padding: '0 0 10px 0', border: 'none' }}>
                <h4 style={{ fontSize: '0.9rem', margin: 0 }}>📈 إجمالي المشتريات اليومية (أخر 30 يوم)</h4>
              </div>
              <div style={{ height: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <ComposedChart data={analytics.dailyTrend.map(d => ({
                    date: new Date(d.statDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
                    total: d.totalPurchases
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#777', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#777', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val) => [`${Number(val).toLocaleString()} ج.م`, 'إجمالي الشراء']}
                    />
                    <Bar dataKey="total" fill="var(--metro-blue)" radius={[4, 4, 0, 0]} barSize={30} opacity={0.8} />
                    <Line type="monotone" dataKey="total" stroke="var(--accent-emerald)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3>🛒 إدارة المشتريات</h3>
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
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="بحث برقم الفاتورة أو المورد..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(0);
                  }}
                />
              </div>
              <button className="btn btn-primary" onClick={openForm}>
                <span>+</span> إضافة فاتورة
              </button>
            </div>
          </div>
          <div className="card-body no-padding">
            <div className="table-wrapper">
              {loading ? (
                <Loader message="جاري تحميل فواتير المشتريات..." />
              ) : items.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🛒</div>
                  <h4>لا توجد فواتير مشتريات</h4>
                  <p>قم بإضافة فواتير جديدة من الموردين</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>رقم الفاتورة</th>
                      <th>التاريخ</th>
                      <th>المورد</th>
                      <th>الإجمالي</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                      <th>الحالة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p, i) => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                          {(currentPage * pageSize) + i + 1}
                        </td>
                        <td>
                          <code
                            title="اضغط لعرض التفاصيل"
                            style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', color: 'var(--metro-blue)' }}
                            onClick={() => openDetails(p)}
                          >
                            {p.invoiceNumber || '—'}
                          </code>
                        </td>
                        <td>{p.invoiceDate ? new Date(p.invoiceDate).toLocaleDateString('ar-EG') : '—'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--metro-blue)' }}>{p.supplierName}</td>
                        <td style={{ fontWeight: 600 }}>{Number(p.totalAmount).toFixed(2)}</td>
                        <td style={{ color: 'var(--accent-emerald)' }}>{Number(p.paidAmount).toFixed(2)}</td>
                        <td style={{ color: 'var(--metro-red)' }}>{Number(p.remainingAmount).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${p.status === 'PAID' ? 'badge-success' : p.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>
                            {p.status === 'PAID' ? 'مدفوعة' : p.status === 'PARTIAL' ? 'جزئي' : 'غير مدفوعة'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-icon btn-ghost" title="تفاصيل الفاتورة" onClick={() => openDetails(p)}>👁️</button>
                            {p.status !== 'PAID' && (
                              <button className="btn btn-icon btn-ghost" title="تسديد دفعة" onClick={() => openPayment(p)}>💰</button>
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
      </div>

      {/* ═══ Modal: New Invoice ═══════════════════════════════════════════════ */}
      {modalType === 'form' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '860px' }}>
              <div className="modal-header">
                <h3>إنشاء فاتورة مشتريات جديدة</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="purchaseForm" onSubmit={handleSaveInvoice}>

                  <div className="form-row">
                    <div className="form-group">
                      <label>الفرع *</label>
                      <select 
                        className="form-control" 
                        value={formSelectedBranchId} 
                        onChange={(e) => handleBranchChange(e.target.value)}
                        disabled={!Api.can('ROLE_ADMIN')}
                        required
                      >
                        <option value="">-- اختر الفرع --</option>
                        {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>المخزن (المستلم) *</label>
                      <select 
                        className="form-control" 
                        value={selectedWarehouseId} 
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        required
                      >
                        <option value="">-- اختر المخزن --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Header fields */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>المورد *</label>
                      <select
                        className="form-control"
                        value={invoiceForm.supplierId}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierId: e.target.value })}
                        required
                      >
                        <option value="">-- اختر المورد --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>تاريخ الفاتورة *</label>
                      <input
                        className="form-control"
                        type="date"
                        value={invoiceForm.invoiceDate}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>المبلغ المدفوع الآن</label>
                      <input
                        className="form-control"
                        type="number"
                        step="0.01"
                        min="0"
                        value={invoiceForm.paidAmount}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, paidAmount: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Items section */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <h4 style={{ marginBottom: '15px' }}>📦 إضافة منتجات للفاتورة</h4>

                    {/* Item add row */}
                    <div className="form-row" style={{ alignItems: 'flex-end', gap: '10px' }}>

                      {/* Product */}
                      <div className="form-group" style={{ flex: 2 }}>
                        <label>المنتج</label>
                        <select
                          className="form-control"
                          value={itemForm.productId}
                          onChange={(e) => handleProductChange(e.target.value)}
                        >
                          <option value="">-- اختر --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (مخزون: {p.stock} {p.unitName})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Unit */}
                      <div className="form-group" style={{ flex: 1.5 }}>
                        <label>وحدة الاستلام</label>
                        <select
                          className="form-control"
                          value={itemForm.unitId}
                          onChange={(e) => handleUnitChange(e.target.value)}
                          disabled={!itemForm.productId || loadingUnits}
                        >
                          {/* Base unit option */}
                          {itemForm.productId && (() => {
                            const prod = products.find(p => p.id == itemForm.productId);
                            return <option value="">{prod?.unitName || 'الوحدة الأساسية'} (مفردة/قطاعي)</option>;
                          })()}
                          {availableUnits.map(u => {
                            const prod = products.find(p => p.id == itemForm.productId);
                            return (
                              <option key={u.id} value={u.id}>
                                {u.unitName} (تحتوي على {u.conversionFactor} {prod?.unitName || 'قطعة'})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="form-group" style={{ flex: 0.8 }}>
                        <label>الكمية</label>
                        <input
                          className="form-control"
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={itemForm.quantity}
                          onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                        />
                      </div>

                      {/* Price */}
                      <div className="form-group" style={{ flex: 1.2 }}>
                        <label>سعر القطعة *</label>
                        <input
                          className="form-control"
                          type="number"
                          step="0.01"
                          min="0"
                          value={itemForm.unitPrice}
                          onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                        />
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>سعر الوحدة الأساسية</small>
                      </div>

                      <div className="form-group" style={{ flex: 'none' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleAddItem}
                          style={{ marginTop: '22px' }}
                        >
                          + إضافة
                        </button>
                      </div>
                    </div>

                    {/* Unit preview hint */}
                    {itemForm.productId && itemForm.unitId && (() => {
                      const unit = availableUnits.find(u => u.id == itemForm.unitId);
                      const prod = products.find(p => p.id == itemForm.productId);
                      if (!unit) return null;
                      const qty = parseFloat(itemForm.quantity) || 0;
                      const inBase = qty * parseFloat(unit.conversionFactor);
                      return (
                        <div style={{
                          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                          borderRadius: '6px', padding: '12px 14px', marginBottom: '12px',
                          fontSize: '0.9rem', color: 'var(--metro-blue)', fontWeight: 500
                        }}>
                          📦 استلام: {qty} {unit.unitName} (كل {unit.unitName} فيها {unit.conversionFactor} {prod?.unitName || 'قطعة'})
                          <br/>
                          📉 سيتم إضافة <strong>{inBase.toFixed(3)} {prod?.unitName || 'وحدة'}</strong> للمخزون
                        </div>
                      );
                    })()}

                    {/* Items table */}
                    <div className="table-wrapper">
                      <table className="data-table" style={{ marginTop: '10px' }}>
                        <thead>
                          <tr>
                            <th>المنتج</th>
                            <th>الوحدة</th>
                            <th>الكمية</th>
                            <th>= عدد القطع</th>
                            <th>سعر القطعة</th>
                            <th>الإجمالي</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceItems.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>لا توجد أصناف مضافة</td></tr>
                          ) : invoiceItems.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.name}</td>
                              <td><small>{item.unitLabel}</small></td>
                              <td>{item.quantity}</td>
                              <td>{item.qtyInBase} {item.unitName}</td>
                              <td>{item.unitPrice.toFixed(2)}</td>
                              <td style={{ fontWeight: 600 }}>{item.totalPrice.toFixed(2)}</td>
                              <td>
                                <button type="button" className="btn btn-icon btn-ghost" onClick={() => handleRemoveItem(idx)}>🗑️</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: 'var(--bg-elevated)', fontWeight: 800 }}>
                            <td colSpan="5" style={{ textAlign: 'left' }}>إجمالي الفاتورة:</td>
                            <td style={{ color: 'var(--metro-blue)', fontSize: '1.1rem' }}>{invoiceTotal.toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="purchaseForm" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* ═══ Modal: Payment ══════════════════════════════════════════════════ */}
      {modalType === 'payment' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h3>تسجيل دفعة للمورد — {activePurchase.supplierName}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '15px' }}>رقم الفاتورة: <strong>{activePurchase.invoiceNumber}</strong></p>
                <p style={{ marginBottom: '15px' }}>المتبقي: <strong style={{ color: 'var(--metro-red)' }}>{Number(activePurchase.remainingAmount).toFixed(2)} ج.م</strong></p>
                
                <form id="paymentForm" onSubmit={handleSavePayment}>
                  <div className="form-group">
                    <label>المبلغ المدفوع *</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      max={activePurchase.remainingAmount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      required
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="paymentForm" className="btn btn-success" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'تأكيد الدفع'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* ═══ Modal: Details ══════════════════════════════════════════════════ */}
      {modalType === 'details' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '700px' }}>
              <div className="modal-header">
                <h3>تفاصيل فاتورة المشتريات</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <div className="invoice-header-info" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', padding: '15px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <div>
                    <p>رقم الفاتورة: <strong>{activePurchase.invoiceNumber}</strong></p>
                    <p>المورد: <strong>{activePurchase.supplierName}</strong></p>
                    <p>الفرع: <strong>{activePurchase.branchName || '—'}</strong></p>
                  </div>
                  <div>
                    <p>التاريخ: <strong>{new Date(activePurchase.invoiceDate).toLocaleDateString('ar-EG')}</strong></p>
                    <p>المخزن: <strong>{activePurchase.warehouseName || '—'}</strong></p>
                    <p>الحالة: <strong>{activePurchase.status === 'PAID' ? 'مدفوعة' : 'آجلة/جزئي'}</strong></p>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="data-table">
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
    </>
  );
};

export default Purchases;
