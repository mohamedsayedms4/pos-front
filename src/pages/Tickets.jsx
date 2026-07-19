import React, { useState, useEffect, useRef } from 'react';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, confirm } = useGlobalUI();

  const isSuper = Api.isSuperAdmin && Api.isSuperAdmin();
  const currentUser = Api._getUser() || {};

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    type: 'QUESTION',
    description: '',
    attachment: null
  });
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('RESOLVED');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      let data = [];
      if (isSuper) {
        data = await Api.getSuperAdminSupportTickets();
      } else {
        data = await Api.getTenantSupportTickets();
      }
      setTickets(data || []);
    } catch (err) {
      toast(err.message || 'فشل في تحميل التذاكر', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast('الحد الأقصى لحجم الملف هو 5 ميجابايت', 'error');
        return;
      }
      setCreateForm({ ...createForm, attachment: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast('الحد الأقصى لحجم الملف هو 5 ميجابايت', 'error');
        return;
      }
      setCreateForm({ ...createForm, attachment: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachment = () => {
    setCreateForm({ ...createForm, attachment: null });
    setAttachmentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.description.trim()) {
      toast('يرجى كتابة وصف المشكلة أو الطلب', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await Api.submitSupportTicket({
        type: createForm.type,
        description: createForm.description,
        attachment: createForm.attachment
      });
      toast('تم تقديم طلب الدعم الفني بنجاح', 'success');
      setShowCreateModal(false);
      setCreateForm({ type: 'QUESTION', description: '', attachment: null });
      setAttachmentPreview(null);
      loadTickets();
    } catch (err) {
      toast(err.message || 'فشل إرسال طلب الدعم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      toast('يرجى كتابة الرد', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await Api.replyToSupportTicket(selectedTicket.id, {
        reply: replyText,
        status: replyStatus
      });
      toast('تم إرسال الرد وتحديث حالة التذكرة بنجاح', 'success');
      setReplyText('');
      setSelectedTicket(null);
      loadTickets();
    } catch (err) {
      toast(err.message || 'فشل إرسال الرد', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper getters
  const getTypeLabel = (type) => {
    switch (type) {
      case 'SUGGESTION': return { text: ' اقتراح', className: 'badge-emerald' };
      case 'QUESTION': return { text: ' سؤال', className: 'badge-info' };
      case 'COMPLAINT': return { text: ' شكوى', className: 'badge-danger' };
      default: return { text: type, className: 'badge' };
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>قيد الانتظار</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}>قيد المعالجة</span>;
      case 'RESOLVED':
        return <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>تم الحل</span>;
      case 'CLOSED':
        return <span className="badge" style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'rgba(107,114,128,0.15)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.25)' }}>مغلقة</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  // Stats calculation
  const totalCount = tickets.length;
  const pendingCount = tickets.filter(t => t.status === 'PENDING').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  // Filtered Tickets
  const filteredTickets = tickets.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    const descText = t.description?.toLowerCase() || '';
    const userText = t.userName?.toLowerCase() || '';
    const tenantText = t.tenantName?.toLowerCase() || '';
    const idText = String(t.id);
    const searchLower = searchQuery.toLowerCase();

    const matchesSearch = !searchQuery || 
      descText.includes(searchLower) ||
      userText.includes(searchLower) ||
      tenantText.includes(searchLower) ||
      idText.includes(searchLower);

    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="page-section anim-fade-in" style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      
      {/* <i className="fa-solid fa-rocket"></i> Overview Cards */}
      <div className="stats-grid mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <StatTile
          id="stat_total"
          label="إجمالي الطلبات"
          value={`${totalCount} طلب`}
          icon={<i className="fa-solid fa-calculator"></i>}
          defaults={{ color: 'blue', size: 'tile-wd-sm' }}
        />
        <StatTile
          id="stat_pending"
          label="قيد الانتظار"
          value={`${pendingCount} طلب`}
          icon={<i className="fa-solid fa-chart-simple"></i>}
          defaults={{ color: 'orange', size: 'tile-wd-sm' }}
        />
        <StatTile
          id="stat_inprogress"
          label="قيد المعالجة"
          value={`${inProgressCount} طلب`}
          icon={<i className="fa-solid fa-chart-simple"></i>}
          defaults={{ color: 'indigo', size: 'tile-wd-sm' }}
        />
        <StatTile
          id="stat_resolved"
          label="تم حلها / مغلقة"
          value={`${resolvedCount} طلب`}
          icon={<i className="fa-solid fa-chart-simple"></i>}
          defaults={{ color: 'emerald', size: 'tile-wd-sm' }}
        />
      </div>

      <div className="card">
        {/* <i className="fa-solid fa-palette"></i> Header with Glassmorphism Actions */}
        <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}><i className="fa-solid fa-hammer"></i>️ الدعم الفني والمقترحات</h3>
            <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isSuper ? 'إدارة وحل تذاكر الدعم الفني لكافة العملاء والمتاجر في النظام' : 'أرسل أسئلتك، شكاواك، أو مقترحاتك الإبداعية لفريق الدعم الفني'}
            </p>
          </div>
          {!isSuper && (
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ borderRadius: '10px', fontWeight: 600 }}>
              + إنشاء تذكرة دعم جديدة
            </button>
          )}
        </div>

        {/* <i className="fa-solid fa-magnifying-glass"></i> Filters Bar */}
        <div style={{
          padding: '15px 20px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px',
          alignItems: 'center'
        }}>
          {/* Search Input */}
          <div className="search-input" style={{ flex: '1 1 250px', position: 'relative' }}>
            <input
              type="text"
              placeholder="ابحث برقم التذكرة، المحتوى، أو العميل..."
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '36px',
                paddingRight: '12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
            />
            <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>النوع:</label>
            <select
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                borderRadius: '10px',
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="ALL">الكل</option>
              <option value="QUESTION"><i className="fa-solid fa-question"></i> سؤال</option>
              <option value="SUGGESTION"><i className="fa-solid fa-lightbulb"></i> اقتراح</option>
              <option value="COMPLAINT"><i className="fa-solid fa-triangle-exclamation"></i> شكوى</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>الحالة:</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                borderRadius: '10px',
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="ALL">الكل</option>
              <option value="PENDING">قيد الانتظار</option>
              <option value="IN_PROGRESS">قيد المعالجة</option>
              <option value="RESOLVED">تم الحل</option>
              <option value="CLOSED">مغلقة</option>
            </select>
          </div>
        </div>

        {/* <i className="fa-solid fa-clipboard-list"></i> Tickets Content Grid */}
        <div className="card-body" style={{ padding: '20px' }}>
          {loading ? (
            <div style={{ padding: '60px 0' }}><Loader message="جاري تحميل طلبات الدعم..." /></div>
          ) : filteredTickets.length === 0 ? (
            <div className="empty-state" style={{ padding: '50px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}><i className="fa-solid fa-magnifying-glass"></i></div>
              <h4 style={{ color: 'var(--text-primary)' }}>لا توجد تذاكر دعم حالياً</h4>
              <p style={{ color: 'var(--text-muted)' }}>تطابق محددات البحث والفلاتر أو لم تقم بإضافة طلبات بعد.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {filteredTickets.map(t => {
                const typeObj = getTypeLabel(t.type);
                return (
                  <div
                    key={t.id}
                    className="ticket-card"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '14px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                    onClick={() => {
                      setSelectedTicket(t);
                      if (isSuper) {
                        setReplyStatus(t.status === 'PENDING' ? 'IN_PROGRESS' : t.status);
                      }
                    }}
                  >
                    <div>
                      {/* Ticket Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>#تذكرة {t.id}</span>
                        <span className={`badge ${typeObj.className}`} style={{ fontSize: '0.75rem', borderRadius: '15px' }}>
                          {typeObj.text}
                        </span>
                      </div>

                      {/* Super Admin Info */}
                      {isSuper && (
                        <div style={{
                          background: 'rgba(59,130,246,0.08)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '0.8rem',
                          color: 'var(--text-primary)',
                          marginBottom: '10px',
                          border: '1px solid rgba(59,130,246,0.15)'
                        }}>
                          <strong><i className="fa-solid fa-building"></i> المتجر: </strong> {t.tenantName || 'غير معروف'} <br />
                          <strong><i className="fa-solid fa-user"></i> مرسل بواسطة: </strong> {t.userName || 'مستخدم'}
                        </div>
                      )}

                      {/* Description */}
                      <p style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        lineHeight: '1.5',
                        margin: '0 0 15px',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        height: '4.5em'
                      }}>
                        {t.description}
                      </p>
                    </div>

                    {/* Ticket Footer */}
                    <div style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '12px',
                      marginTop: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <i className="fa-solid fa-calendar-days"></i> {t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-EG') : ''}
                      </div>
                      <div>
                        {getStatusBadge(t.status)}
                      </div>
                    </div>

                    {/* Replied indicator */}
                    {t.reply && (
                      <div style={{
                        position: 'absolute',
                        top: '-6px',
                        left: '12px',
                        background: '#10b981',
                        color: '#fff',
                        fontSize: '0.68rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        تم الرد
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* <i className="fa-solid fa-rocket"></i> Create Ticket Modal */}
      {showCreateModal && (
        <ModalContainer>
          <div className="modal-overlay active anim-fade-in" onClick={() => !submitting && setShowCreateModal(false)}>
            <div className="modal-content anim-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', borderRadius: '18px' }}>
              <div className="modal-header">
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}><i className="fa-solid fa-rocket"></i> إنشاء تذكرة دعم فني جديدة</h2>
                <button className="close-btn" onClick={() => !submitting && setShowCreateModal(false)}><i className="fa-solid fa-times"></i></button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body" style={{ padding: '20px 25px' }}>
                  
                  {/* Select Type */}
                  <div className="form-group mb-4">
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>تصنيف المشكلة / الطلب</label>
                    <select
                      className="form-control"
                      value={createForm.type}
                      onChange={e => setCreateForm({ ...createForm, type: e.target.value })}
                      style={{ borderRadius: '10px', height: '42px' }}
                    >
                      <option value="QUESTION"><i className="fa-solid fa-question"></i> سؤال / استفسار فني</option>
                      <option value="SUGGESTION"><i className="fa-solid fa-lightbulb"></i> اقتراح أو إضافة مرغوبة</option>
                      <option value="COMPLAINT"><i className="fa-solid fa-triangle-exclamation"></i> شكوى أو عطل في النظام</option>
                    </select>
                  </div>

                  {/* Description text */}
                  <div className="form-group mb-4">
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>الوصف التفصيلي</label>
                    <textarea
                      className="form-control"
                      rows="5"
                      required
                      placeholder="يرجى وصف المشكلة بدقة موضحاً الخطوات التي أدت لظهورها، أو تفاصيل المقترح الذي تود إضافته..."
                      value={createForm.description}
                      onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                      style={{ borderRadius: '10px', padding: '12px', resize: 'vertical' }}
                    />
                  </div>

                  {/* Image attachment drag-and-drop */}
                  <div className="form-group mb-4">
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>إرفاق صورة توضيحية (اختياري)</label>
                    
                    {!attachmentPreview ? (
                      <div
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: '2px dashed var(--border-subtle)',
                          borderRadius: '12px',
                          padding: '30px 20px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.01)',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
                          e.currentTarget.style.background = 'rgba(59,130,246,0.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                        }}
                      >
                        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}><i className="fa-solid fa-image"></i>️</div>
                        <p style={{ margin: '0 0 5px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>اسحب وأسقط الصورة هنا أو اضغط للتصفح</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>يدعم JPEG, PNG حتى 5 ميجابايت</p>
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </div>
                    ) : (
                      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.1)', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={attachmentPreview}
                          alt="Attachment Preview"
                          style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
                        />
                        <button
                          type="button"
                          onClick={clearAttachment}
                          style={{
                            position: 'absolute',
                            top: '15px',
                            left: '15px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                          }}
                        >
                          <i className="fa-solid fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '15px 25px' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)} disabled={submitting} style={{ borderRadius: '10px' }}>
                    إلغاء
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting} style={{ borderRadius: '10px', padding: '10px 24px', fontWeight: 600 }}>
                    {submitting ? 'جاري تقديم الطلب...' : 'إرسال طلب الدعم'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* <i className="fa-solid fa-rocket"></i> Ticket Details / Super Admin Reply Modal */}
      {selectedTicket && (
        <ModalContainer>
          <div className="modal-overlay active anim-fade-in" onClick={() => !submitting && setSelectedTicket(null)}>
            <div className="modal-content anim-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', borderRadius: '18px' }}>
              
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}><i className="fa-solid fa-file-pen"></i> تفاصيل طلب الدعم الفني</h2>
                <button className="close-btn" onClick={() => !submitting && setSelectedTicket(null)}><i className="fa-solid fa-times"></i></button>
              </div>

              <div className="modal-body" style={{ padding: '20px 25px', maxHeight: '75vh', overflowY: 'auto' }}>
                
                {/* Details Meta Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '15px',
                  marginBottom: '20px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>رقم الطلب:</span>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>#{selectedTicket.id}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تاريخ التقديم:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString('ar-EG') : ''}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الحالة:</span>
                    <div style={{ marginTop: '3px' }}>{getStatusBadge(selectedTicket.status)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>التصنيف:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {getTypeLabel(selectedTicket.type).text}
                    </div>
                  </div>

                  {isSuper && (
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '5px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><i className="fa-solid fa-building"></i> المتجر / العميل:</span>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedTicket.tenantName}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><i className="fa-solid fa-user"></i> مرسل الطلب:</span>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedTicket.userName}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ticket Description Section */}
                <div className="mb-4">
                  <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1rem' }}><i className="fa-solid fa-comment-dots"></i> وصف المشكلة / المقترح:</h4>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '16px',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Attachment Section */}
                {selectedTicket.imageUrl && (
                  <div className="mb-4">
                    <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1rem' }}><i className="fa-solid fa-image"></i>️ المرفقات التوضيحية:</h4>
                    <div style={{
                      textAlign: 'center',
                      background: 'rgba(0,0,0,0.1)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '15px',
                      overflow: 'hidden'
                    }}>
                      <a
                        href={selectedTicket.imageUrl.startsWith('/api') ? `${SERVER_URL}${selectedTicket.imageUrl}` : selectedTicket.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="اضغط لفتح الصورة كاملة"
                      >
                        <img
                          src={selectedTicket.imageUrl.startsWith('/api') ? `${SERVER_URL}${selectedTicket.imageUrl}` : selectedTicket.imageUrl}
                          alt="Support Ticket Attachment"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                            cursor: 'zoom-in',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        />
                      </a>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        (اضغط على الصورة لفتحها بالحجم الكامل في نافذة جديدة)
                      </div>
                    </div>
                  </div>
                )}

                {/* Reply display section for ordinary user */}
                {!isSuper && selectedTicket.reply && (
                  <div style={{
                    marginTop: '25px',
                    borderTop: '2px dashed var(--border-subtle)',
                    paddingTop: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '1.3rem' }}><i className="fa-solid fa-hammer"></i>️</span>
                      <h4 style={{ fontWeight: 700, color: '#10b981', margin: 0, fontSize: '1.05rem' }}>رد الدعم الفني للـ Super Admin:</h4>
                    </div>
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.05)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '12px',
                      padding: '16px',
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {selectedTicket.reply}
                      
                      <div style={{
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginTop: '12px',
                        borderTop: '1px solid rgba(16,185,129,0.1)',
                        paddingTop: '8px'
                      }}>
                        <i className="fa-solid fa-clock"></i> تم الرد في: {selectedTicket.repliedAt ? new Date(selectedTicket.repliedAt).toLocaleString('ar-EG') : ''}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reply submission/display for Super Admin */}
                {isSuper && (
                  <div style={{
                    marginTop: '25px',
                    borderTop: '2px dashed var(--border-subtle)',
                    paddingTop: '20px'
                  }}>
                    
                    {/* Previous replies */}
                    {selectedTicket.reply && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1rem' }}>الرد السابق:</h4>
                        <div style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '12px',
                          padding: '14px',
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap',
                          marginBottom: '5px'
                        }}>
                          {selectedTicket.reply}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <i className="fa-solid fa-clock"></i> تم في: {selectedTicket.repliedAt ? new Date(selectedTicket.repliedAt).toLocaleString('ar-EG') : ''}
                        </span>
                      </div>
                    )}

                    <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span><i className="fa-solid fa-pen-nib"></i>️</span> كتابة رد جديد / تحديث حالة التذكرة
                    </h4>
                    
                    <form onSubmit={handleReplySubmit}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div className="form-group">
                          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>الحالة الجديدة للتذكرة</label>
                          <select
                            className="form-control"
                            value={replyStatus}
                            onChange={(e) => setReplyStatus(e.target.value)}
                            style={{ borderRadius: '8px', height: '38px' }}
                          >
                            <option value="PENDING"><i className="fa-solid fa-hourglass-half"></i> قيد الانتظار</option>
                            <option value="IN_PROGRESS"><i className="fa-solid fa-gear"></i> قيد المعالجة</option>
                            <option value="RESOLVED"><i className="fa-solid fa-check"></i> تم الحل</option>
                            <option value="CLOSED"><i className="fa-solid fa-lock"></i> مغلقة نهائياً</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group mb-4">
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>نص الرد الفني</label>
                        <textarea
                          className="form-control"
                          rows="4"
                          required
                          placeholder="اكتب ردك الدقيق والواضح لحل المشكلة أو الاستفسار..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          style={{ borderRadius: '10px', padding: '10px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="submit" className="btn btn-emerald" disabled={submitting} style={{ borderRadius: '10px', padding: '8px 20px', fontWeight: 600, background: '#10b981', color: '#fff' }}>
                          {submitting ? 'جاري الإرسال...' : 'إرسال الرد وتحديث الحالة'}
                        </button>
                      </div>
                    </form>

                  </div>
                )}

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '15px 25px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setSelectedTicket(null)} disabled={submitting} style={{ borderRadius: '10px' }}>
                  إغلاق النافذة
                </button>
              </div>

            </div>
          </div>
        </ModalContainer>
      )}

    </div>
  );
};

export default Tickets;
