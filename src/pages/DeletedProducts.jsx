import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { useBranch } from '../context/BranchContext';

const DeletedProducts = () => {
  const navigate = useNavigate();
  const getImageUrl = (p) => {
    if (!p) return null;
    const url = p.imageUrl || (p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls[0] : null);
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${SERVER_URL}${url}`;
    return `${SERVER_URL}/api/v1/products/images/${url.split('/').pop()}`;
  };
  const { toast, confirm } = useGlobalUI();
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();

  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    const user = Api._getUser();
    const isAdmin = (user?.roles || []).some(r => r.includes('ADMIN'));
    return (!isAdmin && user?.branchId) ? user.branchId : '';
  });

  useEffect(() => {
    const user = Api._getUser();
    if (globalBranchId !== undefined && globalBranchId !== null && globalBranchId !== '') {
      setSelectedBranchId(globalBranchId);
    } else if (globalBranchId === null) {
      setSelectedBranchId(''); // All Branches
    } else if (user && user.branchId) {
      setSelectedBranchId(user.branchId);
    }
    if (contextBranches && contextBranches.length > 0) {
      setBranches(contextBranches);
    }
  }, [globalBranchId, contextBranches]);

  const loadDeletedProducts = async (branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const res = await Api.getDeletedProducts(branchId);
      const items = Array.isArray(res) ? res : (res?.data || []);
      setData(items);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedProducts(selectedBranchId);
  }, [selectedBranchId]);

  const handleRestoreGlobal = (productId, name) => {
    confirm(`هل أنت متأكد من استعادة المنتج "${name}" بشكل كامل لجميع الفروع؟`, async () => {
      try {
        await Api.restoreProductGlobal(productId);
        toast(`تم استعادة المنتج "${name}" بنجاح`, 'success');
        loadDeletedProducts(selectedBranchId);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const handleRestoreInBranch = (productId, name) => {
    if (!selectedBranchId) {
      toast('الرجاء اختيار فرع محدد أولاً لإجراء الاستعادة فيه', 'warning');
      return;
    }
    const branchName = branches.find(b => String(b.id) === String(selectedBranchId))?.name || 'الفرع المحدد';
    confirm(`هل أنت متأكد من استعادة المنتج "${name}" للفرع "${branchName}"؟`, async () => {
      try {
        await Api.restoreProductInBranch(productId, selectedBranchId);
        toast(`تم استعادة المنتج "${name}" في فرع "${branchName}" بنجاح`, 'success');
        loadDeletedProducts(selectedBranchId);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const filteredItems = data.filter(p => {
    const query = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(query) ||
      p.productCode?.toLowerCase().includes(query) ||
      p.categoryName?.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <style>{`
        /* Responsive CSS Overrides for Deleted Products Page */
        @media (max-width: 1024px) {
          .grid-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .toolbar-filters {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            width: 100% !important;
          }
          .toolbar-filters .search-box-wrapper,
          .toolbar-filters select {
            width: 100% !important;
            max-width: 100% !important;
            height: 40px !important;
          }
          .toolbar-actions {
            width: 100% !important;
          }
          .toolbar-actions button {
            width: 100% !important;
            justify-content: center !important;
            height: 40px !important;
          }
          
          .table-wrapper {
            overflow-x: auto !important;
            width: 100% !important;
            -webkit-overflow-scrolling: touch !important;
            border: 1px solid var(--border-subtle) !important;
            border-radius: 8px !important;
          }
          .data-table {
            min-width: 850px !important;
          }
        }

        @media (max-width: 768px) {
          .products-container {
            padding: 12px !important;
          }
          .card {
            border-radius: 12px !important;
          }
          .page-header {
            text-align: center !important;
            margin-bottom: 15px !important;
          }
          .page-title {
            font-size: 1.5rem !important;
          }
          .page-subtitle {
            font-size: 0.85rem !important;
          }
          
          /* Align restore buttons vertically on mobile if needed */
          .table-actions {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 6px !important;
          }
          .table-actions button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
      <div className="products-container page-layout animate-fade-in" style={{ padding: '24px' }}>
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div className="header-info">
          <h2 className="page-title"><i className="fa-solid fa-recycle"></i>️ سلة المحذوفات (المنتجات)</h2>
          <p className="page-subtitle">يمكنك استعراض واستعادة المنتجات التي تم حذفها مؤخراً بشكل كامل أو لفروع محددة.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card-header)' }}>
          <div className="grid-toolbar" style={{ display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            
            <div className="toolbar-filters" style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '250px' }}>
              <div className="search-box-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الكود، أو الفئة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control search-input"
                  style={{ paddingLeft: '35px', height: '40px' }}
                />
                <span className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                </span>
              </div>

              {Api.isAdminOrBranchManager() && (
                <select
                  className="form-control"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  style={{ width: '200px', height: '40px', padding: '0 10px' }}
                >
                  <option value="">كل الفروع (عام)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="toolbar-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button className="btn btn-ghost" onClick={() => navigate('/products')}>
                ← العودة للمنتجات
              </button>
            </div>
          </div>
        </div>

        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <Loader message="جاري تحميل المنتجات المحذوفة..." />
            ) : filteredItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '15px' }}><i className="fa-solid fa-recycle"></i>️</div>
                <h4>لا توجد منتجات محذوفة</h4>
                <p>{searchTerm ? 'لا توجد نتائج تطابق بحثك حالياً.' : 'سلة المحذوفات فارغة تماماً.'}</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>صورة</th>
                    <th>المنتج</th>
                    <th>الفئة</th>
                    <th>الكود</th>
                    <th>سعر الشراء</th>
                    <th>سعر البيع</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td>
                        {getImageUrl(p) ? (
                          <img src={getImageUrl(p)} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><i className="fa-solid fa-box"></i></div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.categoryName || '—'}</td>
                      <td><code style={{ color: 'var(--text-muted)' }}>{p.productCode || '—'}</code></td>
                      <td>{Number(p.purchasePrice !== undefined ? p.purchasePrice : (p.branchInventories?.[0]?.purchasePrice || 0)).toFixed(2)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{Number(p.salePrice !== undefined ? p.salePrice : (p.branchInventories?.[0]?.salePrice || 0)).toFixed(2)}</td>
                      <td>
                        <div className="table-actions" style={{ display: 'flex', gap: '8px' }}>
                          {selectedBranchId && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRestoreInBranch(p.id, p.name)}
                              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px' }}
                              title="استعادة للفرع الحالي فقط"
                            >
                              <i className="fa-solid fa-rotate"></i> استعادة للفرع
                            </button>
                          )}
                          {(Api.isAdmin() || Api.can('PRODUCT_WRITE')) && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleRestoreGlobal(p.id, p.name)}
                              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px' }}
                              title="استعادة المنتج بالكامل لجميع الفروع والمستودعات"
                            >
                              <i className="fa-solid fa-globe"></i> استعادة شاملة
                            </button>
                          )}
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
    </>
  );
};

export default DeletedProducts;
