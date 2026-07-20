import React, { useState, useEffect, useRef } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';

const CLOUDWA_BASE = 'https://dashboard.cloudwa.net';

// ─── API Helper ────────────────────────────────────────────────────
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

// ─── Tabs ────────────────────────────────────────────────────────
const TABS = [
  { id: 'chat', label: 'المحادثات', icon: 'fa-comments' },
  { id: 'campaigns', label: 'الحملات', icon: 'fa-bullhorn' },
  { id: 'templates', label: 'القوالب', icon: 'fa-file-alt' },
  { id: 'settings', label: 'الإعدادات', icon: 'fa-cog' },
];

// ─── Chat Tab ───────────────────────────────────────────────────
const ChatTab = () => {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedContact) fetchMessages(selectedContact.id);
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const data = await cloudWaFetch('/api/contacts?limit=50');
      setContacts(data?.data?.contacts || data?.contacts || []);
    } catch (e) {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId) => {
    try {
      const data = await cloudWaFetch(`/api/contacts/${contactId}/messages?limit=50`);
      setMessages(data?.data?.messages || data?.messages || []);
    } catch (e) {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    setSending(true);
    try {
      await cloudWaFetch(`/api/contacts/${selectedContact.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ type: 'text', content: { body: newMessage } }),
      });
      setNewMessage('');
      await fetchMessages(selectedContact.id);
    } catch (e) {
      alert('فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const filtered = contacts.filter(c =>
    (c.name || c.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: '75vh', gap: 0, border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Contacts List */}
      <div style={{ width: 280, borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <input
            type="text"
            placeholder="🔍 بحث عن جهة اتصال..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-control"
            style={{ margin: 0, fontSize: '0.85rem' }}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد جهات اتصال</div>
          ) : filtered.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedContact(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)',
                background: selectedContact?.id === c.id ? 'rgba(37, 211, 102, 0.1)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #25d366, #128c7e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0,
              }}>
                {(c.name || c.phone || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name || c.phone}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.phone}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
        {!selectedContact ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-brands fa-whatsapp" style={{ fontSize: '4rem', color: '#25d366', marginBottom: 16 }}></i>
            <p style={{ fontSize: '1.1rem' }}>اختر جهة اتصال لبدء المحادثة</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #25d366, #128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                {(selectedContact.name || selectedContact.phone || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedContact.name || selectedContact.phone}</div>
                <div style={{ fontSize: '0.75rem', color: '#25d366' }}>WhatsApp</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.direction === 'outgoing' ? 'flex-start' : 'flex-end' }}>
                  <div style={{
                    maxWidth: '65%', padding: '8px 12px', borderRadius: m.direction === 'outgoing' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                    background: m.direction === 'outgoing' ? 'var(--bg-elevated)' : '#dcf8c6',
                    color: m.direction === 'outgoing' ? 'var(--text-main)' : '#1a1a1a',
                    fontSize: '0.88rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}>
                    {m.content?.body || m.content?.text || '—'}
                    <div style={{ fontSize: '0.7rem', color: m.direction === 'outgoing' ? 'var(--text-muted)' : '#666', marginTop: 4, textAlign: 'left' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="اكتب رسالتك هنا..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                className="form-control"
                style={{ margin: 0, flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                style={{ background: '#25d366', borderColor: '#25d366', minWidth: 60 }}
              >
                {sending ? '...' : <i className="fa-solid fa-paper-plane"></i>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Campaigns Tab ──────────────────────────────────────────────
const CampaignsTab = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phone_number: '', template_name: '', template_params: '{}' });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useGlobalUI();

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const data = await cloudWaFetch('/api/campaigns?limit=30');
      setCampaigns(data?.data?.campaigns || data?.campaigns || []);
    } catch (e) {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let params = {};
      try { params = JSON.parse(form.template_params); } catch {}
      await cloudWaFetch('/api/messages/template', {
        method: 'POST',
        body: JSON.stringify({
          phone_number: form.phone_number,
          template_name: form.template_name,
          template_params: params,
        }),
      });
      toast('تم إرسال الرسالة بنجاح!', 'success');
      setShowForm(false);
      setForm({ phone_number: '', template_name: '', template_params: '{}' });
      fetchCampaigns();
    } catch (e) {
      toast('فشل الإرسال: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h4 style={{ margin: 0 }}><i className="fa-solid fa-bullhorn"></i> حملات الواتساب</h4>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fa-solid fa-plus"></i> إرسال رسالة قالب
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h5 style={{ margin: '0 0 16px' }}><i className="fa-solid fa-paper-plane"></i> إرسال رسالة بقالب</h5>
          <form onSubmit={handleSend}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>رقم الهاتف (مع كود الدولة)</label>
              <input type="text" className="form-control" placeholder="20123456789" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>اسم القالب</label>
              <input type="text" className="form-control" placeholder="hello_world" value={form.template_name} onChange={e => setForm({ ...form, template_name: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>بارامترات القالب (JSON)</label>
              <textarea className="form-control" rows={3} value={form.template_params} onChange={e => setForm({ ...form, template_params: e.target.value })} placeholder='{"name": "أحمد", "order_id": "1234"}' />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'جاري الإرسال...' : 'إرسال'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>جاري التحميل...</div>
      ) : campaigns.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-inbox" style={{ fontSize: '2rem', marginBottom: 8, display: 'block' }}></i>
          لا توجد حملات حتى الآن
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>اسم الحملة</th>
                <th>الحالة</th>
                <th>المستلمون</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name || c.id}</td>
                  <td><span className={`badge badge-${c.status === 'completed' ? 'success' : c.status === 'failed' ? 'danger' : 'info'}`}>{c.status}</span></td>
                  <td>{c.total_recipients || '—'}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('ar-EG') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Templates Tab ──────────────────────────────────────────────
const TemplatesTab = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await cloudWaFetch('/api/templates?limit=50');
      setTemplates(data?.data?.templates || data?.templates || []);
    } catch (e) {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_COLOR = { APPROVED: '#10b981', REJECTED: '#ef4444', PENDING: '#f59e0b' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h4 style={{ margin: 0 }}><i className="fa-solid fa-file-alt"></i> قوالب الرسائل</h4>
        <button className="btn btn-ghost" onClick={fetchTemplates}><i className="fa-solid fa-rotate-right"></i> تحديث</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>جاري التحميل...</div>
      ) : templates.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-file-circle-xmark" style={{ fontSize: '2rem', marginBottom: 8, display: 'block' }}></i>
          لا توجد قوالب
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {templates.map(t => (
            <div key={t.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.language} • {t.category}</div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                  background: `${STATUS_COLOR[t.status] || '#6b7280'}22`,
                  color: STATUS_COLOR[t.status] || '#6b7280',
                }}>
                  {t.status}
                </span>
              </div>
              {t.components?.find(c => c.type === 'BODY') && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '8px 10px', borderRadius: 6, lineHeight: 1.6 }}>
                  {t.components.find(c => c.type === 'BODY').text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Settings Tab ───────────────────────────────────────────────
const SettingsTab = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('cloudwa_api_key') || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('cloudwa_api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ maxWidth: 540 }}>
      <h4 style={{ marginBottom: 20 }}><i className="fa-solid fa-cog"></i> إعدادات CloudWA</h4>

      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 24 }}>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
            <i className="fa-solid fa-key"></i> CloudWA API Key
          </label>
          <input
            type="password"
            className="form-control"
            placeholder="whm_xxxxxxxxxxxxxxxx"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />
          <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
            احصل على مفتاح API من <a href="https://dashboard.cloudwa.net/api-keys" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>لوحة تحكم CloudWA</a>
          </small>
        </div>

        <button className="btn btn-primary" onClick={handleSave} style={{ gap: 8 }}>
          {saved ? <><i className="fa-solid fa-check"></i> تم الحفظ!</> : <><i className="fa-solid fa-save"></i> حفظ الإعدادات</>}
        </button>
      </div>

      <div style={{ marginTop: 20, background: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 10, padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#25d366' }}>
          <i className="fa-brands fa-whatsapp"></i> CloudWA API — الميزات المدعومة
        </div>
        <ul style={{ margin: 0, paddingRight: 20, color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 2 }}>
          <li>إرسال رسائل نصية مباشرة</li>
          <li>إرسال قوالب واتساب (Templates)</li>
          <li>إرسال ملفات ووسائط (Media)</li>
          <li>إدارة جهات الاتصال</li>
          <li>الحملات الجماعية</li>
        </ul>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────
const SuperAdminWhatsApp = () => {
  const [activeTab, setActiveTab] = useState('chat');

  if (!Api.isSuperAdmin || !Api.isSuperAdmin()) return null;

  return (
    <div className="page-section" style={{ direction: 'rtl' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #075e54, #128c7e, #25d366)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16, color: '#fff',
      }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
          <i className="fa-brands fa-whatsapp"></i>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>واتساب بيزنس — CloudWA</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '0.9rem' }}>إدارة المحادثات والحملات والقوالب عبر CloudWA API</p>
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
              background: activeTab === tab.id ? '#25d366' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card" style={{ padding: 20 }}>
        {activeTab === 'chat' && <ChatTab />}
        {activeTab === 'campaigns' && <CampaignsTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
};

export default SuperAdminWhatsApp;
