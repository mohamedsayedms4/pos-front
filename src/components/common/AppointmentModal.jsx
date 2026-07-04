import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import ModalContainer from '../common/ModalContainer';

const AppointmentModal = ({ isOpen, onClose, entityType, entityId }) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsersData, setSelectedUsersData] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    type: 'CALL',
    startTime: '',
    endTime: '',
    notes: '',
    assigneeIds: []
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(0);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  useEffect(() => {
    if (isOpen) {
      setSearchInput('');
      setSearchQuery('');
      setPage(0);
      setSelectedUsersData([]);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const endTime = new Date(tomorrow);
      endTime.setHours(11, 0, 0, 0);

      const formatTime = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day}T${h}:${min}`;
      };

      setFormData(prev => ({
        ...prev,
        title: '',
        notes: '',
        type: 'CALL',
        assigneeIds: [],
        startTime: formatTime(tomorrow),
        endTime: formatTime(endTime)
      }));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadUsers(page, searchQuery);
    }
  }, [isOpen, page, searchQuery]);

  const loadUsers = async (p, q) => {
    try {
      const res = await api.getUsers(p, 10, q);
      setUsers(res.content || res.items || res);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAssigneesChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(parseInt(options[i].value, 10));
      }
    }
    setFormData({ ...formData, assigneeIds: selected });
  };

  // Function for Checkbox changes
  const handleCheckboxChange = (user, checked) => {
    setFormData(prev => {
      const newAssignees = checked 
        ? [...prev.assigneeIds, user.id] 
        : prev.assigneeIds.filter(id => id !== user.id);
      return { ...prev, assigneeIds: newAssignees };
    });

    setSelectedUsersData(prev => {
      if (checked) {
        if (!prev.find(u => u.id === user.id)) return [...prev, user];
        return prev;
      } else {
        return prev.filter(u => u.id !== user.id);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString()
      };
      
      if (entityType === 'LEAD') {
        payload.leadId = entityId;
      } else if (entityType === 'TENANT') {
        payload.tenantId = entityId;
      }

      await api.createAppointment(payload);
      onClose(true); 
    } catch (err) {
      alert(err.response?.data?.message || 'فشل حجز الموعد');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalContainer>
      <div className="modal-overlay active" style={{ zIndex: 1050 }}>
        <div className="modal" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          
          <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-calendar-plus" style={{ color: 'var(--metro-blue)' }}></i> حجز موعد للمتابعة
            </h4>
            <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
              &times;
            </button>
          </div>

          <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            <form id="appointmentForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>عنوان الموعد</label>
                <input 
                  type="text" 
                  name="title"
                  required
                  placeholder="مثال: مكالمة تعريفية بالباقة"
                  className="form-control"
                  value={formData.title} 
                  onChange={handleChange} 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>نوع الموعد</label>
                <select 
                  name="type" 
                  className="form-control"
                  value={formData.type} 
                  onChange={handleChange}
                >
                  <option value="CALL">مكالمة هاتفية</option>
                  <option value="ONLINE_MEETING">اجتماع أونلاين</option>
                  <option value="TEAM_MEETING">اجتماع فريق</option>
                  <option value="OTHER">أخرى</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>تاريخ ووقت البداية</label>
                  <input 
                    type="datetime-local" 
                    name="startTime"
                    required
                    className="form-control"
                    style={{ direction: 'ltr', textAlign: 'left' }}
                    value={formData.startTime} 
                    onChange={handleChange} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>تاريخ ووقت النهاية</label>
                  <input 
                    type="datetime-local" 
                    name="endTime"
                    required
                    className="form-control"
                    style={{ direction: 'ltr', textAlign: 'left' }}
                    value={formData.endTime} 
                    onChange={handleChange} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>المسؤولين عن الموعد</label>
                
                {selectedUsersData.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                    {selectedUsersData.map(u => (
                      <span key={u.id} style={{ background: 'var(--metro-blue)', color: '#fff', padding: '4px 10px', borderRadius: '15px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {u.name}
                        <i className="fa-solid fa-times" style={{ cursor: 'pointer', opacity: 0.8 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.8} onClick={() => handleCheckboxChange(u, false)}></i>
                      </span>
                    ))}
                  </div>
                )}

                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="ابحث عن مسؤول..." 
                  style={{ marginBottom: '10px' }}
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />

                <div style={{ 
                  maxHeight: '150px', 
                  overflowY: 'auto', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px', 
                  padding: '10px',
                  backgroundColor: '#f8f9fa'
                }}>
                  {users.map(u => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer', padding: '5px', borderRadius: '4px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#edf2f7'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <input 
                        type="checkbox"
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        checked={formData.assigneeIds.includes(u.id)}
                        onChange={(e) => handleCheckboxChange(u, e.target.checked)}
                      />
                      <span style={{ fontSize: '0.95rem' }}>{u.name}</span>
                    </label>
                  ))}
                  {users.length === 0 && <span style={{ color: 'var(--text-muted)' }}>لا يوجد مستخدمين...</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }} disabled={page === 0} onClick={() => setPage(page - 1)}>السابق</button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>صفحة {page + 1} من {totalPages === 0 ? 1 : totalPages}</span>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }} disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>التالي</button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>ملاحظات أو أجندة</label>
                <textarea 
                  name="notes"
                  rows="3"
                  className="form-control"
                  placeholder="محاور الاجتماع أو تفاصيل أخرى..."
                  style={{ resize: 'vertical' }}
                  value={formData.notes} 
                  onChange={handleChange} 
                />
              </div>
              
            </form>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
            <button 
              type="submit"
              form="appointmentForm"
              disabled={loading}
              className="btn btn-primary"
              style={{ minWidth: '120px' }}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ الموعد'}
            </button>
            <button 
              type="button"
              onClick={() => onClose(false)} 
              className="btn btn-secondary"
            >
              إلغاء
            </button>
          </div>

        </div>
      </div>
    </ModalContainer>
  );
};

export default AppointmentModal;
