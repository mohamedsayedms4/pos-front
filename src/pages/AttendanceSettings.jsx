import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// إصلاح أيقونة Leaflet الافتراضية في React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// مكون مساعد لتحديث الخريطة ورسم النطاق
function LocationPicker({ lat, lng, radius, onChange }) {
  const map = useMap();

  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 16);
    }
  }, [lat, lng, map]);

  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return lat && lng ? (
    <>
      <Marker position={[lat, lng]} />
      <Circle center={[lat, lng]} radius={radius || 200} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.2 }} />
    </>
  ) : null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   AttendanceSettings — إعدادات أمان نظام الحضور
   للمديرين فقط (SETTINGS_MANAGE)
   يتيح:
     - إدارة قائمة IPs المسموح بها
     - تفعيل/تعطيل التحقق الجغرافي
     - إعداد النطاق الجغرافي لكل فرع
   ───────────────────────────────────────────────────────────────────────────── */

const AttendanceSettings = () => {
  const { toast } = useGlobalUI();

  // ─── IP Whitelist ───────────────────────────────────────────────────────
  const [allowedIps, setAllowedIps]     = useState([]);
  const [newIp, setNewIp]               = useState('');
  const [ipLoading, setIpLoading]       = useState(true);
  const [ipSaving, setIpSaving]         = useState(false);
  const [removingIp, setRemovingIp]     = useState(null);

  // ─── Geofencing ─────────────────────────────────────────────────────────
  const [geoEnabled, setGeoEnabled]     = useState(true);
  const [geoLoading, setGeoLoading]     = useState(true);
  const [geoSaving, setGeoSaving]       = useState(false);

  // ─── Branches Geofence ──────────────────────────────────────────────────
  const [branches, setBranches]         = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [editingBranch, setEditingBranch]     = useState(null);
  const [branchGeo, setBranchGeo]       = useState({ geoLat: '', geoLng: '', geoRadiusMeters: 200 });
  const [branchSaving, setBranchSaving] = useState(false);

  // ─── التحميل ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [ips, geo, branchRes] = await Promise.all([
        Api.getAttendanceAllowedIps().catch(() => []),
        Api.getAttendanceGeofenceStatus().catch(() => ({ geoFenceEnabled: true })),
        Api.getBranches().catch(() => [])
      ]);
      setAllowedIps(ips);
      setGeoEnabled(geo?.geoFenceEnabled ?? true);
      setBranches(Array.isArray(branchRes) ? branchRes : (branchRes?.items || branchRes?.content || []));
    } catch (err) {
      toast('فشل في تحميل إعدادات الحضور', 'error');
    } finally {
      setIpLoading(false);
      setGeoLoading(false);
      setBranchesLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── إضافة IP ──────────────────────────────────────────────────────────
  const handleAddIp = async () => {
    const ip = newIp.trim();
    if (!ip) return toast('يرجى إدخال عنوان IP', 'warning');
    if (!/^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/.test(ip)) {
      return toast('صيغة IP غير صحيحة', 'error');
    }
    if (allowedIps.includes(ip)) return toast('الـ IP موجود بالفعل في القائمة', 'info');

    setIpSaving(true);
    try {
      await Api.addAttendanceAllowedIp(ip);
      setAllowedIps(prev => [...prev, ip]);
      setNewIp('');
      toast(`✅ تم إضافة ${ip}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setIpSaving(false);
    }
  };

  // ─── حذف IP ────────────────────────────────────────────────────────────
  const handleRemoveIp = async (ip) => {
    setRemovingIp(ip);
    try {
      await Api.removeAttendanceAllowedIp(ip);
      setAllowedIps(prev => prev.filter(i => i !== ip));
      toast(`تم حذف ${ip}`, 'warning');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setRemovingIp(null);
    }
  };

  // ─── استخدام الـ IP الحالي ─────────────────────────────────────────────
  const useCurrentIp = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      setNewIp(data.ip);
      toast(`تم جلب الـ IP الحالي: ${data.ip}`, 'info');
    } catch {
      toast('تعذّر جلب الـ IP الحالي', 'error');
    }
  };

  // ─── تبديل Geofence ────────────────────────────────────────────────────
  const handleGeoToggle = async () => {
    const newVal = !geoEnabled;
    setGeoSaving(true);
    try {
      await Api.setAttendanceGeofenceEnabled(newVal);
      setGeoEnabled(newVal);
      toast(newVal ? '✅ تم تفعيل التحقق الجغرافي' : '⚠️ تم تعطيل التحقق الجغرافي', newVal ? 'success' : 'warning');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setGeoSaving(false);
    }
  };

  // ─── تعديل نطاق الفرع الجغرافي ────────────────────────────────────────
  const startEditBranch = (branch) => {
    setEditingBranch(branch.id);
    setBranchGeo({
      geoLat: branch.geoLat || '',
      geoLng: branch.geoLng || '',
      geoRadiusMeters: branch.geoRadiusMeters || 200
    });
  };

  const handleGetBranchLocation = () => {
    if (!navigator.geolocation) return toast('GPS غير مدعوم', 'error');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setBranchGeo(prev => ({
          ...prev,
          geoLat: pos.coords.latitude.toFixed(6),
          geoLng: pos.coords.longitude.toFixed(6)
        }));
        toast('✅ تم جلب موقعك الحالي كمركز للفرع', 'success');
      },
      () => toast('تعذّر الحصول على الموقع', 'error'),
      { enableHighAccuracy: true }
    );
  };

  const handleSaveBranchGeo = async (branchId) => {
    if (!branchGeo.geoLat || !branchGeo.geoLng) {
      return toast('يرجى إدخال الإحداثيات أو استخدام موقعك الحالي', 'warning');
    }
    setBranchSaving(true);
    try {
      await Api.updateBranch(branchId, {
        ...branches.find(b => b.id === branchId),
        geoLat: parseFloat(branchGeo.geoLat),
        geoLng: parseFloat(branchGeo.geoLng),
        geoRadiusMeters: parseInt(branchGeo.geoRadiusMeters)
      });
      setBranches(prev => prev.map(b =>
        b.id === branchId
          ? { ...b, geoLat: parseFloat(branchGeo.geoLat), geoLng: parseFloat(branchGeo.geoLng), geoRadiusMeters: parseInt(branchGeo.geoRadiusMeters) }
          : b
      ));
      setEditingBranch(null);
      toast('✅ تم حفظ النطاق الجغرافي للفرع', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBranchSaving(false);
    }
  };

  const handleClearBranchGeo = async (branch) => {
    if (!window.confirm(`هل تريد إزالة النطاق الجغرافي من فرع "${branch.name}"؟`)) return;
    setBranchSaving(true);
    try {
      await Api.updateBranch(branch.id, { ...branch, geoLat: null, geoLng: null, geoRadiusMeters: null });
      setBranches(prev => prev.map(b =>
        b.id === branch.id ? { ...b, geoLat: null, geoLng: null, geoRadiusMeters: null } : b
      ));
      toast('تم حذف النطاق الجغرافي للفرع', 'warning');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBranchSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="page-section anim-fade-in" style={{ direction: 'rtl', maxWidth: '900px' }}>

      {/* رأس الصفحة */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #f43f5e, #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', boxShadow: '0 8px 24px rgba(244,63,94,0.35)'
          }}>🔒</div>
          <div>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.6rem' }}>إعدادات أمان الحضور</h1>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-dim)' }}>
              إدارة IP Whitelist والنطاق الجغرافي لكل فرع
            </p>
          </div>
        </div>

        <button 
          className="btn btn-ghost"
          onClick={() => window.location.href = '/attendance/violations-log'}
          style={{ height: '44px', padding: '0 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: '#ef4444' }}
        >
          🚨 عرض سجل المخالفات
        </button>
      </div>

      {/* ═══ قسم الـ IP Whitelist ═══════════════════════════════════════════ */}
      <div className="card" style={{ borderRadius: '20px', marginBottom: '24px', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.3rem' }}>🌐</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>قائمة IPs المسموح بها</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                إذا كانت القائمة فارغة → يُرفض تسجيل الحضور من أي IP
              </p>
            </div>
          </div>
          <span style={{
            padding: '4px 12px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: '700',
            background: allowedIps.length > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: allowedIps.length > 0 ? '#4ade80' : '#f87171',
            border: `1px solid ${allowedIps.length > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
          }}>
            {allowedIps.length > 0 ? `${allowedIps.length} IP مسموح` : '⚠ لا توجد IPs — كل الطلبات مرفوضة'}
          </span>
        </div>

        <div style={{ padding: '24px' }}>
          {ipLoading ? <Loader /> : (
            <>
              {/* قائمة الـ IPs */}
              {allowedIps.length === 0 ? (
                <div style={{
                  padding: '24px', textAlign: 'center', borderRadius: '12px',
                  background: 'rgba(239,68,68,0.05)', border: '1px dashed rgba(239,68,68,0.3)',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⛔</div>
                  <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                    لا توجد IPs مُضافة — جميع طلبات الحضور ستُرفض تلقائياً
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {allowedIps.map(ip => (
                    <div key={ip} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px', borderRadius: '10px',
                      background: 'rgba(34,197,94,0.06)',
                      border: '1px solid rgba(34,197,94,0.2)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1rem' }}>✅</span>
                        <code style={{ fontSize: '0.95rem', color: '#4ade80', fontFamily: 'monospace' }}>{ip}</code>
                      </div>
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ height: '32px', padding: '0 12px', borderRadius: '8px' }}
                        onClick={() => handleRemoveIp(ip)}
                        disabled={removingIp === ip}
                      >
                        {removingIp === ip ? '...' : '🗑'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* إضافة IP جديد */}
              <div style={{
                padding: '16px', borderRadius: '12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)'
              }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '10px', fontWeight: '600' }}>
                  إضافة IP جديد
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="form-control"
                    value={newIp}
                    onChange={e => setNewIp(e.target.value)}
                    placeholder="مثال: 192.168.1.100"
                    style={{ flex: 1, height: '44px', fontFamily: 'monospace' }}
                    onKeyDown={e => e.key === 'Enter' && handleAddIp()}
                  />
                  <button
                    className="btn btn-ghost"
                    style={{ height: '44px', padding: '0 14px', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                    onClick={useCurrentIp}
                    title="جلب الـ IP الحالي"
                  >
                    📡 IP الحالي
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ height: '44px', padding: '0 20px' }}
                    onClick={handleAddIp}
                    disabled={ipSaving || !newIp.trim()}
                  >
                    {ipSaving ? '...' : '+ إضافة'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ قسم الـ Geofencing العام ════════════════════════════════════════ */}
      <div className="card" style={{ borderRadius: '20px', marginBottom: '24px', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.3rem' }}>📍</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>التحقق الجغرافي</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                عند التفعيل: يجب أن يكون الموظف داخل نطاق الفرع للتسجيل
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          {geoLoading ? (
            <div style={{ width: '60px', height: '30px', background: 'var(--bg-elevated)', borderRadius: '99px' }} />
          ) : (
            <button
              onClick={handleGeoToggle}
              disabled={geoSaving}
              style={{
                width: '64px', height: '32px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                background: geoEnabled ? '#22c55e' : 'var(--bg-elevated)',
                transition: 'background 0.3s ease',
                position: 'relative', padding: 0
              }}
            >
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px',
                right: geoEnabled ? '35px' : '3px',
                transition: 'right 0.3s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }} />
            </button>
          )}
        </div>

        {geoEnabled && (
          <div style={{ padding: '0 24px 20px' }}>
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
              fontSize: '0.83rem', color: '#86efac'
            }}>
              ✅ التحقق الجغرافي مُفعَّل — سيتم إرسال إشعار للمدير إذا سجّل موظف من خارج النطاق
            </div>
          </div>
        )}
      </div>

      {/* ═══ النطاق الجغرافي لكل فرع ══════════════════════════════════════════ */}
      <div className="card" style={{ borderRadius: '20px', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.3rem' }}>🏢</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>النطاق الجغرافي لكل فرع</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                حدّد مركز ونصف قطر المنطقة المسموح للموظفين بالتسجيل منها
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {branchesLoading ? <Loader /> : branches.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>لا توجد فروع مُعرَّفة</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {branches.map(branch => (
                <div key={branch.id} style={{
                  borderRadius: '14px', overflow: 'hidden',
                  border: `1px solid ${branch.geoLat ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)'}`,
                  background: 'var(--bg-elevated)'
                }}>
                  {/* رأس الفرع */}
                  <div style={{
                    padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: branch.geoLat ? 'rgba(34,197,94,0.05)' : 'transparent'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: branch.geoLat ? '#22c55e' : '#6b7280',
                        display: 'inline-block'
                      }} />
                      <strong style={{ fontSize: '0.95rem' }}>{branch.name}</strong>
                      {branch.geoLat ? (
                        <span style={{ fontSize: '0.72rem', color: '#86efac', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '99px' }}>
                          ✅ نطاق محدد — {branch.geoRadiusMeters}م
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af', background: 'rgba(107,114,128,0.1)', padding: '2px 8px', borderRadius: '99px' }}>
                          ⚪ بلا قيد جغرافي
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ height: '32px', padding: '0 14px', borderRadius: '8px', fontSize: '0.8rem' }}
                        onClick={() => editingBranch === branch.id ? setEditingBranch(null) : startEditBranch(branch)}
                      >
                        {editingBranch === branch.id ? '✕ إلغاء' : '✏️ تعديل'}
                      </button>
                      {branch.geoLat && (
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ height: '32px', padding: '0 10px', borderRadius: '8px', fontSize: '0.8rem' }}
                          onClick={() => handleClearBranchGeo(branch)}
                          disabled={branchSaving}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>

                  {/* معلومات جغرافية موجودة */}
                  {branch.geoLat && editingBranch !== branch.id && (
                    <div style={{ padding: '10px 18px 14px', display: 'flex', gap: '20px', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      <span>📌 lat: <code style={{ color: '#86efac' }}>{branch.geoLat}</code></span>
                      <span>📌 lng: <code style={{ color: '#86efac' }}>{branch.geoLng}</code></span>
                      <span>⭕ نصف القطر: <code style={{ color: '#86efac' }}>{branch.geoRadiusMeters}م</code></span>
                    </div>
                  )}

                  {/* نموذج التعديل */}
                  {editingBranch === branch.id && (
                    <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '12px', marginBottom: '14px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>خط العرض (Latitude)</label>
                          <input
                            type="number" step="0.000001"
                            className="form-control"
                            style={{ height: '40px', fontFamily: 'monospace' }}
                            value={branchGeo.geoLat}
                            onChange={e => setBranchGeo(p => ({ ...p, geoLat: e.target.value }))}
                            placeholder="30.044443"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>خط الطول (Longitude)</label>
                          <input
                            type="number" step="0.000001"
                            className="form-control"
                            style={{ height: '40px', fontFamily: 'monospace' }}
                            value={branchGeo.geoLng}
                            onChange={e => setBranchGeo(p => ({ ...p, geoLng: e.target.value }))}
                            placeholder="31.235753"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>نصف القطر (م)</label>
                          <input
                            type="number" min="10" max="10000"
                            className="form-control"
                            style={{ height: '40px' }}
                            value={branchGeo.geoRadiusMeters}
                            onChange={e => setBranchGeo(p => ({ ...p, geoRadiusMeters: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* خريطة اختيار الموقع */}
                      <div style={{ 
                        height: '250px', width: '100%', marginBottom: '14px', 
                        borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)',
                        direction: 'ltr' 
                      }}>
                        <MapContainer 
                          center={branchGeo.geoLat ? [branchGeo.geoLat, branchGeo.geoLng] : [30.0444, 31.2357]} 
                          zoom={branchGeo.geoLat ? 16 : 6} 
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          />
                          <LocationPicker 
                            lat={parseFloat(branchGeo.geoLat)} 
                            lng={parseFloat(branchGeo.geoLng)} 
                            radius={parseFloat(branchGeo.geoRadiusMeters)} 
                            onChange={(lat, lng) => setBranchGeo(p => ({ ...p, geoLat: lat.toFixed(6), geoLng: lng.toFixed(6) }))}
                          />
                        </MapContainer>
                      </div>

                      {/* خيار نصف القطر السريع */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        {[50, 100, 200, 500, 1000].map(r => (
                          <button
                            key={r}
                            className={`btn btn-sm ${parseInt(branchGeo.geoRadiusMeters) === r ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ height: '30px', padding: '0 12px', borderRadius: '8px', fontSize: '0.78rem' }}
                            onClick={() => setBranchGeo(p => ({ ...p, geoRadiusMeters: r }))}
                          >
                            {r}م
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ height: '40px', padding: '0 16px', fontSize: '0.85rem', flex: 1 }}
                          onClick={handleGetBranchLocation}
                        >
                          📡 استخدم موقعي الحالي
                        </button>
                        <button
                          className="btn btn-success"
                          style={{ height: '40px', padding: '0 24px' }}
                          onClick={() => handleSaveBranchGeo(branch.id)}
                          disabled={branchSaving}
                        >
                          {branchSaving ? 'جارٍ الحفظ...' : '💾 حفظ النطاق'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceSettings;
