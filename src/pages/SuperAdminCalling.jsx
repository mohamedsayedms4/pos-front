import React, { useState, useEffect } from 'react';
import Api from '../services/api';

const CLOUDWA_BASE = 'https://dashboard.cloudwa.net';

const cloudWaFetch = async (endpoint, options = {}) => {
  const apiKey = localStorage.getItem('cloudwa_api_key') || '';
  const res = await fetch(`${CLOUDWA_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`CloudWA Error: ${res.status}`);
  return res.json();
};

const TABS = [
  { id: 'call-logs', label: 'سجل المكالمات', icon: 'fa-phone-volume' },
  { id: 'ivr', label: 'IVR Flows', icon: 'fa-diagram-project' },
  { id: 'transfers', label: 'تحويل المكالمات', icon: 'fa-phone-arrow-right' },
];

// ─── Call Logs ───────────────────────────────────────────────────
const CallLogsTab = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCalls(); }, []);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const data = await cloudWaFetch('/api/calling/logs?limit=50');
      setCalls(data?.data?.calls || data?.calls || []);
    } catch (e) {
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const DIRECTION_ICON = { inbound: 'fa-phone-arrow-down-left', outbound: 'fa-phone-arrow-up-right' };
  const DIRECTION_COLOR = { inbound: '#10b981', outbound: '#3b82f6' };
  const STATUS_BADGE = {
    answered: { label: 'تم الرد', color: '#10b981' },
    missed: { label: 'لم يُرد', color: '#ef4444' },
    busy: { label: 'مشغول', color: '#f59e0b' },
    failed: { label: 'فشل', color: '#6b7280' },
  };

  const formatDuration = (secs) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h4 style={{ margin: 0 }}><i className="fa-solid fa-phone-volume"></i> سجل المكالمات</h4>
        <button className="btn btn-ghost" onClick={fetchCalls}><i className="fa-solid fa-rotate-right"></i> تحديث</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>جاري التحميل...</div>
      ) : calls.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-phone-slash" style={{ fontSize: '3rem', marginBottom: 16, display: 'block', opacity: 0.4 }}></i>
          <p style={{ fontSize: '1rem' }}>لا توجد مكالمات مسجلة</p>
          <p style={{ fontSize: '0.82rem', opacity: 0.7 }}>تأكد من إعداد CloudWA API Key في الإعدادات</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الاتجاه</th>
                <th>رقم الهاتف</th>
                <th>الحالة</th>
                <th>المدة</th>
                <th>التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(c => {
                const badge = STATUS_BADGE[c.status] || { label: c.status, color: '#6b7280' };
                return (
                  <tr key={c.id}>
                    <td>
                      <span style={{ color: DIRECTION_COLOR[c.direction] || '#6b7280', fontSize: '1rem' }}>
                        <i className={`fa-solid ${DIRECTION_ICON[c.direction] || 'fa-phone'}`}></i>
                      </span>
                      <span style={{ marginRight: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {c.direction === 'inbound' ? 'واردة' : 'صادرة'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', direction: 'ltr', textAlign: 'right', fontWeight: 600 }}>{c.phone_number || c.from || '—'}</td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, background: `${badge.color}22`, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{formatDuration(c.duration)}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleString('ar-EG') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── IVR Flows ────────────────────────────────────────────────────
const IvrFlowsTab = () => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFlows(); }, []);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const data = await cloudWaFetch('/api/flows?limit=30');
      setFlows(data?.data?.flows || data?.flows || []);
    } catch (e) {
      setFlows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h4 style={{ margin: 0 }}><i className="fa-solid fa-diagram-project"></i> IVR Flows</h4>
        <button className="btn btn-ghost" onClick={fetchFlows}><i className="fa-solid fa-rotate-right"></i> تحديث</button>
      </div>

      {/* Info Banner */}
      <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <i className="fa-solid fa-circle-info" style={{ color: '#3b82f6', fontSize: '1.2rem', flexShrink: 0 }}></i>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          يتم إدارة IVR Flows من خلال <a href="https://dashboard.cloudwa.net/flows" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>لوحة تحكم CloudWA</a>. البيانات هنا للعرض فقط.
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>جاري التحميل...</div>
      ) : flows.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-diagram-project" style={{ fontSize: '3rem', marginBottom: 16, display: 'block', opacity: 0.4 }}></i>
          <p>لا توجد IVR Flows</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {flows.map(f => (
            <div key={f.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{f.name}</div>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: f.status === 'active' ? '#10b98122' : '#6b728022', color: f.status === 'active' ? '#10b981' : '#6b7280' }}>
                  {f.status === 'active' ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{f.description || 'لا يوجد وصف'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <i className="fa-solid fa-clock" style={{ marginLeft: 4 }}></i>
                {f.created_at ? new Date(f.created_at).toLocaleDateString('ar-EG') : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Call Transfers ────────────────────────────────────────────────
const CallTransfersTab = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ from: '', to: '', note: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchTransfers(); }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const data = await cloudWaFetch('/api/calling/transfers?limit=30');
      setTransfers(data?.data?.transfers || data?.transfers || []);
    } catch (e) {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await cloudWaFetch('/api/calling/transfer', {
        method: 'POST',
        body: JSON.stringify({ from_number: form.from, to_number: form.to, note: form.note }),
      });
      alert('تم إنشاء التحويل بنجاح!');
      setShowForm(false);
      setForm({ from: '', to: '', note: '' });
      fetchTransfers();
    } catch (e) {
      alert('فشل التحويل: ' + e.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h4 style={{ margin: 0 }}><i className="fa-solid fa-phone-arrow-right"></i> تحويل المكالمات</h4>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fa-solid fa-plus"></i> تحويل جديد
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <form onSubmit={handleTransfer}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>من (رقم المصدر)</label>
                <input type="text" className="form-control" placeholder="201xxxxxxxxx" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>إلى (رقم الوجهة)</label>
                <input type="text" className="form-control" placeholder="201xxxxxxxxx" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} required />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>ملاحظة (اختياري)</label>
              <input type="text" className="form-control" placeholder="سبب التحويل..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary">تأكيد التحويل</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>جاري التحميل...</div>
      ) : transfers.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-phone-arrow-right" style={{ fontSize: '3rem', marginBottom: 16, display: 'block', opacity: 0.4 }}></i>
          <p>لا توجد تحويلات مسجلة</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>من</th>
              <th>إلى</th>
              <th>ملاحظة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map(t => (
              <tr key={t.id}>
                <td style={{ fontFamily: 'monospace', direction: 'ltr', textAlign: 'right' }}>{t.from_number || '—'}</td>
                <td style={{ fontFamily: 'monospace', direction: 'ltr', textAlign: 'right' }}>{t.to_number || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.note || '—'}</td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t.created_at ? new Date(t.created_at).toLocaleString('ar-EG') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────
const SuperAdminCalling = () => {
  const [activeTab, setActiveTab] = useState('call-logs');

  if (!Api.isSuperAdmin || !Api.isSuperAdmin()) return null;

  return (
    <div className="page-section" style={{ direction: 'rtl' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8, #3b82f6)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16, color: '#fff',
      }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
          <i className="fa-solid fa-phone"></i>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>إدارة المكالمات — CALLING</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '0.9rem' }}>سجل المكالمات • IVR Flows • تحويل المكالمات</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-elevated)', borderRadius: 10, padding: 4, border: '1px solid var(--border-subtle)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '10px 8px', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '0.88rem',
              background: activeTab === tab.id ? '#1d4ed8' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card" style={{ padding: 20 }}>
        {activeTab === 'call-logs' && <CallLogsTab />}
        {activeTab === 'ivr' && <IvrFlowsTab />}
        {activeTab === 'transfers' && <CallTransfersTab />}
      </div>
    </div>
  );
};

export default SuperAdminCalling;
