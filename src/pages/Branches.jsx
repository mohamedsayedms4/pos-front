import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';

const Branches = () => {
  const navigate = useNavigate();
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runTour, setRunTour] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await Api.getBranchesSummary();
      setData(res || []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = (id, name) => {
    confirm(`هل أنت متأكد من حذف الفرع "${name}"؟`, async () => {
      try {
        await Api._request(`/branches/${id}`, { method: 'DELETE' });
        toast('تم حذف الفرع بنجاح', 'success');
        loadData();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  return (
    <div className="page-section" style={{ direction: 'rtl' }}>
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <StatTile
          id="br_count"
          label="إجمالي الفروع"
          value={data.length}
          icon="🏢"
          defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile
          id="br_retail"
          label="فروع تجزئة"
          value={data.filter(b => b.type === 'RETAIL').length}
          icon="🏪"
          defaults={{ color: 'emerald', size: 'tile-sq-sm', order: 2 }}
        />
        <StatTile
          id="br_online"
          label="المتجر الإلكتروني"
          value={data.filter(b => b.type === 'ONLINE').length}
          icon="🌐"
          defaults={{ color: 'magenta', size: 'tile-sq-sm', order: 3 }}
        />
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>🏢 إدارة الفروع</h3>
        {Api.can('BRANCH_WRITE') && (
          <button className="btn btn-primary" onClick={() => navigate('/branches/add')}>
            <span>+</span> إضافة فرع جديد
          </button>
        )}
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <Loader message="جاري تحميل الفروع..." />
            ) : data.length === 0 ? (
              <div className="empty-state">
                <h4>لا توجد فروع مضافة</h4>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الفرع</th>
                    <th>النوع</th>
                    <th>العنوان</th>
                    <th>الهاتف</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((b, i) => (
                    <tr key={b.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{b.name}</td>
                      <td>
                        <span className={`badge ${b.type === 'ONLINE' ? 'badge-info' : 'badge-secondary'}`}>
                          {b.type === 'ONLINE' ? 'متجر إلكتروني' : b.type === 'WAREHOUSE_ONLY' ? 'مخزن فقط' : 'فرع تجزئة'}
                        </span>
                      </td>
                      <td>{b.address || '—'}</td>
                      <td>{b.phone || '—'}</td>
                      <td>
                        <span className={`badge ${b.active ? 'badge-success' : 'badge-danger'}`}>
                          {b.active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          {Api.can('BRANCH_WRITE') && <button className="btn btn-icon btn-ghost" title="إدارة الفرع" onClick={() => navigate(`/branches/${b.id}/manage`)}>⚙️</button>}
                          {Api.can('BRANCH_WRITE') && <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => navigate(`/branches/edit/${b.id}`)}>✏️</button>}
                          {Api.can('BRANCH_DELETE') && <button className="btn btn-icon btn-ghost" title="حذف" onClick={() => handleDelete(b.id, b.name)}>🗑️</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Branches;
