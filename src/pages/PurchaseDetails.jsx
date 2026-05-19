import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';

const PurchaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) {
        navigate('/purchases');
        return;
      }
      setLoading(true);
      try {
        const res = await Api.getPurchaseById(id);
        setData(res);
      } catch (err) {
        setError(err.message || 'فشل في تحميل تفاصيل الفاتورة');
        toast(err.message || 'فشل في تحميل تفاصيل الفاتورة', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id, navigate]);

  if (loading) {
    return <Loader message="جاري تحميل تفاصيل الفاتورة..." />;
  }

  if (error || !data) {
    return (
      <div className="page-section empty-state" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="empty-icon">⚠️</div>
        <h4>حدث خطأ</h4>
        <p>{error || 'لم يتم العثور على الفاتورة المطلوبة'}</p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/purchases')}>
          العودة للمشتريات
        </button>
      </div>
    );
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PAID':
        return { label: 'مدفوعة بالكامل', className: 'badge badge-success' };
      case 'PARTIAL':
        return { label: 'مدفوعة جزئياً', className: 'badge badge-warning' };
      default:
        return { label: 'غير مدفوعة', className: 'badge badge-danger' };
    }
  };

  const badge = getStatusLabel(data.status);

  return (
    <>
      <style>{`
        /* Responsive CSS Overrides for Purchase Details Page */
        @media (max-width: 1024px) {
          .details-layout-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          
          .table-wrapper {
            overflow-x: auto !important;
            width: 100% !important;
            -webkit-overflow-scrolling: touch !important;
            border: 1px solid var(--border-subtle) !important;
            border-radius: 8px !important;
          }
          .data-table {
            min-width: 600px !important;
          }
        }

        @media (max-width: 768px) {
          .page-section {
            padding: 12px !important;
          }
          .card {
            border-radius: 12px !important;
          }
          .card-header {
            padding: 15px !important;
          }
          .card-header > div:first-child {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
            gap: 15px !important;
          }
          .card-header > div:first-child button {
            width: 100% !important;
            justify-content: center !important;
          }
          .card-header > div:first-child > div {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .card-header > div:last-child {
            width: 100% !important;
          }
          .card-header > div:last-child a {
            width: 100% !important;
            justify-content: center !important;
          }
          
          .stats-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
        }
      `}</style>
      <div className="page-section">
      {/* 1. Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ justifyContent: 'space-between', padding: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button className="btn btn-ghost" style={{ padding: '6px 14px', gap: '8px' }} onClick={() => navigate('/purchases')}>
              <span style={{ fontSize: '1.2rem' }}>⬅️</span> العودة للمشتريات
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ 
                width: '50px', 
                height: '50px', 
                borderRadius: '12px', 
                background: 'var(--gradient-azure)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: '#fff'
              }}>
                🛒
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-white)' }}>
                  فاتورة مشتريات: {data.invoiceNumber}
                </h2>
                <span className={badge.className} style={{ marginTop: '4px', display: 'inline-block' }}>
                  {badge.label}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {data.supplierId && (
              <Link to={`/suppliers/${data.supplierId}`} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                👤 عرض حساب المورد
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Standard KPI Stats Grid using StatTile */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatTile 
          id="pur_total_amount"
          label="إجمالي قيمة الفاتورة"
          value={`${Number(data.totalAmount).toLocaleString()} ج.م`}
          subtitle="القيمة الإجمالية للمشتريات"
          icon="📥"
          defaults={{ color: 'cobalt', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile 
          id="pur_paid_amount"
          label="المبلغ المسدد"
          value={`${Number(data.paidAmount).toLocaleString()} ج.م`}
          subtitle="المسدد نقداً للمورد"
          icon="🟢"
          defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
        />
        <StatTile 
          id="pur_remaining_amount"
          label="المبلغ المتبقي"
          value={`${Number(data.remainingAmount).toLocaleString()} ج.م`}
          subtitle="القيمة الآجلة المستحقة"
          icon="🔴"
          defaults={{ color: '#ff6b6b', size: 'tile-wd-sm', order: 3 }}
        />
      </div>

      {/* 3. Detailed Information Grid */}
      <div className="details-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        {/* Info Card */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: '700' }}>📋 تفاصيل الفاتورة</h3>
          </div>
          <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={infoRowStyle}>
              <span style={labelStyle}>رقم الفاتورة:</span>
              <strong style={valueStyle}>{data.invoiceNumber}</strong>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>التاريخ:</span>
              <span style={valueStyle}>{data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>المورد:</span>
              <span style={valueStyle}>
                {data.supplierId ? (
                  <Link to={`/suppliers/${data.supplierId}`} style={{ color: 'var(--metro-blue)', fontWeight: 600, textDecoration: 'none' }}>
                    👤 {data.supplierName}
                  </Link>
                ) : data.supplierName}
              </span>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>الفرع:</span>
              <span style={valueStyle}>🏢 {data.branchName || '—'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>المخزن المستلم:</span>
              <span style={valueStyle}>📦 {data.warehouseName || '—'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>بواسطة (المُنشئ):</span>
              <span style={valueStyle}>👤 {data.createdBy || '—'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>تاريخ الإنشاء:</span>
              <span style={valueStyle}>📅 {data.createdAt ? new Date(data.createdAt).toLocaleString('ar-EG') : '—'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>آخر تعديل بواسطة:</span>
              <span style={valueStyle}>👤 {data.lastModifiedBy || '—'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>تاريخ التعديل:</span>
              <span style={valueStyle}>📅 {data.lastModifiedAt ? new Date(data.lastModifiedAt).toLocaleString('ar-EG') : '—'}</span>
            </div>
            {data.receiptStatus && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>حالة الاستلام المخزني:</span>
                <span className={data.receiptStatus === 'COMPLETED' || data.receiptStatus === 'RECEIVED' ? 'badge badge-success' : 'badge badge-warning'}>
                  {data.receiptStatus === 'COMPLETED' || data.receiptStatus === 'RECEIVED' ? 'تم الاستلام بالمخزن' : 'قيد الانتظار'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table Card */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: '700' }}>📦 المنتجات المشتراة</h3>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            <div className="table-wrapper">
              <table className="data-table" style={{ direction: 'rtl', width: '100%' }}>
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>سعر شراء الوحدة</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items && data.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                        {item.productId ? (
                          <Link to={`/products/${item.productId}`} style={{ color: 'var(--metro-blue)', textDecoration: 'none' }}>
                            {item.productName}
                          </Link>
                        ) : item.productName}
                      </td>
                      <td>
                        <span style={{ background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem' }}>
                          {item.quantity} {item.unitName}
                        </span>
                      </td>
                      <td>{Number(item.unitPrice).toFixed(2)} ج.م</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-white)' }}>{Number(item.totalPrice).toFixed(2)} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

const infoRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '10px',
  borderBottom: '1px dashed var(--border-color, rgba(255,255,255,0.05))'
};

const labelStyle = {
  color: 'var(--text-muted, #777)',
  fontSize: '0.9rem'
};

const valueStyle = {
  color: 'var(--text-white, #fff)',
  fontWeight: '500',
  fontSize: '0.9rem'
};

export default PurchaseDetails;
