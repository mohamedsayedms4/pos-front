import React, { useState, useEffect, useRef, useCallback } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

/* ─────────────────────────────────────────────────────────────────────────────
   AttendanceDashboard — نظام الحضور والانصراف الذكي
   يعرض:
     - QR Code يتجدد كل 60 ثانية لتسجيل الحضور
     - بطاقات الموظفين مع أزرار حضور/انصراف للمديرين (يستخدمون GPS تلقائياً)
     - شريط العد التنازلي لتجديد QR
   ───────────────────────────────────────────────────────────────────────────── */

const QR_REFRESH_SECONDS = 60;

const AttendanceDashboard = () => {
  const { toast } = useGlobalUI();
  const isAdmin = Api.isAdminOrBranchManager();

  // ─── حالة الـ QR ──────────────────────────────────────────────────────────
  const [qrData, setQrData]           = useState(null);   // { qrImage, expiresInSeconds }
  const [qrLoading, setQrLoading]     = useState(true);
  const [countdown, setCountdown]     = useState(QR_REFRESH_SECONDS);
  const qrIntervalRef                 = useRef(null);
  const countdownRef                  = useRef(null);

  // ─── حالة الموظفين ────────────────────────────────────────────────────────
  const [employees, setEmployees]     = useState([]);
  const [empLoading, setEmpLoading]   = useState(true);
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts]           = useState([]);
  const [branches, setBranches]       = useState([]);
  const [selectedShift, setSelectedShift]   = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  // ─── تحميل بيانات QR ──────────────────────────────────────────────────────
  const fetchQr = useCallback(async () => {
    try {
      const data = await Api.getAttendanceQr();
      setQrData(data);
      setCountdown(data.expiresInSeconds || QR_REFRESH_SECONDS);
    } catch (err) {
      console.warn('QR fetch failed:', err.message);
    } finally {
      setQrLoading(false);
    }
  }, []);

  // تحديث QR كل 60 ثانية
  useEffect(() => {
    fetchQr();
    qrIntervalRef.current = setInterval(fetchQr, QR_REFRESH_SECONDS * 1000);
    return () => clearInterval(qrIntervalRef.current);
  }, [fetchQr]);

  // العد التنازلي الثانوي
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? QR_REFRESH_SECONDS : prev - 1));
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  // ─── تحميل الموظفين ───────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    setEmpLoading(true);
    try {
      const [empRes, shiftRes, branchesData] = await Promise.all([
        Api.getUsers(0, 1000, '', selectedBranchId),
        Api.getShifts(),
        branches.length === 0 ? Api.getBranches().catch(() => []) : Promise.resolve(branches)
      ]);
      const allEmps = empRes.items || empRes.content || [];
      setShifts(shiftRes);
      if (branches.length === 0) setBranches(branchesData);
      const filtered = selectedShift
        ? allEmps.filter(e => e.profile?.shift?.id === parseInt(selectedShift))
        : allEmps;
      setEmployees(filtered);
    } catch (err) {
      toast('فشل في تحميل بيانات الموظفين', 'error');
    } finally {
      setEmpLoading(false);
    }
  }, [date, selectedShift, selectedBranchId]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // ─── دالة الحضور / الانصراف ──────────────────────────────────────────────
  const getCurrentPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('GPS غير مدعوم في هذا الجهاز'));
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        err => reject(new Error('تعذّر الحصول على الموقع. تأكد من تفعيل GPS والسماح للتطبيق.')),
        { timeout: 8000, enableHighAccuracy: true }
      );
    });

  const handleAction = async (userId, action) => {
    if (!qrData?.qrImage) {
      return toast('QR Code غير متاح حالياً. يرجى الانتظار...', 'warning');
    }

    // استخراج الـ token من payload الـ QR (format: tenantId:token)
    // الـ admin يستخدم QR المعروض + GPS التلقائي
    setActionLoading(prev => ({ ...prev, [userId + action]: true }));
    try {
      let lat = null, lng = null;
      try {
        const pos = await getCurrentPosition();
        lat = pos.latitude;
        lng = pos.longitude;
      } catch (gpsErr) {
        // GPS اختياري للمسؤولين — نتابع بدونه مع تحذير
        toast('تحذير: لم يتم الحصول على الموقع الجغرافي', 'warning');
      }

      // استخراج الـ token من الـ QR (الـ payload = tenantId:token)
      const qrToken = await extractTokenFromQr();

      if (action === 'checkIn') {
        await Api.checkInEmployee(userId, qrToken, lat, lng);
        toast(' تم تسجيل الحضور بنجاح', 'success');
      } else if (action === 'checkOut') {
        await Api.checkOutEmployee(userId, qrToken, lat, lng);
        toast(' تم تسجيل الانصراف بنجاح', 'success');
      } else if (action === 'absent') {
        await Api.markEmployeeAbsent(userId, date);
        toast('تم تسجيل الغياب', 'warning');
      }
      fetchEmployees();
    } catch (err) {
      const msg = err.message || 'حدث خطأ غير متوقع';
      if (msg.includes('IP')) {
        toast(' ' + msg, 'error');
      } else if (msg.includes('QR') || msg.includes('رمز')) {
        toast(' ' + msg + ' — جارٍ تحديث الـ QR...', 'error');
        fetchQr(); // تحديث فوري
      } else if (msg.includes('جغرافي') || msg.includes('نطاق')) {
        toast(' ' + msg, 'error');
      } else if (msg.includes('سجل حضوره')) {
        toast('ℹ️ ' + msg, 'info');
      } else {
        toast(msg, 'error');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [userId + action]: false }));
    }
  };

  // استخراج الـ QR token من الـ payload الـ base64 للصورة
  // الـ QR payload = "tenantId:hexToken"
  const extractTokenFromQr = async () => {
    if (!qrData?.qrImage) throw new Error('QR غير متاح');
    // نطلب fresh token من الـ API مباشرة — الـ image فقط للعرض
    // الـ server يوفر token جديد مع كل طلب QR
    const fresh = await Api.getAttendanceQr();
    setQrData(fresh);
    // الـ token هو الجزء بعد ":" في الـ QR payload
    // لكننا لا نستطيع decode الصورة — الـ admin يُدخل يدوياً للـ employees
    // الحل: نعيد الـ token من الـ backend مباشرة
    return fresh.token || fresh.qrToken || extractFromBase64(fresh.qrImage);
  };

  const extractFromBase64 = (base64img) => {
    // fallback: نرجع string فارغ — الـ backend سيرفض
    return '';
  };

  // ─── لون Avatar ───────────────────────────────────────────────────────────
  const getAvatarColor = (name) => {
    const palette = [
      '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
      '#eab308','#22c55e','#14b8a6','#3b82f6','#06b6d4'
    ];
    return palette[(name?.charCodeAt(0) || 0) % palette.length];
  };

  const getStatusInfo = (emp) => {
    // في الواقع يُجلب من attendance records
    return { label: 'لم يُسجَّل بعد', color: 'var(--text-dim)', dot: '' };
  };

  // ─── شريط تقدم العد التنازلي ───────────────────────────────────────────
  const progressPct = Math.round((countdown / QR_REFRESH_SECONDS) * 100);
  const progressColor = countdown > 20 ? '#22c55e' : countdown > 10 ? '#f59e0b' : '#ef4444';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-section anim-fade-in" style={{ direction: 'rtl' }}>

      {/* ── رأس الصفحة ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', boxShadow: '0 8px 24px rgba(99,102,241,0.35)'
            }}><i className="fa-solid fa-calendar-days"></i></div>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.8rem' }}>
              نظام الحضور والانصراف الذكي
            </h1>
          </div>
          <p className="text-dim" style={{ margin: 0, fontSize: '0.95rem' }}>
            {new Date(date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* ── فلاتر الأدمن ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {isAdmin && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>الفرع</label>
              <select className="form-control" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} style={{ height: '44px', minWidth: '140px' }}>
                <option value="">جميع الفروع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>التاريخ</label>
            <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} style={{ height: '44px' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>الوردية</label>
            <select className="form-control" value={selectedShift} onChange={e => setSelectedShift(e.target.value)} style={{ height: '44px', minWidth: '160px' }}>
              <option value="">جميع الورديات</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── المحتوى الرئيسي: QR + بطاقات الموظفين ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '340px 1fr' : '1fr', gap: '28px', alignItems: 'start' }}>

        {/* ── لوحة الـ QR Code ───────────────────────────────────────────── */}
        <div className="card" style={{
          borderRadius: '20px',
          background: 'var(--bg-dark)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'sticky',
          top: '20px'
        }}>
          {/* رأس بطاقة QR */}
          <div style={{
            padding: '20px 24px 16px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.3rem' }}><i className="fa-solid fa-user-lock"></i></span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>
                QR Code الحضور
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              يتجدد تلقائياً كل 60 ثانية — للاستخدام مرة واحدة فقط
            </p>
          </div>

          {/* صورة QR */}
          <div style={{ padding: '24px', textAlign: 'center' }}>
            {qrLoading ? (
              <div style={{
                width: '240px', height: '240px', margin: '0 auto',
                background: 'var(--bg-elevated)', borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 1.5s infinite'
              }}>
                <div style={{ fontSize: '3rem', opacity: 0.3 }}><i className="fa-solid fa-hourglass-half"></i></div>
              </div>
            ) : qrData?.qrImage ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={qrData.qrImage}
                  alt="QR Code للحضور"
                  style={{
                    width: '240px', height: '240px',
                    borderRadius: '16px',
                    border: `3px solid ${progressColor}`,
                    transition: 'border-color 0.5s ease',
                    display: 'block',
                    imageRendering: 'pixelated'
                  }}
                />
                {/* overlay عند الانتهاء */}
                {countdown <= 5 && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '16px',
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#ef4444', fontWeight: '700', fontSize: '1.5rem'
                  }}>
                    <span style={{ fontSize: '2.5rem' }}><i className="fa-solid fa-rotate"></i></span>
                    <span>جارٍ التجديد...</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                width: '240px', height: '240px', margin: '0 auto',
                background: 'var(--bg-elevated)', borderRadius: '16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '12px', color: 'var(--text-dim)'
              }}>
                <span style={{ fontSize: '2.5rem' }}><i className="fa-solid fa-triangle-exclamation"></i></span>
                <span style={{ fontSize: '0.85rem' }}>تعذّر تحميل الـ QR</span>
                <button className="btn btn-sm btn-primary" onClick={fetchQr}>إعادة المحاولة</button>
              </div>
            )}

            {/* شريط العد التنازلي */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  <i className="fa-solid fa-stopwatch"></i> يتجدد بعد
                </span>
                <span style={{
                  fontSize: '1rem', fontWeight: '800', fontFamily: 'monospace',
                  color: progressColor, transition: 'color 0.3s'
                }}>
                  {String(countdown).padStart(2, '0')}s
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${progressColor}, ${progressColor}bb)`,
                  borderRadius: '99px',
                  transition: 'width 1s linear, background 0.5s'
                }} />
              </div>
            </div>

            {/* زر تحديث يدوي */}
            <button
              className="btn btn-ghost"
              style={{ marginTop: '16px', width: '100%', height: '40px', fontSize: '0.85rem', gap: '8px' }}
              onClick={() => { fetchQr(); toast('تم تحديث الـ QR', 'info'); }}
              disabled={qrLoading}
            >
              <i className="fa-solid fa-rotate"></i> تحديث الآن
            </button>
          </div>

          {/* تعليمات الاستخدام */}
          <div style={{
            padding: '16px 24px',
            background: 'rgba(99,102,241,0.06)',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.7' }}>
              <i className="fa-solid fa-mobile-screen"></i> <strong style={{ color: 'var(--text-main)' }}>كيفية الاستخدام:</strong><br />
              1. اعرض هذا الـ QR على شاشة الفرع<br />
              2. يمسح الموظف الـ QR بتطبيقه<br />
              3. يُرسَل الـ Token + GPS تلقائياً<br />
              4. السيرفر يتحقق ويُسجّل الحضور
            </p>
          </div>
        </div>

        {/* ── بطاقات الموظفين ─────────────────────────────────────────────── */}
        <div>
          {empLoading && employees.length === 0 ? (
            <Loader />
          ) : employees.length === 0 ? (
            <div className="card" style={{
              padding: '80px 40px', textAlign: 'center',
              borderRadius: '20px', background: 'var(--bg-dark)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}><i className="fa-solid fa-users"></i></div>
              <h3 style={{ color: 'var(--text-dim)' }}>لا يوجد موظفون في هذه الوردية أو الفرع</h3>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
              {employees.map(emp => (
                <EmployeeAttendanceCard
                  key={emp.id}
                  emp={emp}
                  qrAvailable={!!qrData?.qrImage}
                  onAction={handleAction}
                  loading={actionLoading}
                  getAvatarColor={getAvatarColor}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── مكوّن بطاقة الموظف ─────────────────────────────────────────────────── */
const EmployeeAttendanceCard = ({ emp, qrAvailable, onAction, loading, getAvatarColor }) => {
  const isLoadingIn  = loading[emp.id + 'checkIn'];
  const isLoadingOut = loading[emp.id + 'checkOut'];
  const isLoadingAbs = loading[emp.id + 'absent'];
  const anyLoading   = isLoadingIn || isLoadingOut || isLoadingAbs;

  return (
    <div className="card anim-slide-in" style={{
      borderRadius: '18px',
      background: 'var(--bg-dark)',
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* ── بيانات الموظف ── */}
      <div style={{ padding: '20px 22px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '58px', height: '58px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${getAvatarColor(emp.name)}, ${getAvatarColor(emp.name)}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: '800', color: '#fff',
            boxShadow: `0 4px 16px ${getAvatarColor(emp.name)}55`,
          }}>
            {emp.name?.charAt(0)}
          </div>
          {emp.enabled && (
            <div style={{
              position: 'absolute', bottom: '1px', right: '1px',
              width: '13px', height: '13px',
              background: '#22c55e', borderRadius: '50%',
              border: '2px solid var(--bg-dark)'
            }} />
          )}
        </div>

        {/* معلومات */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: '0 0 3px', fontSize: '1rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {emp.name}
          </h4>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            {emp.jobTitle?.title || emp.jobTitle?.name || 'موظف'}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {emp.profile?.shift?.name && (
              <span style={{
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px',
                background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                border: '1px solid rgba(99,102,241,0.3)'
              }}>
                <i className="fa-solid fa-clock"></i> {emp.profile.shift.name}
              </span>
            )}
            {emp.branch?.name && (
              <span style={{
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px',
                background: 'rgba(34,197,94,0.1)', color: '#86efac',
                border: '1px solid rgba(34,197,94,0.2)'
              }}>
                <i className="fa-solid fa-building"></i> {emp.branch.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── أزرار الحضور/الانصراف ── */}
      <div style={{
        padding: '14px 18px',
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px'
      }}>
        <button
          className="btn btn-success"
          style={{ height: '40px', fontSize: '0.85rem', borderRadius: '10px', gap: '6px', opacity: anyLoading ? 0.6 : 1 }}
          onClick={() => onAction(emp.id, 'checkIn')}
          disabled={anyLoading || !qrAvailable}
          title={!qrAvailable ? 'انتظر تحميل QR Code' : ''}
        >
          {isLoadingIn ? '...' : ' حضور'}
        </button>

        <button
          className="btn btn-danger"
          style={{ height: '40px', fontSize: '0.85rem', borderRadius: '10px', gap: '6px', opacity: anyLoading ? 0.6 : 1 }}
          onClick={() => onAction(emp.id, 'checkOut')}
          disabled={anyLoading || !qrAvailable}
        >
          {isLoadingOut ? '...' : ' انصراف'}
        </button>

        <button
          className="btn btn-ghost"
          style={{ height: '40px', width: '56px', padding: 0, borderRadius: '10px', fontSize: '1.1rem', opacity: anyLoading ? 0.6 : 1 }}
          onClick={() => onAction(emp.id, 'absent')}
          disabled={anyLoading}
          title="تسجيل غياب"
        >
          {isLoadingAbs ? '...' : ''}
        </button>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
