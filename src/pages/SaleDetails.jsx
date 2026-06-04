import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';
import ModalContainer from '../components/common/ModalContainer';
import ShareInvoice from '../components/common/ShareInvoice';

const SaleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeReturn, setActiveReturn] = useState(null);
  const [showReturnDetails, setShowReturnDetails] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) {
        navigate('/sales');
        return;
      }
      setLoading(true);
      try {
        const res = await Api.getSaleById(id);
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
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/sales')}>
          العودة للمبيعات
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
      case 'RETURNED':
        return { label: 'مرتجع كلي ↩', className: 'badge badge-neutral' };
      case 'PARTIALLY_RETURNED':
        return { label: 'مرتجع جزئي ↩', className: 'badge badge-warning' };
      default:
        return { label: 'غير مدفوعة', className: 'badge badge-danger' };
    }
  };

  const badge = getStatusLabel(data.status);

  return (
    <>
      <style>{`
        /* Responsive CSS Overrides for Sale Details Page */
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
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .card-header > div:last-child button,
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
            <button className="btn btn-ghost" style={{ padding: '6px 14px', gap: '8px' }} onClick={() => navigate('/sales')}>
              <span style={{ fontSize: '1.2rem' }}>⬅️</span> العودة للمبيعات
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
                📄
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-white)' }}>
                  فاتورة مبيعات: {data.invoiceNumber}
                </h2>
                <span className={badge.className} style={{ marginTop: '4px', display: 'inline-block' }}>
                  {badge.label}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {data.returns && data.returns.length > 0 && (
              <button 
                className="btn" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  background: 'rgba(244, 63, 94, 0.1)',
                  color: '#f43f5e',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setActiveReturn(data.returns[0]);
                  setShowReturnDetails(true);
                }}
              >
                ↩ عرض المرتجع
              </button>
            )}
            {data.customerId && (
              <Link to={`/customers`} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                👤 عرض حساب العميل
              </Link>
            )}
            <ShareInvoice invoice={data} btnClassName="btn-ghost" />
          </div>
        </div>
      </div>

      {/* 2. Standard KPI Stats Grid using StatTile */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatTile 
          id="sale_total_amount"
          label="إجمالي قيمة الفاتورة"
          value={`${Number(data.totalAmount).toLocaleString()} ج.م`}
          subtitle={`الخصم المطبق: ${Number(data.discount || 0).toLocaleString()} ج.م`}
          icon="📥"
          defaults={{ color: 'cobalt', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile 
          id="sale_paid_amount"
          label="المبلغ المسدد"
          value={`${Number(data.paidAmount).toLocaleString()} ج.م`}
          subtitle="المستلم نقداً من العميل"
          icon="🟢"
          defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
        />
        <StatTile 
          id="sale_remaining_amount"
          label="المبلغ المتبقي"
          value={`${Number(data.remainingAmount).toLocaleString()} ج.م`}
          subtitle="القيمة المتبقية كمديونية"
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
              <span style={labelStyle}>العميل:</span>
              <span style={valueStyle}>
                {data.customerId ? (
                  <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>
                    👤 {data.customerName}
                  </span>
                ) : data.customerName}
              </span>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>الفرع:</span>
              <span style={valueStyle}>🏢 {data.branchName || '—'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>بواسطة (الكاشير):</span>
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
          </div>
        </div>

        {/* Items Table Card */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: '700' }}>📦 المنتجات المباعة</h3>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            <div className="table-wrapper">
              <table className="data-table" style={{ direction: 'rtl', width: '100%' }}>
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>سعر البيع للوحدة</th>
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

      {/* Return Details Modal */}
      {showReturnDetails && activeReturn && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowReturnDetails(false); }}>
            <div className="modal" style={{ maxWidth: '650px' }}>
              <div className="modal-header">
                <h3>تفاصيل المرتجع: {activeReturn.returnNumber}</h3>
                <button className="modal-close" onClick={() => setShowReturnDetails(false)}>✕</button>
              </div>
              <div className="modal-body no-padding">
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', marginBottom: '15px' }}>
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <p><strong>رقم الفاتورة الأصلية:</strong> {data.invoiceNumber}</p>
                    <p><strong>تاريخ المرتجع:</strong> {new Date(activeReturn.returnDate).toLocaleString('ar-EG')}</p>
                  </div>
                  <p className="mt-2 text-muted"><strong>الملاحظات:</strong> {activeReturn.notes || 'لا يوجد'}</p>
                </div>
                <div className="table-wrapper" style={{ maxHeight: '300px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الصنف</th>
                        <th>الكمية</th>
                        <th>السعر</th>
                        <th>إجمالي المرتجع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeReturn.items && activeReturn.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.productName}</td>
                          <td>{item.quantity} {item.unitName}</td>
                          <td>{(item.unitPrice || 0).toFixed(2)}</td>
                          <td style={{ fontWeight: 600, color: 'var(--metro-red)' }}>{(item.totalPrice || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '20px', textAlign: 'left', borderTop: '1px solid var(--border-main)' }}>
                  <h2 style={{ color: 'var(--metro-red)', margin: 0 }}>إجمالي المسترد: {(activeReturn.totalRefund || 0).toFixed(2)} ج.م</h2>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowReturnDetails(false)}>إغلاق</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
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

export default SaleDetails;
