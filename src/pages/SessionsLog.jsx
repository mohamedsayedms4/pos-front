import React, { useState, useEffect } from 'react';
import { useGlobalUI } from '../components/common/GlobalUI';
import Api from '../services/api';
import SessionSummaryModal from '../components/pos/SessionSummaryModal';

const SessionsLog = () => {
  const { toast } = useGlobalUI();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal state
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, [page]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await Api.getSessions({ page, size: 20 });
      setSessions(res.content);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Network failed', err);
      toast('حدث خطأ أثناء جلب سجل الورديات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages - 1) setPage(p => p + 1);
  };

  const handlePrevPage = () => {
    if (page > 0) setPage(p => p - 1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="sessions-page-container">
      <div className="page-header">
        <h1 className="page-title">سجل الورديات (شفتات الكاشير)</h1>
        <p className="page-subtitle">تصفح وعرض تقارير الورديات السابقة والحالية</p>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">جاري التحميل...</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">لا يوجد ورديات مسجلة.</div>
        ) : (
          <table className="sessions-table">
            <thead>
              <tr>
                <th>رقم الوردية</th>
                <th>اسم الكاشير</th>
                <th>الخزينة</th>
                <th>وقت البدء</th>
                <th>وقت الانتهاء</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.id}>
                  <td>#{session.id}</td>
                  <td>{session.userName}</td>
                  <td>{session.treasuryName}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{formatDate(session.startTime)}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{formatDate(session.endTime)}</td>
                  <td>
                    <span className={`status-badge ${session.status === 'OPEN' ? 'status-open' : 'status-closed'}`}>
                      {session.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-view-report"
                      onClick={() => setSelectedSessionId(session.id)}
                    >
                      <i className="fa-solid fa-file-lines"></i> عرض التقرير
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && totalPages > 1 && (
          <div className="pagination">
            <button onClick={handleNextPage} disabled={page >= totalPages - 1}>التالي &raquo;</button>
            <span className="page-info">صفحة {page + 1} من {totalPages}</span>
            <button onClick={handlePrevPage} disabled={page === 0}>&laquo; السابق</button>
          </div>
        )}
      </div>

      {selectedSessionId && (
        <SessionSummaryModal 
          sessionId={selectedSessionId} 
          onClose={() => setSelectedSessionId(null)} 
        />
      )}

      <style>{`
        .sessions-page-container {
          padding: 24px;
          animation: fadeIn 0.3s ease;
          direction: rtl;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .page-header {
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-white, #fff);
          margin: 0 0 8px 0;
        }
        .page-subtitle {
          color: var(--text-muted, #aaa);
          margin: 0;
          font-size: 1rem;
        }

        .table-container {
          background: var(--bg-elevated, #1e1e1e);
          border: 1px solid var(--border-subtle, #333);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          overflow-x: auto;
        }

        .loading-state, .empty-state {
          padding: 40px;
          text-align: center;
          color: var(--text-muted, #aaa);
          font-size: 1.1rem;
        }

        .sessions-table {
          width: 100%;
          border-collapse: collapse;
          color: var(--text-light, #ddd);
        }
        .sessions-table th {
          text-align: right;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted, #aaa);
          font-weight: 600;
          border-bottom: 1px solid var(--border-subtle, #333);
          white-space: nowrap;
        }
        .sessions-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border-subtle, #333);
          vertical-align: middle;
        }
        .sessions-table tbody tr {
          transition: background 0.2s;
        }
        .sessions-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
          display: inline-block;
        }
        .status-open {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .status-closed {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .btn-view-report {
          background: var(--bg-input, #2a2a2a);
          color: var(--text-white, #fff);
          border: 1px solid var(--border-input, #444);
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-view-report:hover {
          background: rgba(0, 120, 215, 0.1);
          border-color: var(--metro-blue, #0078D7);
          color: #60a5fa;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 24px;
        }
        .pagination button {
          background: var(--bg-input, #2a2a2a);
          border: 1px solid var(--border-input, #444);
          color: var(--text-white, #fff);
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .pagination button:hover:not(:disabled) {
          background: #333;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .page-info {
          color: var(--text-muted, #aaa);
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
};

export default SessionsLog;
