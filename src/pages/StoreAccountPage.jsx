import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreAuth } from '../context/StoreAuthContext';
import StoreLayout from '../components/store/StoreLayout';
import StoreApi from '../services/storeApi';

const StoreAccountPage = () => {
  const { storeCustomer, storeLogout, isStoreAuthLoading } = useStoreAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders'); // 'info', 'orders'
  
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const getStatusLabel = (status) => {
    const labels = {
      'PENDING': 'قيد الانتظار',
      'CONFIRMED': 'مؤكد',
      'PREPARING': 'قيد التجهيز',
      'READY': 'جاهز للتسليم',
      'DELIVERED': 'تم التسليم',
      'CANCELLED': 'ملغي',
      'RETURNED': 'مرتجع'
    };
    return labels[status] || status;
  };

  const getStatusStyle = (status) => {
    if (status === 'DELIVERED') return { background: '#dcfce7', color: '#166534' };
    if (status === 'CANCELLED') return { background: '#fee2e2', color: '#991b1b' };
    if (status === 'RETURNED') return { background: '#fef3c7', color: '#92400e' };
    return { background: '#e0f2fe', color: '#075985' };
  };

  useEffect(() => {
    if (!isStoreAuthLoading && !storeCustomer) {
      navigate('/store');
    }
  }, [storeCustomer, isStoreAuthLoading, navigate]);

  useEffect(() => {
    if (activeTab === 'orders' && storeCustomer) {
      loadOrders();
    }
  }, [activeTab, storeCustomer]);

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await StoreApi.getMyOrders(0, 50); // Get recent 50 orders
      setOrders(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  if (isStoreAuthLoading || !storeCustomer) {
    return <StoreLayout><div style={{ padding: '100px', textAlign: 'center' }}>جاري التحميل...</div></StoreLayout>;
  }

  return (
    <StoreLayout>
      <div className="ec-container" style={{ padding: '40px 20px', minHeight: '60vh' }}>
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          
          {/* Sidebar */}
          <div style={{ flex: '1 1 250px', background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', height: 'fit-content' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ width: '60px', height: '60px', background: 'var(--ec-primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 10px' }}>
                👤
              </div>
              <h3 style={{ margin: 0, color: '#1e293b' }}>{storeCustomer.name}</h3>
              <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.9rem' }}>{storeCustomer.phone}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => setActiveTab('orders')}
                style={{ textAlign: 'right', padding: '10px 15px', borderRadius: '8px', border: 'none', background: activeTab === 'orders' ? '#f1f5f9' : 'transparent', color: activeTab === 'orders' ? 'var(--ec-primary)' : '#475569', fontWeight: activeTab === 'orders' ? 'bold' : 'normal', cursor: 'pointer' }}
              >
                📦 طلباتي
              </button>
              <button 
                onClick={() => setActiveTab('info')}
                style={{ textAlign: 'right', padding: '10px 15px', borderRadius: '8px', border: 'none', background: activeTab === 'info' ? '#f1f5f9' : 'transparent', color: activeTab === 'info' ? 'var(--ec-primary)' : '#475569', fontWeight: activeTab === 'info' ? 'bold' : 'normal', cursor: 'pointer' }}
              >
                ⚙️ إعدادات الحساب
              </button>
              <button 
                onClick={() => { storeLogout(); navigate('/store'); }}
                style={{ textAlign: 'right', padding: '10px 15px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', marginTop: '20px' }}
              >
                🚪 تسجيل خروج
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: '3 1 600px', background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            
            {activeTab === 'orders' && (
              <div className="ec-animate-in">
                <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>سجل الطلبات الأونلاين</h2>
                
                {isLoadingOrders ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>جاري تحميل الطلبات...</div>
                ) : orders.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📦</div>
                    <p>لم تقم بأي طلبات بعد.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {orders.map(order => (
                      <div 
                        key={order.id} 
                        onClick={() => { setSelectedOrder(order); setIsDetailsModalOpen(true); }}
                        style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--ec-primary)'}
                        onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <h4 style={{ margin: 0, color: 'var(--ec-primary)' }}>{order.orderNumber}</h4>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold',
                            ...getStatusStyle(order.status)
                          }}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 5px', fontSize: '0.9rem', color: '#64748b' }}>
                          📅 {new Date(order.orderDate).toLocaleString('ar-EG')}
                        </p>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#1e293b' }}>
                          الإجمالي: {Number(order.totalAmount).toFixed(2)} ج.م
                        </p>
                        <div style={{ position: 'absolute', left: '15px', bottom: '15px', color: 'var(--ec-primary)', fontSize: '0.8rem' }}>
                          عرض التفاصيل ←
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'info' && (
              <div className="ec-animate-in">
                <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>بيانات الحساب</h2>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', marginBottom: '5px' }}>الاسم</label>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{storeCustomer.name}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', marginBottom: '5px' }}>رقم الهاتف</label>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{storeCustomer.phone}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', marginBottom: '5px' }}>العنوان</label>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{storeCustomer.address || 'لم يتم إضافة عنوان'}</div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Order Details Modal */}
      {isDetailsModalOpen && selectedOrder && (
        <div className="ec-modal-overlay" style={{ display: 'flex' }} onClick={() => setIsDetailsModalOpen(false)}>
          <div className="ec-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="ec-modal-header">
              <h3>تفاصيل الطلب {selectedOrder.orderNumber}</h3>
              <button onClick={() => setIsDetailsModalOpen(false)}>✕</button>
            </div>
            <div className="ec-modal-body">
              {/* Order Info Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>حالة الطلب</div>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold',
                    ...getStatusStyle(selectedOrder.status)
                  }}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>التاريخ</div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{new Date(selectedOrder.orderDate).toLocaleString('ar-EG')}</div>
                </div>
              </div>

              {/* Customer Info */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>👤 بيانات التوصيل</h4>
                <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.9rem' }}>
                  <p style={{ margin: '0 0 8px' }}><strong>الاسم:</strong> {selectedOrder.customerName}</p>
                  <p style={{ margin: '0 0 8px' }}><strong>الهاتف:</strong> {selectedOrder.customerPhone}</p>
                  <p style={{ margin: 0 }}><strong>العنوان:</strong> {selectedOrder.customerAddress}</p>
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>🛍️ المنتجات ({selectedOrder.itemCount})</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {selectedOrder.items?.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '10px' }}>
                      <div style={{ width: '50px', height: '50px', background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.imageUrl ? (
                          <img src={StoreApi.getImageUrl(item.imageUrl)} alt={item.productName} style={{ width: '100%', height: '100%', object_fit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '20px' }}>📦</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '2px' }}>{item.productName}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{Number(item.unitPrice).toFixed(2)} ج.م × {item.quantity}</div>
                      </div>
                      <div style={{ fontWeight: 'bold', color: 'var(--ec-primary)' }}>
                        {Number(item.totalPrice).toFixed(2)} ج.م
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History / Timeline */}
              {selectedOrder.history && selectedOrder.history.length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>🕒 سجل الحالات</h4>
                  <div style={{ paddingRight: '15px', borderRight: '2px solid #e2e8f0', marginLeft: '10px' }}>
                    {selectedOrder.history.map((h, idx) => (
                      <div key={h.id} style={{ position: 'relative', marginBottom: '15px', paddingRight: '20px' }}>
                        <div style={{ 
                          position: 'absolute', right: '-25px', top: '5px', 
                          width: '10px', height: '10px', borderRadius: '50%', 
                          background: idx === 0 ? 'var(--ec-primary)' : '#cbd5e1',
                          border: '2px solid white'
                        }} />
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{getStatusLabel(h.status)}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                          {new Date(h.changedAt).toLocaleString('ar-EG')}
                        </div>
                        {h.reason && <div style={{ fontSize: '0.75rem', color: '#1e293b', marginTop: '4px', background: '#f1f5f9', padding: '6px 10px', borderRadius: '6px' }}>{h.reason}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>الإجمالي النهائي:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--ec-primary)' }}>{Number(selectedOrder.totalAmount).toFixed(2)} ج.م</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </StoreLayout>
  );
};

export default StoreAccountPage;
