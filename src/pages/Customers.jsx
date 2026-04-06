import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [isEditing, setIsEditing] = useState(false);
  const { toast, confirm } = useGlobalUI();
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    loadCustomers(currentPage, pageSize, query);
  }, [currentPage]);

  const loadCustomers = async (page = 0, size = 10, searchQuery = query) => {
    setLoading(true);
    try {
      const res = await Api.getCustomers(page, size, searchQuery);
      // Backend returns Page object
      setCustomers(res.items || res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await Api.updateCustomer(currentCustomer.id, currentCustomer);
        toast('تم تحديث بيانات العميل بنجاح', 'success');
      } else {
        await Api.createCustomer(currentCustomer);
        toast('تم إضافة العميل بنجاح', 'success');
      }
      setShowModal(false);
      loadCustomers(currentPage, pageSize, query);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = (id) => {
    confirm('هل أنت متأكد من حذف هذا العميل؟', async () => {
      try {
        await Api.deleteCustomer(id);
        toast('تم حذف العميل بنجاح', 'success');
        loadCustomers(currentPage, pageSize, query);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const openAddModal = () => {
    setCurrentCustomer({ name: '', phone: '', email: '', address: '' });
    setIsEditing(false);
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setCurrentCustomer(customer);
    setIsEditing(true);
    setShowModal(true);
  };

  return (
    <div className="page-section">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="header-title">
          <h1 style={{ fontWeight: 200, fontSize: '2.5rem', letterSpacing: '1px' }}>إدارة العملاء</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>قائمة العملاء المسجلين والتحكم في حساباتهم</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            + عميل جديد
          </button>
        </div>
      </div>

      <div className="stats-grid mb-3">
        <div className="stat-card blue tile-wd-sm">
          <div className="stat-icon">👤</div>
          <div className="stat-value">{totalElements}</div>
          <div className="stat-label">إجمالي العملاء</div>
        </div>
        <div className="stat-card emerald tile-sq-sm">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{customers.length}</div>
          <div className="stat-label">نشط</div>
        </div>
        <div className="stat-card amber tile-sq-sm">
          <div className="stat-icon">📅</div>
          <div className="stat-value">0</div>
          <div className="stat-label">انضموا مؤخراً</div>
        </div>
      </div>

      <div className="toolbar mb-3">
        <div className="search-input">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(0);
              loadCustomers(0, pageSize, e.target.value);
            }}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>الاسم</th>
                <th>الهاتف</th>
                <th>البريد الإلكتروني</th>
                <th>العنوان</th>
                <th style={{ textAlign: 'center' }}>الرصيد</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">
                    <Loader message="جاري جلب بيانات العملاء..." />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '40px', color: 'var(--text-dim)' }}>
                    لا يوجد عملاء مسجلين حالياً
                  </td>
                </tr>
              ) : customers.map((c, idx) => (
                <tr key={c.id} style={{ animationDelay: `${idx * 0.05}s` }}>
                  <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    {(currentPage * pageSize) + idx + 1}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{c.name}</div>
                  </td>
                  <td>{c.phone || '—'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{c.email || '—'}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.address || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={c.balance > 0 ? 'text-danger' : 'text-success'} style={{ fontWeight: 700 }}>
                      {Number(c.balance).toFixed(2)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="table-actions" style={{ justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(c)} title="تعديل">
                        ✏️
                      </button>
                      <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleDelete(c.id)} title="حذف">
                        🗑
                      </button>
                    </div>
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

      {/* Modern Metro Modal */}
      <div className={`modal-overlay ${showModal ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>{isEditing ? 'تعديل بيانات عميل' : 'إضافة عميل جديد'}</h3>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
          </div>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <div className="form-group">
                <label>اسم العميل *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="مثال: محمد علي"
                  value={currentCustomer.name}
                  onChange={e => setCurrentCustomer({ ...currentCustomer, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="01xxxxxxxxx"
                    value={currentCustomer.phone}
                    onChange={e => setCurrentCustomer({ ...currentCustomer, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>البريد الإلكتروني</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="example@mail.com"
                    value={currentCustomer.email}
                    onChange={e => setCurrentCustomer({ ...currentCustomer, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>العنوان التفصيلي</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="المدينة، الشارع، رقم المبنى..."
                  value={currentCustomer.address}
                  onChange={e => setCurrentCustomer({ ...currentCustomer, address: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'تحديث البيانات' : 'حفظ العميل'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Customers;
