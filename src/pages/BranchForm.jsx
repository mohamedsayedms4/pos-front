import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/pages/SettingsPremium.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};



const BranchForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { toast } = useGlobalUI();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const isWarehouse = location.pathname.includes('/warehouses');

  const initialFormData = {
    code: '',
    name: '',
    address: '',
    phone: '',
    type: isWarehouse ? 'WAREHOUSE_ONLY' : 'RETAIL',
    active: true,
    treasuryLinkType: 'AUTOMATIC', // Defaulting to AUTOMATIC to match design checked state
    geoLat: '',
    geoLng: '',
    geoRadiusMeters: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [geoErrors, setGeoErrors] = useState({});
  const [mapPosition, setMapPosition] = useState(null);
  const [activeSection, setActiveSection] = useState('basic');

  // ScrollSpy
  useEffect(() => {
    const sectionIds = ['basic', 'treasury', 'geo'];
    const observers = sectionIds.map((sid) => {
      const el = document.getElementById(sid);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(sid); },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0.01 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, [loading]);

  const scrollTo = (sid) => {
    document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(sid);
  };

  useEffect(() => {
    if (id) {
      const fetchBranch = async () => {
        try {
          const branch = await Api.getBranchById(id);
          if (branch) {
            setFormData({
              code: branch.code || '',
              name: branch.name || '',
              address: branch.address || '',
              phone: branch.phone || '',
              type: branch.type || 'RETAIL',
              active: branch.active ?? true,
              treasuryLinkType: branch.treasuryLinkType || 'AUTOMATIC',
              geoLat: branch.geoLat != null ? String(branch.geoLat) : '',
              geoLng: branch.geoLng != null ? String(branch.geoLng) : '',
              geoRadiusMeters: branch.geoRadiusMeters != null ? String(branch.geoRadiusMeters) : ''
            });
            if (branch.geoLat != null && branch.geoLng != null) {
              setMapPosition({ lat: parseFloat(branch.geoLat), lng: parseFloat(branch.geoLng) });
              setShowMap(true);
            }
          }
        } catch (err) {
          toast(err.message, 'error');
        } finally {
          setLoading(false);
        }
      };
      fetchBranch();
    }
  }, [id]);



  const validateGeoFields = () => {
    const errors = {};
    const { geoLat, geoLng, geoRadiusMeters } = formData;
    
    if (geoLat !== '' && geoLat != null) {
      const lat = parseFloat(geoLat);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.geoLat = 'خط العرض يجب أن يكون بين -90 و 90';
      }
    }
    if (geoLng !== '' && geoLng != null) {
      const lng = parseFloat(geoLng);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.geoLng = 'خط الطول يجب أن يكون بين -180 و 180';
      }
    }
    if (geoRadiusMeters !== '' && geoRadiusMeters != null) {
      const r = parseInt(geoRadiusMeters, 10);
      if (isNaN(r) || r <= 0) {
        errors.geoRadiusMeters = 'نصف القطر يجب أن يكون رقم موجب';
      }
    }
    
    // If any geo field is filled, lat and lng are required together
    const hasAnyGeo = geoLat !== '' || geoLng !== '' || geoRadiusMeters !== '';
    if (hasAnyGeo) {
      if (geoLat === '' || geoLat == null) errors.geoLat = 'خط العرض مطلوب عند تحديد الموقع';
      if (geoLng === '' || geoLng == null) errors.geoLng = 'خط الطول مطلوب عند تحديد الموقع';
    }
    
    setGeoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    if (!validateGeoFields()) return;
    
    setSaving(true);
    try {
      // Build payload, converting geo strings to numbers (or null)
      const payload = {
        ...formData,
        geoLat: formData.geoLat !== '' ? parseFloat(formData.geoLat) : null,
        geoLng: formData.geoLng !== '' ? parseFloat(formData.geoLng) : null,
        geoRadiusMeters: formData.geoRadiusMeters !== '' ? parseInt(formData.geoRadiusMeters, 10) : null
      };
      
      if (id) {
        await Api._request(`/branches/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast(isWarehouse ? 'تم تحديث المخزن بنجاح' : 'تم تحديث الفرع بنجاح', 'success');
      } else {
        await Api._request('/branches', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast(isWarehouse ? 'تم إضافة المخزن بنجاح' : 'تم إضافة الفرع بنجاح', 'success');
      }
      
      if (addAnother && !id) {
         setFormData(initialFormData);
         setMapPosition(null);
         setShowMap(false);
         window.scrollTo(0, 0);
         return;
      }

      // Redirect to dashboard if in onboarding
      const onboardingStr = localStorage.getItem('onboardingStatus');
      if (onboardingStr) {
          const obs = JSON.parse(onboardingStr);
          if (!obs.completed) {
              navigate('/dashboard');
              return;
          }
      }
      navigate(isWarehouse ? '/warehouses' : '/branches');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader message="جاري التحميل..." />;

  const sections = [
    { id: 'basic',    label: 'البيانات الأساسية', icon: 'fa-solid fa-building' },
    { id: 'treasury', label: 'إعدادات الخزينة',   icon: 'fa-solid fa-landmark' },
    { id: 'geo',      label: 'الموقع الجغرافي',   icon: 'fa-solid fa-location-dot' },
  ];


  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', paddingBottom: '60px' }}>

      {/* ── Sticky Page Header ── */}
      <div className="settings-page-header" style={{ padding: '14px 24px', marginBottom: 0 }}>
        <div>
          <span className="settings-eyebrow">{isWarehouse ? 'إدارة المخازن' : 'إدارة الفروع'}</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px,2vw,28px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {id ? (isWarehouse ? 'تعديل بيانات المخزن' : 'تعديل بيانات الفرع') : (isWarehouse ? 'إضافة مخزن جديد' : 'إضافة فرع جديد')}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #697386)', fontSize: 14 }}>
            {isWarehouse ? 'أدخل بيانات المخزن وإعداداته الأساسية' : 'أدخل بيانات الفرع وإعداداته الأساسية'}
          </p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-seggele btn-seggele--secondary"
            type="button"
            onClick={() => navigate(isWarehouse ? '/warehouses' : '/branches')}
            disabled={saving}
          >
            <i className="fa-solid fa-arrow-right"></i> إلغاء
          </button>
          {!id && (
            <button
              className="btn-seggele btn-seggele--secondary"
              type="button"
              onClick={(e) => handleSave(e, true)}
              disabled={saving}
            >
              <i className="fa-solid fa-plus"></i> حفظ وإضافة آخر
            </button>
          )}
          <button
            className="btn-seggele btn-seggele--primary"
            type="submit"
            form="branchForm"
            disabled={saving}
          >
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...</>
              : <><i className="fa-solid fa-check"></i> {id ? 'حفظ التعديلات' : (isWarehouse ? 'حفظ المخزن' : 'حفظ الفرع')}</>
            }
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="settings-layout" style={{ padding: '24px' }}>

        {/* ── Sidebar Nav ── */}
        <aside className="settings-nav">
          <nav>
            {sections.map(({ id: sid, label, icon }) => (
              <button
                key={sid}
                type="button"
                className={`section-link ${activeSection === sid ? 'active' : ''}`}
                onClick={() => scrollTo(sid)}
              >
                <i className={icon}></i>
                <span>{label}</span>
                {activeSection === sid && <span className="active-dot" />}
              </button>
            ))}
          </nav>
          <div className="security-note" style={{ marginTop: 14 }}>
            <i className="fa-solid fa-shield-halved" style={{ marginTop: 2 }}></i>
            <div>
              <strong>بياناتك محمية</strong>
              <p>يتم حفظ التغييرات بشكل آمن وتشفير البيانات بالنظام.</p>
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="settings-content">
          <form id="branchForm" onSubmit={(e) => handleSave(e, false)}>

            {/* ─ 1. Basic Data ─ */}
            <div id="basic" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>البيانات الأساسية</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>{isWarehouse ? 'المعلومات الجوهرية التي تُعرّف المخزن داخل النظام.' : 'المعلومات الجوهرية التي تُعرّف الفرع داخل النظام.'}</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="branchName">{isWarehouse ? 'اسم المخزن' : 'اسم الفرع'} <span className="required">*</span></label>
                      <input
                        id="branchName"
                        placeholder={isWarehouse ? "مثال: مخزن أكتوبر الرئيسي" : "مثال: فرع مدينة نصر"}
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="branchCode">
                        {isWarehouse ? 'كود المخزن' : 'كود الفرع'} <span className="required">*</span>
                        <span style={{ fontSize:'0.8rem', fontWeight:'normal', marginRight: 6, color: 'var(--muted,#697386)' }}>(للتعريف داخل النظام)</span>
                      </label>
                      <input
                        id="branchCode"
                        placeholder={isWarehouse ? "WH-001" : "BR-001"}
                        value={formData.code}
                        onChange={e => setFormData({...formData, code: e.target.value})}
                        required
                      />
                    </div>
                    <div className="field field--full" style={{ display: isWarehouse ? 'none' : 'block' }}>
                      <label htmlFor="branchType">نوع الفرع <span className="required">*</span></label>
                      <div className="select-wrap">
                        <select
                          id="branchType"
                          value={formData.type}
                          onChange={e => setFormData({...formData, type: e.target.value})}
                        >
                          <option value="RETAIL">فرع تجزئة (بيع مباشر)</option>
                          <option value="WAREHOUSE_ONLY">مخزن فقط</option>
                          <option value="ONLINE">متجر إلكتروني</option>
                        </select>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                    <div className="field field--full">
                      <label htmlFor="branchAddress">العنوان</label>
                      <input
                        id="branchAddress"
                        placeholder={isWarehouse ? "أدخل عنوان المخزن بالتفصيل" : "أدخل عنوان الفرع بالتفصيل"}
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                    <div className="field field--full">
                      <label htmlFor="branchPhone">رقم الهاتف</label>
                      <input
                        id="branchPhone"
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ─ 2. Treasury ─ */}
            <div id="treasury" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>إعدادات الخزينة</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>{isWarehouse ? 'اختر طريقة ربط حركات هذا المخزن بخزينة النظام.' : 'اختر طريقة ربط حركات هذا الفرع بخزينة النظام.'}</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="radio-cards" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <button
                      type="button"
                      className={`radio-card ${formData.treasuryLinkType === 'AUTOMATIC' ? 'active' : ''}`}
                      onClick={() => setFormData({...formData, treasuryLinkType: 'AUTOMATIC'})}
                    >
                      <span className="radio-dot">{formData.treasuryLinkType === 'AUTOMATIC' && <span/>}</span>
                      <span className="radio-copy">
                        <strong>تلقائي</strong>
                        <small>{isWarehouse ? 'يعكس حركات المخزن في الخزينة الرئيسية لحظياً.' : 'يعكس حركات الفرع في الخزينة الرئيسية لحظياً.'}</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`radio-card ${formData.treasuryLinkType === 'MANUAL' ? 'active' : ''}`}
                      onClick={() => setFormData({...formData, treasuryLinkType: 'MANUAL'})}
                    >
                      <span className="radio-dot">{formData.treasuryLinkType === 'MANUAL' && <span/>}</span>
                      <span className="radio-copy">
                        <strong>يدوي</strong>
                        <small>يتم توريد المبالغ للمركزية يدوياً.</small>
                      </span>
                    </button>
                  </div>

                  <div className="divider"></div>

                  {/* Active toggle */}
                  <div className="switch-row">
                    <div className="switch-copy">
                      <span className="switch-icon"><i className="fa-solid fa-toggle-on"></i></span>
                      <div>
                        <strong>{isWarehouse ? 'المخزن نشط' : 'الفرع نشط'}</strong>
                        <p>{isWarehouse ? 'يمكنك إيقاف المخزن لاحقاً من الإعدادات.' : 'يمكنك إيقاف الفرع لاحقاً من الإعدادات.'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.active}
                      className={`switch-btn ${formData.active ? 'switch-btn--active' : ''}`}
                      onClick={() => setFormData({...formData, active: !formData.active})}
                    >
                      <span/>
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* ─ 3. Geo Location ─ */}
            <div id="geo" style={{ scrollMarginTop: 120 }}>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>الموقع الجغرافي <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted,#697386)', background: 'var(--surface-2,#f8fafc)', border: '1px solid var(--border,#e3e9f2)', padding: '2px 8px', borderRadius: 6, marginRight: 8, verticalAlign: 'middle' }}>اختياري</span></h2>
                  <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>{isWarehouse ? 'حدّد نطاق المخزن الجغرافي لتسجيل الحضور عبر الموقع.' : 'حدّد نطاق الفرع الجغرافي لتسجيل الحضور عبر الموقع.'}</p>
                </div>
              </div>
              <section className="settings-card">
              <div className="card-body">
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <button
                    type="button"
                    className="btn-seggele btn-seggele--secondary"
                    onClick={() => setShowMap(!showMap)}
                  >
                    <i className="fa-solid fa-map-location-dot"></i>
                    {showMap ? 'إخفاء الخريطة' : 'تحديد على الخريطة'}
                  </button>
                </div>

                {showMap && (
                  <div style={{ height: 320, width: '100%', marginBottom: 20, overflow: 'hidden', border: '1px solid var(--border,#e3e9f2)', zIndex: 0 }}>
                    <MapContainer center={mapPosition || [30.0444, 31.2357]} zoom={13} style={{ height: '100%', width: '100%' }}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationMarker
                        position={mapPosition}
                        setPosition={(pos) => {
                          setMapPosition(pos);
                          setFormData(prev => ({ ...prev, geoLat: String(pos.lat), geoLng: String(pos.lng) }));
                          setGeoErrors(prev => ({ ...prev, geoLat: undefined, geoLng: undefined }));
                        }}
                      />
                      {mapPosition && formData.geoRadiusMeters && !isNaN(parseInt(formData.geoRadiusMeters)) && (
                        <Circle center={mapPosition} radius={parseInt(formData.geoRadiusMeters)} />
                      )}
                    </MapContainer>
                  </div>
                )}

                <div className="form-grid">
                  <div className="field">
                    <label>خط العرض (Latitude)</label>
                    <input
                      type="number" step="any"
                      placeholder="سيتم تحديده من الخريطة"
                      value={formData.geoLat}
                      readOnly
                      style={geoErrors.geoLat ? { borderColor: '#ef4444' } : {}}
                    />
                    {geoErrors.geoLat && <p className="field-error">{geoErrors.geoLat}</p>}
                  </div>
                  <div className="field">
                    <label>خط الطول (Longitude)</label>
                    <input
                      type="number" step="any"
                      placeholder="سيتم تحديده من الخريطة"
                      value={formData.geoLng}
                      readOnly
                      style={geoErrors.geoLng ? { borderColor: '#ef4444' } : {}}
                    />
                    {geoErrors.geoLng && <p className="field-error">{geoErrors.geoLng}</p>}
                  </div>
                  <div className="field field--full">
                    <label>نصف القطر المسموح (بالمتر)</label>
                    <input
                      type="number" min="1"
                      placeholder="مثال: 500"
                      value={formData.geoRadiusMeters}
                      onChange={e => { setFormData({...formData, geoRadiusMeters: e.target.value}); setGeoErrors(prev => ({...prev, geoRadiusMeters: undefined})); }}
                      style={geoErrors.geoRadiusMeters ? { borderColor: '#ef4444' } : {}}
                    />
                    {geoErrors.geoRadiusMeters && <p className="field-error">{geoErrors.geoRadiusMeters}</p>}
                  </div>
                </div>

                <div className="integration-tip" style={{ marginTop: 16 }}>
                  <i className="fa-solid fa-circle-info"></i>
                  <span>يُستخدم هذا النطاق لتحديد الموقع المسموح لتسجيل الحضور. اترك الحقول فارغة إذا لم تكن بحاجة إلى قيد جغرافي.</span>
                </div>
              </div>
            </section>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default BranchForm;
