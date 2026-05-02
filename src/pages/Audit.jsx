import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import '../styles/pages/AuditPremium.css';

const Audit = () => {
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 15;

  const loadData = async (page) => {
    setLoading(true);
    try {
      const logsData = await Api.getAuditLogs(page, pageSize);
      setData(Array.isArray(logsData) ? logsData : (logsData.content || logsData.items || []));
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(currentPage); }, [currentPage]);

  const actionIcons = {
    CREATE: { emoji: 'fa-plus-circle', class: 'badge-green' },
    UPDATE: { emoji: 'fa-edit', class: 'badge-amber' },
    DELETE: { emoji: 'fa-trash-alt', class: 'badge-red' },
    LOGIN: { emoji: 'fa-sign-in-alt', class: 'badge-blue' },
  };

  return (
    <div className="audit-container">
      {/* 1. Header */}
      <div className="aud-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="aud-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>النظام</span>
          </div>
          <h1>سجل المراجعة والنشاط</h1>
        </div>
        <div className="aud-header-actions">
          <button className="aud-btn-premium aud-btn-outline" onClick={() => loadData(currentPage)}>
            <i className="fas fa-sync-alt"></i> تحديث السجل
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="aud-stats-grid">
        <div className="aud-stat-card">
          <div className="aud-stat-info">
            <h4>إجمالي العمليات</h4>
            <div className="aud-stat-value">{data.length > 0 ? (currentPage * pageSize + data.length) : 0}</div>
          </div>
          <div className="aud-stat-visual"><div className="aud-stat-icon icon-blue"><i className="fas fa-history"></i></div></div>
        </div>
        <div className="aud-stat-card">
          <div className="aud-stat-info">
            <h4>عمليات الإنشاء</h4>
            <div className="aud-stat-value" style={{ color: 'var(--aud-accent-green)' }}>{data.filter(d => d.action === 'CREATE').length}</div>
          </div>
          <div className="aud-stat-visual"><div className="aud-stat-icon icon-green"><i className="fas fa-plus-circle"></i></div></div>
        </div>
        <div className="aud-stat-card">
          <div className="aud-stat-info">
            <h4>عمليات التعديل</h4>
            <div className="aud-stat-value" style={{ color: 'var(--aud-accent-amber)' }}>{data.filter(d => d.action === 'UPDATE').length}</div>
          </div>
          <div className="aud-stat-visual"><div className="aud-stat-icon icon-amber"><i className="fas fa-edit"></i></div></div>
        </div>
        <div className="aud-stat-card">
          <div className="aud-stat-info">
            <h4>عمليات الحذف</h4>
            <div className="aud-stat-value" style={{ color: '#f43f5e' }}>{data.filter(d => d.action === 'DELETE').length}</div>
          </div>
          <div className="aud-stat-visual"><div className="aud-stat-icon icon-purple"><i className="fas fa-trash-alt"></i></div></div>
        </div>
      </div>

      {/* 3. Table Card */}
      <div className="aud-table-card">
        <div className="aud-table-container">
          {loading ? (
            <div style={{ padding: '60px' }}><Loader message="جاري قراءة سجلات النشاط..." /></div>
          ) : data.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--aud-text-secondary)' }}>
              <i className="fas fa-clipboard-check" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد سجلات نشاط مسجلة</h3>
            </div>
          ) : (
            <>
              <table className="aud-table">
                <thead>
                  <tr>
                    <th>التاريخ والوقت</th>
                    <th>المستخدم</th>
                    <th>الإجراء</th>
                    <th>المورد</th>
                    <th>التفاصيل</th>
                    <th>عنوان IP</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((log, i) => (
                    <tr key={log.id || i}>
                      <td>
                        <div style={{ fontWeight: 800 }}>{new Date(log.timestamp || log.createdAt).toLocaleDateString('ar')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--aud-text-secondary)' }}>{new Date(log.timestamp || log.createdAt).toLocaleTimeString('ar')}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--aud-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900 }}>{(log.username || 'U').charAt(0).toUpperCase()}</div>
                          <div style={{ fontWeight: 700 }}>{log.username}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`aud-type-badge ${actionIcons[log.action]?.class || 'badge-blue'}`}>
                          <i className={`fas ${actionIcons[log.action]?.emoji || 'fa-info-circle'}`} style={{ marginRight: '6px' }}></i>
                          {log.action}
                        </span>
                      </td>
                      <td><div style={{ fontWeight: 800 }}>{log.resource}</div>{log.resourceId && <code style={{ fontSize: '0.7rem' }}>#{log.resourceId}</code>}</td>
                      <td><div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }} title={log.details}>{log.details || '—'}</div></td>
                      <td><code style={{ fontSize: '0.75rem' }}>{log.ipAddress || '—'}</code></td>
                      <td>
                        <button className="aud-action-btn" onClick={() => navigate(`/audit/${log.id}`, { state: { log } })}>
                          <i className="fas fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="aud-pagination">
                <div className="aud-pagination-info">الصفحة {currentPage + 1}</div>
                <div className="aud-pagination-btns">
                  <button className="aud-page-btn" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}><i className="fas fa-chevron-right"></i></button>
                  <button className="aud-page-btn active">{currentPage + 1}</button>
                  <button className="aud-page-btn" onClick={() => setCurrentPage(p => p + 1)}><i className="fas fa-chevron-left"></i></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Audit;
