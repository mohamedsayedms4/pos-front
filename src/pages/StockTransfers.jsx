import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

/* ─────────────────────────────────────────────
   StockTransfers – نقل البضاعة بين الفروع والمخازن
───────────────────────────────────────────── */

const EMPTY_TRANSFER = {
  transferType: 'WAREHOUSE_TO_WAREHOUSE',
  fromWarehouseId: '',
  toWarehouseId: '',
  fromBranchId: '',
  toBranchId: '',
  transferNumber: '',
  notes: '',
  items: [],
};

const EMPTY_ITEM = { productId: '', productName: '', quantity: '', unitName: '' };

const STATUS_CONFIG = {
  PENDING:    { label: 'بانتظار الاعتماد', badge: 'badge-warning',  icon: '🕒' },
  IN_TRANSIT: { label: 'قيد النقل',        badge: 'badge-info',     icon: '🚚' },
  RECEIVED:   { label: 'مستلم',            badge: 'badge-success',  icon: '✅' },
  CANCELLED:  { label: 'ملغي',             badge: 'badge-danger',   icon: '🚫' },
};

const TRANSFER_TYPE_CONFIG = {
  WAREHOUSE_TO_WAREHOUSE: { label: 'مخزن → مخزن',  icon: '📦→📦' },
  BRANCH_TO_BRANCH:       { label: 'فرع → فرع',    icon: '🏪→🏪' },
  WAREHOUSE_TO_BRANCH:    { label: 'مخزن → فرع',   icon: '📦→🏪' },
  BRANCH_TO_WAREHOUSE:    { label: 'فرع → مخزن',   icon: '🏪→📦' },
};

/** استخراج branchId للبحث عن المنتجات بناءً على نوع النقل */
function resolveSearchBranchId(form, warehouses, currentUserBranchId) {
  switch (form.transferType) {
    case 'WAREHOUSE_TO_WAREHOUSE':
    case 'WAREHOUSE_TO_BRANCH': {
      const wh = warehouses.find(w => String(w.id) === String(form.fromWarehouseId));
      return wh?.branchId || null;
    }
    case 'BRANCH_TO_BRANCH':
    case 'BRANCH_TO_WAREHOUSE':
      return form.fromBranchId || currentUserBranchId || null;
    default:
      return currentUserBranchId || null;
  }
}

