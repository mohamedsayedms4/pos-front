import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Api from '../services/api';

// ألوان مخصصة للدبابيس
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ViolationMap = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));
  const bLat = parseFloat(searchParams.get('bLat'));
  const bLng = parseFloat(searchParams.get('bLng'));
  const bRad = parseFloat(searchParams.get('bRad'));
  const empName = searchParams.get('empName') || 'الموظف';

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التأكد من وجود كل الإحداثيات اللازمة
    if (!lat || !lng || !bLat || !bLng || !bRad) {
      navigate('/');
    } else {
      setLoading(false);
    }
  }, [lat, lng, bLat, bLng, bRad, navigate]);

  if (loading) return null;

  return (
    <div className="page-section anim-fade-in" style={{ direction: 'rtl', maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => navigate(-1)} 
          style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}
        >
          →
        </button>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.5rem', color: '#ef4444' }}>
            ⚠️ مخالفة النطاق الجغرافي
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dim)' }}>
            محاولة تسجيل حضور من خارج النطاق الخاص بالفرع
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '20px', borderRadius: '16px', marginBottom: '20px', background: 'var(--bg-dark)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
          <div style={{ flex: 1, minWidth: '200px', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>الموظف</span>
            <strong style={{ fontSize: '1.1rem' }}>{empName}</strong>
          </div>
          <div style={{ flex: 1, minWidth: '200px', background: 'rgba(239,68,68,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span style={{ fontSize: '0.8rem', color: '#ef4444', display: 'block', marginBottom: '4px' }}>موقع المحاولة (الموظف)</span>
            <code style={{ fontSize: '0.9rem', color: '#ef4444' }}>{lat.toFixed(5)}, {lng.toFixed(5)}</code>
          </div>
          <div style={{ flex: 1, minWidth: '200px', background: 'rgba(34,197,94,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span style={{ fontSize: '0.8rem', color: '#22c55e', display: 'block', marginBottom: '4px' }}>مركز الفرع والنطاق</span>
            <code style={{ fontSize: '0.9rem', color: '#22c55e' }}>{bLat.toFixed(5)}, {bLng.toFixed(5)}</code>
            <span style={{ fontSize: '0.8rem', color: '#22c55e', display: 'block', marginTop: '4px' }}>الحد الأقصى: {bRad} متر</span>
          </div>
        </div>

        {/* الخريطة */}
        <div style={{ height: '500px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <MapContainer 
            center={[(lat + bLat) / 2, (lng + bLng) / 2]} 
            zoom={14} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            {/* دبوس ونطاق الفرع */}
            <Marker position={[bLat, bLng]} icon={greenIcon}>
              <Popup>
                <strong>مركز الفرع</strong><br/>
                النطاق المسموح: {bRad} متر
              </Popup>
            </Marker>
            <Circle 
              center={[bLat, bLng]} 
              radius={bRad} 
              pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.2 }} 
            />

            {/* دبوس موقع محاولة الموظف */}
            <Marker position={[lat, lng]} icon={redIcon}>
              <Popup>
                <strong>موقع {empName}</strong><br/>
                (خارج النطاق المسموح)
              </Popup>
            </Marker>
            
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default ViolationMap;
