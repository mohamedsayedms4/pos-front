import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

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
      // Usually Spring Page<T> returns { content: [], ... } but we handle array or object
      setData(Array.isArray(logsData) ? logsData : (logsData.content || logsData.items || []));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentPage);
  }, [currentPage]);

  const handleNext = () => setCurrentPage((prev) => prev + 1);
  const handlePrev = () => setCurrentPage((prev) => (prev > 0 ? prev - 1 : 0));
  const handleRefresh = () => loadData(currentPage);

  const actionIcons = {
    CREATE: '🟢',
    UPDATE: '🔵',
    DELETE: '🔴',
    LOGIN: '🟡',
  };

  return (
    <div className="page-section">
      <div className="card">
        <div className="card-header">
          <h3>📋 سجل المراجعة</h3>
          <div className="toolbar">
            <button className="btn btn-ghost btn-sm" onClick={handleRefresh}>🔄 تحديث</button>
          </div>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <Loader message="جاري تحميل سجل المراجعة..." />
            ) : data.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h4>لا توجد سجلات</h4>
                <p>سجل المراجعة فارغ حالياً</p>
              </div>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الوقت</th>
                      <th>المستخدم</th>
                      <th>الإجراء</th>
                      <th>المورد</th>
                      <th>التفاصيل</th>
                      <th>IP</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((log, i) => (
                      <tr key={log.id || i}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {new Date(log.timestamp || log.createdAt).toLocaleDateString('ar')}
                          <br /><span className="text-muted">{new Date(log.timestamp || log.createdAt).toLocaleTimeString('ar')}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{log.username || '—'}</td>
                        <td>
                          <span className={`badge ${log.action === 'CREATE' ? 'badge-success' : log.action === 'DELETE' ? 'badge-danger' : log.action === 'UPDATE' ? 'badge-info' : 'badge-warning'}`}>
                            {actionIcons[log.action] || '⚪'} {log.action}
                          </span>
                        </td>
                        <td>
                          {log.resource || '—'}
                          {log.resourceId && <span className="text-muted" style={{ fontSize: '0.875rem', marginLeft: '4px' }}>#{log.resourceId}</span>}
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details || ''}>
                          {log.details || '—'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.ipAddress || '—'}</td>
                        <td>
                          <div className="table-actions" style={{ justifyContent: 'center' }}>
                            <button className="btn btn-icon btn-ghost" title="عرض التفاصيل الكاملة" onClick={() => navigate(`/audit/${log.id}`, { state: { log } })}>👁️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '5px', padding: '10px' }}>
                  <button className="btn btn-ghost" disabled={currentPage === 0} onClick={handlePrev}>السابق</button>
                  <button className="btn btn-primary">{currentPage + 1}</button>
                  <button className="btn btn-ghost" onClick={handleNext}>التالي</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Audit;
