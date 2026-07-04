import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ar-sa';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { useNavigate } from 'react-router-dom';
import ModalContainer from '../components/common/ModalContainer';
import AppointmentModal from '../components/common/AppointmentModal';

// Setup moment locale for Arabic
moment.locale('ar-sa');
const localizer = momentLocalizer(moment);

const SuperAdminCalendar = () => {
  const { toast } = useGlobalUI();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(Views.MONTH);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!Api.isSuperAdmin()) {
      navigate('/dashboard', { replace: true });
      return;
    }
    fetchEvents(currentDate, currentView);
  }, [currentDate, currentView, navigate]);

  const fetchEvents = async (date, view) => {
    setLoading(true);
    try {
      // Calculate start and end based on view to fetch correctly
      let start, end;
      if (view === Views.MONTH || view === Views.AGENDA) {
        start = moment(date).startOf('month').subtract(1, 'week').toISOString();
        end = moment(date).endOf('month').add(1, 'week').toISOString();
      } else if (view === Views.WEEK) {
        start = moment(date).startOf('week').toISOString();
        end = moment(date).endOf('week').toISOString();
      } else {
        start = moment(date).startOf('day').toISOString();
        end = moment(date).endOf('day').toISOString();
      }

      const data = await Api.getAppointments(start, end);
      
      const formattedEvents = data.map(app => ({
        id: app.id,
        title: app.title,
        start: new Date(app.startTime),
        end: new Date(app.endTime),
        type: app.type,
        status: app.status,
        notes: app.notes,
        leadName: app.leadName,
        tenantName: app.tenantName,
        assigneeNames: app.assigneeNames,
        leadId: app.leadId,
        tenantId: app.tenantId
      }));
      setEvents(formattedEvents);
    } catch (err) {
      toast('فشل في جلب المواعيد', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (newDate, view, action) => {
    setCurrentDate(newDate);
  };

  const handleView = (newView) => {
    setCurrentView(newView);
  };

  const eventStyleGetter = (event, start, end, isSelected) => {
    let backgroundColor = '#3174ad';
    
    // Color based on status
    if (event.status === 'COMPLETED') {
      backgroundColor = '#10b981'; // Green
    } else if (event.status === 'CANCELED') {
      backgroundColor = '#ef4444'; // Red
    } else {
      // Color based on type if pending
      switch (event.type) {
        case 'CALL': backgroundColor = '#3b82f6'; break;
        case 'ONLINE_MEETING': backgroundColor = '#8b5cf6'; break;
        case 'TEAM_MEETING': backgroundColor = '#f59e0b'; break;
        default: backgroundColor = '#64748b';
      }
    }

    const style = {
      backgroundColor,
      borderRadius: '5px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      padding: '2px 5px',
      fontWeight: 'bold'
    };
    return { style };
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const updateStatus = async (id, status) => {
    try {
      await Api.updateAppointmentStatus(id, status);
      toast('تم تحديث حالة الموعد بنجاح', 'success');
      setSelectedEvent(prev => ({...prev, status}));
      // refresh events
      fetchEvents(currentDate, currentView);
    } catch (err) {
      toast('فشل تحديث الحالة', 'error');
    }
  };

  return (
    <div className="page-section" style={{ height: 'calc(100vh - 100px)' }}>
      <div className="card h-full flex flex-col">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
              📅 المواعيد والتقويم
            </h2>
            {loading && <Loader small />}
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fa-solid fa-plus"></i> إضافة موعد جديد
          </button>
        </div>
        
        <div className="card-body flex-1 relative">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%', minHeight: '600px' }}
            rtl={true}
            onNavigate={handleNavigate}
            onView={handleView}
            view={currentView}
            date={currentDate}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleEventClick}
            messages={{
              next: "التالي",
              previous: "السابق",
              today: "اليوم",
              month: "شهر",
              week: "أسبوع",
              day: "يوم",
              agenda: "أجندة",
              date: "التاريخ",
              time: "الوقت",
              event: "الموعد",
              noEventsInRange: "لا توجد مواعيد في هذه الفترة."
            }}
          />
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <ModalContainer>
          <div className="modal-overlay active" style={{ zIndex: 1050 }}>
            <div className="modal" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  تفاصيل الموعد
                </h4>
                <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  &times;
                </button>
              </div>
              
              <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{selectedEvent.title}</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {moment(selectedEvent.start).format('LLLL')} - {moment(selectedEvent.end).format('LT')}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>النوع</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {selectedEvent.type === 'CALL' ? '📞 مكالمة' : selectedEvent.type === 'ONLINE_MEETING' ? '💻 اجتماع أونلاين' : '👥 اجتماع فريق'}
                    </span>
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>الحالة</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: selectedEvent.status === 'COMPLETED' ? 'var(--metro-green)' : selectedEvent.status === 'CANCELED' ? 'var(--metro-red)' : 'var(--metro-blue)' 
                    }}>
                      {selectedEvent.status === 'SCHEDULED' ? 'معلق' : selectedEvent.status === 'COMPLETED' ? 'مكتمل' : 'ملغى'}
                    </span>
                  </div>
                </div>

                {(selectedEvent.leadName || selectedEvent.tenantName) && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--metro-blue)', display: 'block', marginBottom: '10px' }}>العميل المرتبط</span>
                    {selectedEvent.leadName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>العميل المحتمل: {selectedEvent.leadName}</span>
                        <a 
                          href={`/super-admin/leads/${selectedEvent.leadId}/communications`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--metro-blue)', fontSize: '0.9rem', textDecoration: 'none', cursor: 'pointer' }}
                        >
                          فتح السجل <i className="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                      </div>
                    )}
                    {selectedEvent.tenantName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>المتجر: {selectedEvent.tenantName}</span>
                        <a 
                          href={`/super-admin/tenants/${selectedEvent.tenantId}/communications`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--metro-blue)', fontSize: '0.9rem', textDecoration: 'none', cursor: 'pointer' }}
                        >
                          فتح السجل <i className="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {selectedEvent.assigneeNames && selectedEvent.assigneeNames.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>المسؤولين عن الموعد:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedEvent.assigneeNames.map((name, i) => (
                        <span key={i} style={{ background: '#e2e8f0', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', color: '#1e293b' }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.notes && (
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>الملاحظات أو الأجندة:</span>
                    <p style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee', whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {selectedEvent.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {selectedEvent.status === 'SCHEDULED' && (
                    <>
                      <button 
                        onClick={() => updateStatus(selectedEvent.id, 'COMPLETED')}
                        className="btn btn-success"
                        style={{ backgroundColor: 'var(--metro-green)', borderColor: 'var(--metro-green)', color: '#fff' }}
                      >
                        ✓ تحديد كمكتمل
                      </button>
                      <button 
                        onClick={() => updateStatus(selectedEvent.id, 'CANCELED')}
                        className="btn btn-danger"
                        style={{ backgroundColor: 'var(--metro-red)', borderColor: 'var(--metro-red)', color: '#fff' }}
                      >
                        ✕ إلغاء الموعد
                      </button>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => navigate('/super-admin/appointments/' + selectedEvent.id)} 
                    className="btn btn-primary"
                  >
                    التفاصيل كاملة
                  </button>
                  <button 
                    onClick={() => setSelectedEvent(null)} 
                    className="btn btn-secondary"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      <AppointmentModal 
        isOpen={showAddModal}
        onClose={(success) => {
          setShowAddModal(false);
          if (success === true) {
            toast('تم حجز الموعد بنجاح 📅', 'success');
            fetchEvents(currentDate, currentView);
          }
        }}
        entityType="GENERAL"
      />
    </div>
  );
};

export default SuperAdminCalendar;
