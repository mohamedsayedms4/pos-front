import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';
import ModalContainer from '../components/common/ModalContainer';

const CategoryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useGlobalUI();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Child categories
  const [subCategories, setSubCategories] = useState([]);
  
  // Products table state
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Stats calculation
  const [totalStock, setTotalStock] = useState(0);
  const [totalPurchaseValue, setTotalPurchaseValue] = useState(0);
  const [totalSellingValue, setTotalSellingValue] = useState(0);

  const getImageUrl = (item) => {
    if (!item) return null;
    const url = item.imageUrl || (item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null);
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${SERVER_URL}${url}`;
    return `${SERVER_URL}/api/v1/products/images/${url.split('/').pop()}`;
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load category details and subcategories
  useEffect(() => {
    const loadCategoryData = async () => {
      if (!id) {
        navigate('/categories');
        return;
      }
      setLoading(true);
      try {
        const catData = await Api.getCategory(id);
        setCategory(catData);
        
        // Fetch all categories to filter child subcategories
        const allCats = await Api.getCategories(false);
        const children = allCats.filter(c => c.parentId === parseInt(id));
        setSubCategories(children);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCategoryData();
  }, [id, navigate]);

  // Load products when filters or pagination change
  useEffect(() => {
    const loadCategoryProducts = async () => {
      if (!id) return;
      setProductsLoading(true);
      try {
        const res = await Api.getProductsPaged(page, pageSize, debouncedSearch, 'id,desc', '', id);
        setProducts(res.items);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);

        // Fetch all products of this category (unpaginated or large page size) to calculate accurate stats
        const allRes = await Api.getProductsPaged(0, 1000, '', 'id,desc', '', id);
        let stockSum = 0;
        let pValue = 0;
        let sValue = 0;
        (allRes.items || []).forEach(p => {
          const qty = p.stock || 0;
          stockSum += qty;
          pValue += (p.purchasePrice || 0) * qty;
          sValue += (p.salePrice || 0) * qty;
        });
        setTotalStock(stockSum);
        setTotalPurchaseValue(pValue);
        setTotalSellingValue(sValue);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setProductsLoading(false);
      }
    };

    loadCategoryProducts();
  }, [id, page, pageSize, debouncedSearch, toast]);

  // Reset page to 0 on search
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  if (loading) {
    return <Loader message="جاري تحميل تفاصيل الفئة..." />;
  }

  if (error || !category) {
    return (
      <div className="page-section empty-state">
        <div className="empty-icon">⚠️</div>
        <h4>حدث خطأ</h4>
        <p>{error || 'لم يتم العثور على الفئة المطلوبة'}</p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/categories')}>العودة للفئات</button>
      </div>
    );
  }

  return (
    <div className="page-section">
      {/* Category Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ justifyContent: 'flex-start', gap: '20px', padding: '20px' }}>
          <button className="btn btn-ghost" style={{ padding: '6px 14px', gap: '8px' }} onClick={() => navigate('/categories')}>
            <span style={{ fontSize: '1.2rem' }}>⬅️</span> العودة للفئات
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '12px', 
              background: 'var(--gradient-azure)', 
              display: 'flex', 
              alignItems: 'center', 
              justify: 'center', 
              overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.2)'
            }}>
              {category.imageUrl ? (
                <img 
                  src={category.imageUrl.startsWith('http') ? category.imageUrl : (category.imageUrl.startsWith('/') ? `${SERVER_URL}${category.imageUrl}` : `${SERVER_URL}/${category.imageUrl}`)} 
                  alt={category.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <span style={{ fontSize: '1.8rem', color: 'white' }}>📁</span>
              )}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-white)' }}>{category.name}</h2>
              {category.description ? (
                <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{category.description}</p>
              ) : (
                <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>لا يوجد وصف لهذه الفئة.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatTile 
          id="cat_total_products"
          label="عدد المنتجات الكلي"
          value={totalElements}
          subtitle="الموديلات المسجلة"
          icon="📦"
          defaults={{ color: 'cobalt', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile 
          id="cat_total_stock"
          label="إجمالي القطع في المخزن"
          value={totalStock}
          subtitle="الكمية الفعلية المتوفرة"
          icon="📊"
          defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
        />
        <StatTile 
          id="cat_purchase_val"
          label="قيمة المخزون بسعر الشراء"
          value={`${Number(totalPurchaseValue).toLocaleString()} ج.م`}
          subtitle="تكلفة البضاعة الحالية"
          icon="📥"
          defaults={{ color: '#ff6b6b', size: 'tile-wd-sm', order: 3 }}
        />
        <StatTile 
          id="cat_selling_val"
          label="القيمة المتوقعة بسعر البيع"
          value={`${Number(totalSellingValue).toLocaleString()} ج.م`}
          subtitle="العائد المتوقع عند البيع"
          icon="📤"
          defaults={{ color: 'purple', size: 'tile-wd-sm', order: 4 }}
        />
      </div>

      {/* Grid for Subcategories and Products */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Subcategories (Only if child categories exist) */}
        {subCategories.length > 0 && (
          <div className="card">
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📁 الفئات الفرعية التابعة ({subCategories.length})
              </h3>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                {subCategories.map(sub => (
                  <div 
                    key={sub.id} 
                    onClick={() => navigate(`/categories/${sub.id}`)}
                    style={{ 
                      padding: '16px', 
                      background: 'var(--bg-elevated)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    className="hover-card-effect"
                  >
                    <div style={{ fontSize: '1.5rem' }}>📁</div>
                    <div style={{ overflow: 'hidden' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>انقر لعرض التفاصيل</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Products Table */}
        <div className="card">
          <div className="card-header" style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              📦 منتجات هذه الفئة ({totalElements})
            </h3>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '300px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="ابحث باسم المنتج أو الباركود..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  height: '38px', 
                  padding: '8px 14px', 
                  background: 'var(--bg-elevated)', 
                  border: '1px solid var(--border-input)', 
                  borderRadius: '6px',
                  color: 'var(--text-white)',
                  width: '100%'
                }}
              />
            </div>
          </div>

          <div className="card-body no-padding" style={{ overflowX: 'auto', minHeight: '200px' }}>
            {productsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <Loader message="جاري تحميل المنتجات..." />
              </div>
            ) : products.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div className="empty-icon" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📦</div>
                <h4 style={{ color: 'var(--text-secondary)' }}>لا توجد منتجات</h4>
                <p style={{ color: 'var(--text-muted)' }}>لم يتم العثور على أي منتج يطابق بحثك داخل هذه الفئة.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>الصورة</th>
                    <th>اسم المنتج</th>
                    <th>الباركود</th>
                    <th>سعر الشراء</th>
                    <th>سعر البيع</th>
                    <th>الكمية المتوفرة</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '6px', 
                          overflow: 'hidden', 
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {getImageUrl(p) ? (
                            <img src={getImageUrl(p)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '1.1rem' }}>📦</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <Link to={`/products/${p.id}`} style={{ color: 'var(--accent-azure)', textDecoration: 'none', cursor: 'pointer' }} className="hover-underline">
                          {p.name}
                        </Link>
                      </td>
                      <td>
                        <code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {p.productCode || '—'}
                        </code>
                      </td>
                      <td style={{ fontWeight: 500 }}>{Number(p.purchasePrice || 0).toFixed(2)} ج.م</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-azure)' }}>{Number(p.salePrice || 0).toFixed(2)} ج.م</td>
                      <td>
                        <span className={`badge ${Number(p.stock) > 10 ? 'badge-success' : Number(p.stock) > 0 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.85rem' }}>
                          {Number(p.stock).toFixed(0)} قطعة
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <Link className="btn btn-icon btn-ghost" title="عرض التفاصيل" to={`/products/${p.id}`}>👁️</Link>
                          <Link className="btn btn-icon btn-ghost" title="تعديل المنتج" to={`/products/edit/${p.id}`}>✏️</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div className="card-footer" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px 20px', 
              borderTop: '1px solid var(--border-color)',
              background: 'transparent'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                عرض {products.length} من أصل {totalElements} منتج
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-outline btn-sm" 
                  disabled={page === 0} 
                  onClick={() => setPage(prev => Math.max(0, prev - 1))}
                  style={{ padding: '5px 12px' }}
                >
                  السابق
                </button>
                <button 
                  className="btn btn-outline btn-sm" 
                  disabled={page >= totalPages - 1} 
                  onClick={() => setPage(prev => prev + 1)}
                  style={{ padding: '5px 12px' }}
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryDetails;
