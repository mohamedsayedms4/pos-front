import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';

const StockReceipts = () => {
  const { toast, confirm } = useGlobalUI();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receivedQuantities, setReceivedQuantities] = useState({}); // itemId -> qty
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const response = await Api.getStockReceipts(page, 10);
      setReceipts(response?.items || []);
      setTotalPages(response?.totalPages || 1);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [page]);

  const handleSaveQuantities = async (receiptId, qtys = null) => {
    confirm('هل أنت متأكد من تسجيل هذه الكميات؟ سيتم حفظها دون تحديث المخزون الفعلي.', async () => {
      try {
        await Api.saveStockReceiptQuantities(receiptId, qtys);
        toast('تم تسجيل الاستلام بنجاح. يمكنك الآن الإضافة للمخزن.', 'success');
        loadReceipts();
        closeModal();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const handleCommitToInventory = async (receiptId) => {
    confirm('هل أنت متأكد من إضافة الأصناف للمخزن؟ سيتم زيادة رصيد المنتجات الفعلي الآن.', async () => {
      try {
        await Api.commitStockReceiptToInventory(receiptId);
        toast('تمت إضافة الكميات للمخزن بنجاح', 'success');
        loadReceipts();
        closeModal();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const openDetails = (receipt) => {
    setSelectedReceipt(receipt);
    // Initialize quantities with full original quantities
    const initialQtys = {};
    receipt.items.forEach(item => {
      initialQtys[item.id] = item.quantity;
    });
    setReceivedQuantities(initialQtys);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReceipt(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span className="badge badge-warning">بانتظار الاستلام</span>;
      case 'RECEIVED': return <span className="badge badge-info">تم الاستلام</span>;
      case 'COMPLETED': return <span className="badge badge-success">تمت الإضافة للمخزن</span>;
      case 'CANCELLED': return <span className="badge badge-danger">ملغي</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="page-section">
      <div className="card">
        <div className="card-header">
          <h3>📦 أذونات استلام المخزون</h3>
          <div className="toolbar">
             <button className="btn btn-secondary btn-sm" onClick={loadReceipts}>تحديث</button>
          </div>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <Loader message="جاري تحميل أذونات الاستلام..." />
            ) : receipts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h4>لا توجد أذونات استلام</h4>
                <p>تنشأ الأذونات تلقائياً عند تسجيل فواتير شراء جديدة</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>رقم الإذن</th>
                    <th>رقم الفاتورة</th>
                    <th>المورد</th>
                    <th>التاريخ</th>
                    <th>الحالة</th>
                    <th>المستلم</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.receiptNumber}</td>
                      <td>{r.invoiceNumber}</td>
                      <td>{r.supplierName}</td>
                      <td>{new Date(r.receiptDate).toLocaleString('ar-EG')}</td>
                      <td>{getStatusBadge(r.status)}</td>
                      <td>{r.receivedBy || '—'}</td>
                      <td>
                        <div className="table-actions" style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn btn-icon btn-ghost" title="التفاصيل" onClick={() => openDetails(r)}>👁️</button>
                          
                          {Api.can('STOCK_WRITE') && (
                            <>
                              <button 
                                className="btn btn-sm btn-primary" 
                                disabled={r.status !== 'PENDING'}
                                onClick={() => openDetails(r)}
                                title={r.status === 'PENDING' ? "تسجيل الكميات المستلمة" : "تم تسجيل الاستلام"}
                              >
                                📦 استلام
                              </button>

                              <button 
                                className="btn btn-sm btn-success" 
                                disabled={r.status !== 'RECEIVED'}
                                onClick={() => handleCommitToInventory(r.id)}
                                title={r.status === 'RECEIVED' ? "ترحيل الكميات للمخزن" : (r.status === 'COMPLETED' ? "تمت الإضافة للمخزن" : "انتظر الاستلام أولاً")}
                              >
                                ➕ للمخزن
                              </button>
                            </>
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

      {isModalOpen && selectedReceipt && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '800px' }}>
              <div className="modal-header">
                <h3>تفاصيل إذن الاستلام: {selectedReceipt.receiptNumber}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', padding: '10px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <div><strong>المورد:</strong> {selectedReceipt.supplierName}</div>
                  <div><strong>رقم الفاتورة:</strong> {selectedReceipt.invoiceNumber}</div>
                  <div><strong>الحالة:</strong> {getStatusBadge(selectedReceipt.status)}</div>
                  <div><strong>التاريخ:</strong> {new Date(selectedReceipt.receiptDate).toLocaleString('ar-EG')}</div>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>الوحدة</th>
                      <th>الكمية المطلوبة</th>
                      <th style={{ width: '150px' }}>الكمية المستلمة</th>
                      <th>إجمالي القطع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceipt.items.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.productName}</td>
                        <td>{item.unitName}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'center', color: (item.receivedQuantity && item.receivedQuantity < item.quantity) ? 'var(--accent-red)' : 'inherit' }}>
                          {selectedReceipt.status === 'PENDING' ? (
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={receivedQuantities[item.id] || ''}
                              onChange={(e) => setReceivedQuantities(prev => ({
                                ...prev,
                                [item.id]: e.target.value
                              }))}
                              step="0.001"
                              min="0"
                              max={item.quantity}
                            />
                          ) : (
                            <span style={{ fontWeight: 600 }}>{item.receivedQuantity ?? item.quantity}</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                          {(((selectedReceipt.status === 'PENDING' ? receivedQuantities[item.id] : item.receivedQuantity) || item.quantity) * item.conversionFactor).toFixed(2)} قطعة
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={closeModal}>إغلاق</button>
                {selectedReceipt.status === 'PENDING' && Api.can('STOCK_WRITE') && (
                  <button className="btn btn-primary" onClick={() => handleSaveQuantities(selectedReceipt.id, receivedQuantities)}>📦 تسجيل وحفظ الكميات</button>
                )}
                {selectedReceipt.status === 'RECEIVED' && Api.can('STOCK_WRITE') && (
                  <button className="btn btn-success" onClick={() => handleCommitToInventory(selectedReceipt.id)}>➕ إضافة للمخزن الآن</button>
                )}
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default StockReceipts;