const StockTransfers = () => {
  const { toast, confirm } = useGlobalUI();
  const isAdmin = Api.isAdminOrBranchManager();
  const currentUser = Api._getUser();
  const currentUserBranchId = currentUser?.branchId;
  const location = useLocation();
  const navigate = useNavigate();

  // ─── State ───────────────────────────────────────────────────────────────────
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Form
  const [form, setForm] = useState(EMPTY_TRANSFER);
  const [formItem, setFormItem] = useState(EMPTY_ITEM);
  const [submitting, setSubmitting] = useState(false);

  // Product Search State
  const [productSearch, setProductSearch] = useState('');
  const [searchedProducts, setSearchedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Stats
  const stats = {
    pending:   transfers.filter(t => t.status === 'PENDING').length,
    inTransit: transfers.filter(t => t.status === 'IN_TRANSIT').length,
    received:  transfers.filter(t => t.status === 'RECEIVED').length,
    cancelled: transfers.filter(t => t.status === 'CANCELLED').length,
  };

  // ─── Loaders ─────────────────────────────────────────────────────────────────
  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Api.getStockTransfers(selectedBranchId || null);
      setTransfers(data || []);
    } catch (err) {
      toast(err.message || 'فشل تحميل بيانات التحويلات', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => { loadTransfers(); }, [loadTransfers]);

  useEffect(() => {
    Api.getAllWarehouses()
      .then(data => setWarehouses(Array.isArray(data) ? data : (data?.items || [])))
      .catch(() => {});
    Api.getBranches?.().then(setBranches).catch(() => {});
  }, []);

  useEffect(() => {
    if (location.state?.prefill) {
      const { transferType, fromBranchId, toBranchId, productId, productName, quantity, unitName } = location.state.prefill;
      setForm({
        transferType: transferType || 'BRANCH_TO_BRANCH',
        fromWarehouseId: '',
        toWarehouseId: '',
        fromBranchId: fromBranchId || '',
        toBranchId: toBranchId || '',
        transferNumber: generateTransferNumber(),
        notes: `طلب نقل تلقائي للمنتج: ${productName} لتوفير مخزون للمتجر الإلكتروني`,
        items: [{
          productId: Number(productId),
          productName: productName,
          quantity: Number(quantity) || 1,
          unitName: unitName || 'قطعة'
        }]
      });
      setCreateModalOpen(true);
      // Clear location state to prevent modal popping up again on navigation/refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // New effect: handle query param productId for direct URL access
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const productId = params.get('productId');
    if (productId && !createModalOpen) {
      // Optionally fetch product details for name, but we set placeholders
      setForm(prev => ({
        ...prev,
        items: [{
          productId: Number(productId),
          productName: '',
          quantity: 1,
          unitName: ''
        }]
      }));
      setCreateModalOpen(true);
    }
  }, [location.search, createModalOpen]);

  // Debounced product search
  useEffect(() => {
    if (!createModalOpen) return;
    if (!productSearch.trim()) {
      setSearchedProducts([]);
      return;
    }
    const branchId = resolveSearchBranchId(form, warehouses, currentUserBranchId);
    const timer = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const res = await Api.getProductsPaged(0, 5, productSearch, 'id,desc', branchId);
        setSearchedProducts(res.items || []);
      } catch (err) {
        console.error('Failed to search products', err);
        toast(err.message || 'فشل البحث عن المنتجات', 'error');
      } finally {
        setLoadingProducts(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch, createModalOpen, form.transferType, form.fromWarehouseId, form.fromBranchId, warehouses, currentUserBranchId]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || { label: status, badge: 'badge', icon: '❓' };
    return <span className={`badge ${cfg.badge}`}>{cfg.icon} {cfg.label}</span>;
  };

  const getTransferTypeBadge = (type) => {
    const cfg = TRANSFER_TYPE_CONFIG[type] || { label: type, icon: '🔀' };
    return (
      <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  const generateTransferNumber = () => `TRF-${Date.now().toString().slice(-8)}`;

  /** اسم المصدر للعرض في الجدول */
  const getSourceLabel = (t) => {
    if (t.fromBranchName) return `🏪 ${t.fromBranchName}`;
    if (t.fromWarehouseName) return `📦 ${t.fromWarehouseName}`;
    return '—';
  };

  /** اسم الوجهة للعرض في الجدول */
  const getDestLabel = (t) => {
    if (t.toBranchName) return `🏪 ${t.toBranchName}`;
    if (t.toWarehouseName) return `📦 ${t.toWarehouseName}`;
    return '—';
  };

  // ─── Create Form handlers ─────────────────────────────────────────────────────
  const openCreateModal = () => {
    setForm({ ...EMPTY_TRANSFER, transferNumber: generateTransferNumber() });
    setFormItem(EMPTY_ITEM);
    setProductSearch('');
    setSearchedProducts([]);
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setForm(EMPTY_TRANSFER);
    setFormItem(EMPTY_ITEM);
    setProductSearch('');
    setSearchedProducts([]);
  };

  const handleTransferTypeChange = (newType) => {
    setForm(prev => ({
      ...prev,
      transferType: newType,
      fromWarehouseId: '',
      toWarehouseId: '',
      fromBranchId: '',
      toBranchId: '',
      items: [],
    }));
    setProductSearch('');
    setSearchedProducts([]);
  };

  const addItemToForm = () => {
    if (!formItem.productId || !formItem.quantity || Number(formItem.quantity) <= 0) {
      toast('اختر منتجاً وأدخل كمية صحيحة', 'error');
      return;
    }
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: Number(formItem.productId),
          productName: formItem.productName,
          quantity: Number(formItem.quantity),
          unitName: formItem.unitName,
        },
      ],
    }));
    setFormItem(EMPTY_ITEM);
    setProductSearch('');
  };

  const removeItem = (idx) =>
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const handleCreateSubmit = async () => {
    const type = form.transferType;

    if (type === 'WAREHOUSE_TO_WAREHOUSE') {
      if (!form.fromWarehouseId || !form.toWarehouseId) {
        toast('يجب اختيار مخزن المصدر والوجهة', 'error'); return;
      }
      if (String(form.fromWarehouseId) === String(form.toWarehouseId)) {
        toast('لا يمكن أن يكون المصدر والوجهة نفس المخزن', 'error'); return;
      }
    } else if (type === 'BRANCH_TO_BRANCH') {
      if (!form.fromBranchId || !form.toBranchId) {
        toast('يجب اختيار فرع المصدر والوجهة', 'error'); return;
      }
      if (String(form.fromBranchId) === String(form.toBranchId)) {
        toast('لا يمكن أن يكون المصدر والوجهة نفس الفرع', 'error'); return;
      }
    } else if (type === 'WAREHOUSE_TO_BRANCH') {
      if (!form.fromWarehouseId || !form.toBranchId) {
        toast('يجب اختيار المخزن المصدر والفرع الوجهة', 'error'); return;
      }
    } else if (type === 'BRANCH_TO_WAREHOUSE') {
      if (!form.fromBranchId || !form.toWarehouseId) {
        toast('يجب اختيار الفرع المصدر والمخزن الوجهة', 'error'); return;
      }
    }

    if (form.items.length === 0) {
      toast('أضف منتجاً واحداً على الأقل', 'error'); return;
    }

    setSubmitting(true);
    try {
      await Api.createStockTransfer({
        transferNumber:   form.transferNumber,
        transferType:     form.transferType,
        fromWarehouseId:  form.fromWarehouseId ? Number(form.fromWarehouseId) : null,
        toWarehouseId:    form.toWarehouseId   ? Number(form.toWarehouseId)   : null,
        fromBranchId:     form.fromBranchId    ? Number(form.fromBranchId)    : null,
        toBranchId:       form.toBranchId      ? Number(form.toBranchId)      : null,
        notes:            form.notes,
        items:            form.items,
      });
      toast('تم إنشاء طلب التحويل بنجاح', 'success');
      closeCreateModal();
      loadTransfers();
    } catch (err) {
      toast(err.message || 'فشل إنشاء طلب التحويل', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Action handlers ──────────────────────────────────────────────────────────
  const handleApprove = (transfer) => {
    confirm(
      `هل أنت متأكد من اعتماد وشحن التحويل رقم "${transfer.transferNumber}"؟ سيتم خصم الكميات من المصدر فوراً.`,
      async () => {
        try {
          const approvedBy = currentUser?.name || currentUser?.username || 'Admin';
          await Api.approveStockTransfer(transfer.id, approvedBy);
          toast('تم اعتماد التحويل وخصم الكميات من المصدر', 'success');
          loadTransfers();
        } catch (err) {
          toast(err.message || 'فشل اعتماد التحويل', 'error');
        }
      }
    );
  };

  const handleReceive = (transfer) => {
    confirm(
      `هل أنت متأكد من تأكيد استلام التحويل رقم "${transfer.transferNumber}"؟ سيتم إضافة الكميات للوجهة.`,
      async () => {
        try {
          await Api.receiveStockTransfer(transfer.id);
          toast('تم تأكيد الاستلام وتحديث مخزون الوجهة', 'success');
          loadTransfers();
        } catch (err) {
          toast(err.message || 'فشل تأكيد الاستلام', 'error');
        }
      }
    );
  };

  const handleCancel = (transfer) => {
    confirm(
      `هل أنت متأكد من إلغاء التحويل رقم "${transfer.transferNumber}"؟`,
      async () => {
        try {
          await Api.cancelStockTransfer(transfer.id);
          toast('تم إلغاء التحويل', 'success');
          loadTransfers();
        } catch (err) {
          toast(err.message || 'فشل إلغاء التحويل', 'error');
        }
      }
    );
  };

  const openDetails = (transfer) => {
    setSelectedTransfer(transfer);
    setDetailsModalOpen(true);
  };

  // ─── Source/Dest Selectors (dynamic based on transferType) ────────────────────
  const renderSourceSelector = () => {
    const type = form.transferType;
    if (type === 'WAREHOUSE_TO_WAREHOUSE' || type === 'WAREHOUSE_TO_BRANCH') {
      return (
        <div className="form-group">
          <label className="form-label">المخزن المصدر <span style={{ color: 'var(--metro-red)' }}>*</span></label>
          <select
            className="form-control"
            value={form.fromWarehouseId}
            onChange={e => setForm(p => ({ ...p, fromWarehouseId: e.target.value }))}
          >
            <option value="">— اختر المخزن —</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      );
    }
    // BRANCH_TO_BRANCH or BRANCH_TO_WAREHOUSE
    return (
      <div className="form-group">
        <label className="form-label">الفرع المصدر <span style={{ color: 'var(--metro-red)' }}>*</span></label>
        <select
          className="form-control"
          value={form.fromBranchId}
          onChange={e => setForm(p => ({ ...p, fromBranchId: e.target.value }))}
        >
          <option value="">— اختر الفرع —</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
    );
  };

  const renderDestSelector = () => {
    const type = form.transferType;
    if (type === 'WAREHOUSE_TO_WAREHOUSE' || type === 'BRANCH_TO_WAREHOUSE') {
      return (
        <div className="form-group">
          <label className="form-label">المخزن الوجهة <span style={{ color: 'var(--metro-red)' }}>*</span></label>
          <select
            className="form-control"
            value={form.toWarehouseId}
            onChange={e => setForm(p => ({ ...p, toWarehouseId: e.target.value }))}
          >
            <option value="">— اختر المخزن —</option>
            {warehouses
              .filter(w => type !== 'WAREHOUSE_TO_WAREHOUSE' || String(w.id) !== String(form.fromWarehouseId))
              .map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      );
    }
    // BRANCH_TO_BRANCH or WAREHOUSE_TO_BRANCH
    return (
      <div className="form-group">
        <label className="form-label">الفرع الوجهة <span style={{ color: 'var(--metro-red)' }}>*</span></label>
        <select
          className="form-control"
          value={form.toBranchId}
          onChange={e => setForm(p => ({ ...p, toBranchId: e.target.value }))}
        >
          <option value="">— اختر الفرع —</option>
          {branches
            .filter(b => type !== 'BRANCH_TO_BRANCH' || String(b.id) !== String(form.fromBranchId))
            .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="page-section">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>🔀 نقل البضاعة بين الفروع والمخازن</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            إدارة طلبات نقل الأصناف بين الفروع والمخازن مع تتبع الحالة في كل مرحلة
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {branches.length > 0 && (
            <select
              className="form-control"
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              style={{ width: '160px', height: '40px' }}
            >
              <option value="">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button className="btn btn-secondary" onClick={loadTransfers}>🔄 تحديث</button>
          {Api.can('STOCK_TRANSFER_WRITE') || isAdmin ? (
            <button className="btn btn-primary" onClick={openCreateModal}>
              ＋ طلب نقل جديد
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="stats-grid mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
        <StatTile id="st_pending"    label="بانتظار الاعتماد" value={`${stats.pending} طلب`}   icon="🕒" defaults={{ color: 'amber',   size: 'tile-wd-sm', order: 1 }} />
        <StatTile id="st_transit"   label="قيد النقل"        value={`${stats.inTransit} طلب`} icon="🚚" defaults={{ color: 'blue',    size: 'tile-wd-sm', order: 2 }} />
        <StatTile id="st_received"  label="مستلمة"           value={`${stats.received} طلب`}  icon="✅" defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 3 }} />
        <StatTile id="st_cancelled" label="ملغاة"            value={`${stats.cancelled} طلب`} icon="🚫" defaults={{ color: 'red',     size: 'tile-wd-sm', order: 4 }} />
      </div>

      {/* ── Flow indicator ──────────────────────────────────────────────────── */}
      <div className="card mb-4" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>مسار التحويل:</span>
          <span className="badge badge-warning">🕒 انتظار الاعتماد</span>
          <span>→</span>
          <span className="badge badge-info">🚚 قيد النقل (خصم من المصدر)</span>
          <span>→</span>
          <span className="badge badge-success">✅ مستلم (إضافة للوجهة)</span>
          <span style={{ marginRight: 'auto', color: 'var(--metro-red)', fontSize: '0.8rem' }}>
            ⚠️ الإلغاء في حالة "قيد النقل" يُعيد الكميات للمصدر تلقائياً
          </span>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3>📋 قائمة طلبات النقل</h3>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <Loader message="جاري تحميل طلبات النقل..." />
            ) : transfers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔀</div>
                <h4>لا توجد طلبات نقل حتى الآن</h4>
                <p>أنشئ طلب نقل جديد لنقل البضاعة بين الفروع والمخازن</p>
                {(Api.can('STOCK_TRANSFER_WRITE') || isAdmin) && (
                  <button className="btn btn-primary" onClick={openCreateModal}>＋ طلب نقل جديد</button>
                )}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>رقم التحويل</th>
                    <th>النوع</th>
                    <th>من</th>
                    <th>إلى</th>
                    <th>التاريخ</th>
                    <th>الحالة</th>
                    <th>معتمد بواسطة</th>
                    <th>الأصناف</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t, i) => (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{t.transferNumber}</td>
                      <td>{getTransferTypeBadge(t.transferType)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{getSourceLabel(t)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{getDestLabel(t)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {t.transferDate ? new Date(t.transferDate).toLocaleString('ar-EG') : '—'}
                      </td>
                      <td>{getStatusBadge(t.status)}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                        {t.approvedBy || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-secondary">{t.items?.length || 0} صنف</span>
                      </td>
                      <td>
                        <div className="table-actions" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          <button className="btn btn-icon btn-ghost" title="عرض التفاصيل" onClick={() => openDetails(t)}>👁️</button>

                          {t.status === 'PENDING' && (Api.can('STOCK_TRANSFER_APPROVE') || isAdmin) && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleApprove(t)}>
                              ✔ اعتماد
                            </button>
                          )}

                          {t.status === 'IN_TRANSIT' && (Api.can('STOCK_TRANSFER_RECEIVE') || isAdmin) && (
                            <button className="btn btn-sm btn-success" onClick={() => handleReceive(t)}>
                              📥 استلام
                            </button>
                          )}

                          {(t.status === 'PENDING' || t.status === 'IN_TRANSIT') &&
                            (Api.can('STOCK_TRANSFER_WRITE') || isAdmin) && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleCancel(t)}>
                              ✕ إلغاء
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
        </div>
      </div>

      {/* ══ Create Transfer Modal ═══════════════════════════════════════════════ */}
      {createModalOpen && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeCreateModal(); }}>
            <div className="modal" style={{ maxWidth: '780px' }}>
              <div className="modal-header">
                <h3>🔀 إنشاء طلب نقل بضاعة</h3>
                <button className="modal-close" onClick={closeCreateModal}>✕</button>
              </div>
              <div className="modal-body">

                {/* ── نوع النقل ─────────────────────────────────────────────── */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '10px', display: 'block' }}>
                    نوع التحويل <span style={{ color: 'var(--metro-red)' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {Object.entries(TRANSFER_TYPE_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleTransferTypeChange(key)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: form.transferType === key
                            ? '2px solid var(--accent-blue, #3b82f6)'
                            : '2px solid var(--border-color, #333)',
                          background: form.transferType === key
                            ? 'var(--accent-blue-subtle, rgba(59,130,246,0.12))'
                            : 'var(--bg-elevated)',
                          color: form.transferType === key ? 'var(--accent-blue, #3b82f6)' : 'var(--text-main)',
                          cursor: 'pointer',
                          fontWeight: form.transferType === key ? 700 : 400,
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Transfer info ──────────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">رقم التحويل</label>
                    <input
                      className="form-control"
                      value={form.transferNumber}
                      onChange={e => setForm(p => ({ ...p, transferNumber: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" />

                  {renderSourceSelector()}
                  {renderDestSelector()}

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">ملاحظات</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="ملاحظات اختيارية..."
                    />
                  </div>
                </div>

                {/* ── Add items ─────────────────────────────────────────────── */}
                <div className="card" style={{ padding: '14px', marginBottom: '14px', background: 'var(--bg-elevated)', overflow: 'visible' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>➕ إضافة صنف</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end', overflow: 'visible' }}>
                    <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>المنتج <span style={{ color: 'var(--metro-red)' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="ابحث باسم المنتج أو الباركود..."
                          value={productSearch}
                          onChange={e => {
                            setProductSearch(e.target.value);
                            setFormItem(prev => ({ ...prev, productId: '' }));
                            setShowProductDropdown(true);
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                          onBlur={() => { setTimeout(() => setShowProductDropdown(false), 200); }}
                        />
                        {formItem.productId && (
                          <span
                            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-dim, #888)', fontWeight: 'bold', zIndex: 5 }}
                            onClick={() => { setProductSearch(''); setFormItem(prev => ({ ...prev, productId: '' })); }}
                          >✕</span>
                        )}
                        {showProductDropdown && productSearch.trim() && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-elevated, #1a1a1a)', border: '1px solid var(--border-color, #333)', borderRadius: '8px', maxHeight: '220px', overflowY: 'auto', zIndex: 1000, marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                            {loadingProducts ? (
                              <div style={{ padding: '10px', color: 'var(--text-muted, #888)', textAlign: 'center' }}>جاري البحث...</div>
                            ) : searchedProducts.length === 0 ? (
                              <div style={{ padding: '10px', color: 'var(--text-muted, #888)', textAlign: 'center' }}>لا توجد نتائج</div>
                            ) : (
                              searchedProducts.map(p => (
                                <div
                                  key={p.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setFormItem(prev => ({ ...prev, productId: p.id, productName: p.name, unitName: p.unitName || '' }));
                                    setProductSearch(p.name);
                                    setShowProductDropdown(false);
                                  }}
                                  style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle, #2a2a2a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-main, #fff)', textAlign: 'right' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.05))'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <div>
                                    <span style={{ fontWeight: 600, display: 'block' }}>{p.name}</span>
                                    {p.barcode && <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #888)' }}>باركود: {p.barcode}</span>}
                                  </div>
                                  {p.unitName && (
                                    <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>{p.unitName}</span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>الكمية</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formItem.quantity}
                        onChange={e => setFormItem(prev => ({ ...prev, quantity: e.target.value }))}
                        min="0.001"
                        step="0.001"
                        placeholder="0"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>الوحدة</label>
                      <input
                        className="form-control"
                        value={formItem.unitName}
                        onChange={e => setFormItem(prev => ({ ...prev, unitName: e.target.value }))}
                        placeholder="قطعة..."
                      />
                    </div>
                    <button className="btn btn-primary" onClick={addItemToForm} style={{ height: '42px', whiteSpace: 'nowrap' }}>
                      ＋ إضافة
                    </button>
                  </div>
                </div>

                {/* ── Items list ───────────────────────────────────────────── */}
                {form.items.length > 0 ? (
                  <table className="data-table" style={{ marginBottom: '4px' }}>
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>الوحدة</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.productName}</td>
                          <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{item.quantity}</td>
                          <td style={{ color: 'var(--text-dim)' }}>{item.unitName || '—'}</td>
                          <td>
                            <button className="btn btn-icon btn-ghost" style={{ color: 'var(--metro-red)' }} onClick={() => removeItem(idx)} title="حذف">🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', background: 'var(--bg-elevated)', borderRadius: '8px', fontSize: '0.9rem' }}>
                    لم تتم إضافة أصناف بعد
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={closeCreateModal} disabled={submitting}>إلغاء</button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateSubmit}
                  disabled={submitting || form.items.length === 0}
                >
                  {submitting ? '⏳ جاري الإنشاء...' : '✔ إنشاء طلب النقل'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* ══ Details Modal ═══════════════════════════════════════════════════════ */}
      {detailsModalOpen && selectedTransfer && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) { setDetailsModalOpen(false); setSelectedTransfer(null); } }}>
            <div className="modal" style={{ maxWidth: '700px' }}>
              <div className="modal-header">
                <h3>🔀 تفاصيل التحويل: {selectedTransfer.transferNumber}</h3>
                <button className="modal-close" onClick={() => { setDetailsModalOpen(false); setSelectedTransfer(null); }}>✕</button>
              </div>
              <div className="modal-body">

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', padding: '14px', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>نوع التحويل</span>
                    <div style={{ marginTop: '3px' }}>{getTransferTypeBadge(selectedTransfer.transferType)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>الحالة</span>
                    <div style={{ marginTop: '3px' }}>{getStatusBadge(selectedTransfer.status)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>من</span>
                    <div style={{ fontWeight: 600, marginTop: '3px' }}>{getSourceLabel(selectedTransfer)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>إلى</span>
                    <div style={{ fontWeight: 600, marginTop: '3px' }}>{getDestLabel(selectedTransfer)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>التاريخ</span>
                    <div style={{ fontWeight: 600, marginTop: '3px' }}>
                      {selectedTransfer.transferDate
                        ? new Date(selectedTransfer.transferDate).toLocaleString('ar-EG')
                        : '—'}
                    </div>
                  </div>
                  {selectedTransfer.approvedBy && (
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>معتمد بواسطة</span>
                      <div style={{ fontWeight: 600, marginTop: '3px' }}>👤 {selectedTransfer.approvedBy}</div>
                    </div>
                  )}
                  {selectedTransfer.notes && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>الملاحظات</span>
                      <div style={{ marginTop: '3px', color: 'var(--text-secondary)' }}>{selectedTransfer.notes}</div>
                    </div>
                  )}
                </div>

                <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>الأصناف المحولة</h4>
                {selectedTransfer.items && selectedTransfer.items.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th>الكود</th>
                        <th>الكمية</th>
                        <th>الوحدة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTransfer.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.productName || '—'}</td>
                          <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{item.productCode || '—'}</td>
                          <td style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ color: 'var(--text-dim)' }}>{item.unitName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>لا توجد أصناف</div>
                )}
              </div>

              <div className="modal-footer">
                {selectedTransfer.status === 'PENDING' && (Api.can('STOCK_TRANSFER_APPROVE') || isAdmin) && (
                  <button className="btn btn-primary" onClick={() => { setDetailsModalOpen(false); handleApprove(selectedTransfer); }}>
                    ✔ اعتماد وشحن
                  </button>
                )}
                {selectedTransfer.status === 'IN_TRANSIT' && (Api.can('STOCK_TRANSFER_RECEIVE') || isAdmin) && (
                  <button className="btn btn-success" onClick={() => { setDetailsModalOpen(false); handleReceive(selectedTransfer); }}>
                    📥 تأكيد الاستلام
                  </button>
                )}
                <button className="btn btn-ghost" onClick={() => { setDetailsModalOpen(false); setSelectedTransfer(null); }}>إغلاق</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default StockTransfers;
