import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'NEW': return <span className="badge badge-primary">جديد</span>;
    case 'CONTACTED': return <span className="badge badge-warning">تم التواصل</span>;
    case 'INTERESTED': return <span className="badge badge-success">مهتم</span>;
    case 'NOT_INTERESTED': return <span className="badge badge-danger">غير مهتم</span>;
    case 'PENDING': return <span className="badge badge-secondary">مؤجل</span>;
    case 'NO_ANSWER': return <span className="badge badge-secondary">لم يرد</span>;
    default: return <span className="badge badge-secondary">{status}</span>;
  }
};

const SuperAdminLeads = () => {
  const navigate = useNavigate();
  const { toast, confirm } = useGlobalUI();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!Api.isSuperAdmin()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = async (p = page, s = pageSize, query = debouncedSearch) => {
    setLoading(true);
    try {
      const res = await Api.getSuperAdminLeads(p, s, query);
      setLeads(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (err) {
      toast(err.message || 'فشل في تحميل العملاء المحتملين', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  useEffect(() => {
    if (Api.isSuperAdmin()) {
      loadData(page, pageSize, debouncedSearch);
    }
  }, [page, pageSize, debouncedSearch]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast('الاسم ورقم الهاتف مطلوبان', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await Api.addSuperAdminLead(form);
      toast('تم تسجيل العميل المحتمل بنجاح ✅', 'success');
      setIsAddModalOpen(false);
      setForm({ name: '', phone: '', email: '', notes: '' });
      loadData(0);
    } catch (err) {
      if (err.errors && err.errors.errorCode === 'TENANT_EXISTS') {
        toast(`لا يمكن الإضافة! هذا الرقم مسجل بالفعل في قائمة المشتركين (المتاجر) باسم: ${err.errors.tenantName}`, 'error');
      } else {
        toast(err.message || 'فشل في إضافة العميل المحتمل', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      toast('جاري تجهيز ملف الإكسيل...', 'info');
      await Api.downloadSuperAdminLeadsExport();
      toast('تم التصدير بنجاح ✅', 'success');
    } catch (err) {
      toast(err.message || 'فشل التصدير', 'error');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await Api.downloadSuperAdminLeadsImportTemplate();
    } catch (err) {
      toast(err.message || 'فشل تحميل القالب', 'error');
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    try {
      const result = await Api.importSuperAdminLeads(importFile);
      toast(result.message || 'تم الاستيراد بنجاح ✅', 'success');
      setIsImportModalOpen(false);
      setImportFile(null);
      loadData(0);
    } catch (err) {
      toast(err.message || 'فشل الاستيراد', 'error');
    } finally {
      setImporting(false);
    }
  };

  const openCommModal = (lead) => {
    navigate(`/super-admin/leads/${lead.id}/communications`, { state: { lead } });
  };

  if (!Api.isSuperAdmin()) return null;

  return (
    <div className="sa-sub-container page-section">
      <div className="sa-sub-breadcrumbs" style={{ marginBottom: '20px' }}>
        <a href="/dashboard">الرئيسية</a>
        <span>/</span>
        <a href="/super-admin/subscriptions">إدارة الاشتراكات</a>
        <span>/</span>
        <span>العملاء المحتملين</span>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>👥 العملاء المحتملين</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              + إضافة عميل محتمل
            </button>
            <button className="btn btn-outline-primary" onClick={() => setIsImportModalOpen(true)}>
              استيراد من إكسيل
            </button>
            <button className="btn btn-outline-secondary" onClick={handleExport}>
              تصدير إكسيل
            </button>
          </div>
        </div>

        <div className="toolbar" style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="search-input">
            <input
              type="text"
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
          </div>
        </div>

        <div className="card-body no-padding">
          {loading ? (
            <Loader message="جاري التحميل..." />
          ) : leads.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '10px' }}>📋</div>
              <h4>لا يوجد عملاء محتملين</h4>
              <p>لم يتم تسجيل أي عملاء محتملين مطابقين لبحثك.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الاسم</th>
                    <th>رقم الهاتف</th>
                    <th>تاريخ التسجيل</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, index) => (
                    <tr key={lead.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{page * pageSize + index + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {(lead.name || '?').charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600 }}>{lead.name}</span>
                        </div>
                      </td>
                      <td style={{ direction: 'ltr', textAlign: 'right' }}>{lead.phone}</td>
                      <td>{formatDate(lead.createdAt)}</td>
                      <td>{getStatusBadge(lead.status)}</td>
                      <td>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => openCommModal(lead)}>
                          سجل التواصل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && leads.length > 0 && (
          <div className="pagination" style={{ borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                عرض {leads.length} من إجمالي {totalElements}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                style={{ padding: '8px 12px', border: '1px solid var(--border-subtle)', background: page === 0 ? 'var(--bg-hover)' : '#fff', color: page === 0 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
              >
                السابق
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                style={{ padding: '8px 12px', border: '1px solid var(--border-subtle)', background: page >= totalPages - 1 ? 'var(--bg-hover)' : '#fff', color: page >= totalPages - 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setIsAddModalOpen(false); }}>
            <div className="modal">
              <div className="modal-header">
                <h3>إضافة عميل محتمل جديد</h3>
                <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                <form id="addLeadForm" onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label>اسم العميل <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                      required 
                    />
                  </div>
                  <div>
                    <label>رقم الهاتف <span className="text-danger">*</span></label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      value={form.phone} 
                      onChange={e => setForm({...form, phone: e.target.value})} 
                      required 
                      style={{ direction: 'ltr', textAlign: 'left' }}
                    />
                  </div>
                  <div>
                    <label>البريد الإلكتروني</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={form.email} 
                      onChange={e => setForm({...form, email: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label>ملاحظات أولية</label>
                    <textarea 
                      className="form-control" 
                      rows="3" 
                      value={form.notes} 
                      onChange={e => setForm({...form, notes: e.target.value})} 
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>إلغاء</button>
                <button type="submit" form="addLeadForm" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'جاري الحفظ...' : 'حفظ وإضافة'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {isImportModalOpen && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setIsImportModalOpen(false) }}>
            <div className="modal active" style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>استيراد عملاء محتملين من إكسيل</h3>
                <button className="btn-close" onClick={() => setIsImportModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-light)', borderRadius: '10px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                  <p style={{ margin: '0 0 10px 0' }}>💡 <strong>تعليمات الاستيراد:</strong></p>
                  <ul style={{ paddingRight: '20px', margin: 0 }}>
                    <li>قم بتحميل قالب الإكسيل الفارغ من الزر بالأسفل.</li>
                    <li>قم بتعبئة البيانات. (الاسم ورقم الهاتف حقول إجبارية).</li>
                    <li>النظام سيتجاهل تلقائياً الأرقام المسجلة مسبقاً (سواء في المشتركين أو العملاء المحتملين).</li>
                  </ul>
                  <button type="button" className="btn btn-link" onClick={handleDownloadTemplate} style={{ marginTop: '10px', padding: 0 }}>
                    📥 تحميل قالب الإكسيل الفارغ
                  </button>
                </div>
                <form onSubmit={handleImportSubmit}>
                  <div className="form-group">
                    <label>اختر ملف الإكسيل</label>
                    <input
                      type="file"
                      className="form-control"
                      accept=".xlsx, .xls"
                      onChange={(e) => setImportFile(e.target.files[0])}
                      required
                    />
                  </div>
                  <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsImportModalOpen(false)} disabled={importing}>
                      إلغاء
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={importing || !importFile}>
                      {importing ? 'جاري الاستيراد...' : 'بدء الاستيراد'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default SuperAdminLeads;
