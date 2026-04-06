import React from 'react';

const ThermalReceipt = ({ invoice, settings = {}, isPreview = false }) => {
  if (!invoice) return null;

  const {
    storeName = "مجموعة المهلل",
    branchName = "الفرع الرئيسي",
  } = settings;

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '');
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).replace(',', '');
    } catch {
      return dateStr;
    }
  };

  const items = invoice.items || [];
  const itemCount = items.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const transId = invoice.invoiceNumber || invoice.id || "117";
  const dateFormatted = formatDate(invoice.invoiceDate);
  const cashierName = invoice.createdBy || "Mohamed Sayed";

  return (
    <div className={`receipt-container ${isPreview ? 'preview-mode' : ''}`} id="printable-receipt">
      <div className="receipt-header">
        <h1 className="store-name-title">{storeName}</h1>
        <p className="branch-subtitle">{branchName}</p>
        <div className="solid-divider"></div>
      </div>

      <table className="receipt-table">
        <thead>
          <tr className="header-border-top header-border-bottom">
            <th className="text-left col-value">القيمة</th>
            <th className="text-center col-price">السعر</th>
            <th className="text-center col-qty">كمية</th>
            <th className="text-right col-item">الصنف</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <React.Fragment key={item.id || idx}>
              <tr className="item-row">
                <td className="text-left">{(item.unitPrice * item.quantity).toFixed(2)}</td>
                <td className="text-center">{Number(item.unitPrice).toFixed(2)}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right item-name-cell">{item.productName || item.name}</td>
              </tr>
              <tr>
                <td colSpan="3"></td>
                <td className="text-right product-id">{item.barcode || item.productBarcode || 'PRB-000000000'}</td>
              </tr>
              {idx < items.length - 1 && <tr className="dashed-separator"><td colSpan="4"></td></tr>}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div className="solid-divider"></div>

      <div className="receipt-totals">
        <div className="d-flex justify-content-between total-row-item">
          <span>{itemCount}</span>
          <span>عدد القطع:</span>
        </div>
        <div className="d-flex justify-content-between total-row-final">
          <span className="total-val">{Number(invoice.totalAmount).toFixed(2)}</span>
          <span className="total-lbl">الإجمالي:</span>
        </div>
      </div>

      <div className="dashed-divider"></div>

      <div className="receipt-footer-details text-right">
        <div className="footer-line">الكاشير: {cashierName}</div>
        <div className="footer-line">العميل: {invoice.customerName || 'عميل نقدي'}</div>
        <div className="footer-line date-line">Date: {dateFormatted}</div>
      </div>

      <div className="barcode-footer">
        <img
          src={`/api/public/barcode/${transId}`}
          alt="Invoice Barcode"
          className="main-barcode"
        />
      </div>

      <style>{`
        .receipt-container {
          width: 80mm;
          padding: 8mm 5mm;
          background: #fff;
          color: #000;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 9.5pt;
          direction: rtl;
          margin: 0 auto;
        }
        .preview-mode {
          box-shadow: 0 0 20px rgba(0,0,0,0.5);
          border: 1px solid #ddd;
          min-height: 500px;
          border-radius: 4px;
        }
        .receipt-header { text-align: center; margin-bottom: 5px; }
        .store-name-title { font-size: 18pt; font-weight: 800; margin: 0; display: block; }
        .branch-subtitle { font-size: 11pt; margin: 2px 0 8px 0; font-weight: 500; }
        
        .solid-divider { border-bottom: 1.5pt solid #000; margin: 4px 0; }
        .dashed-divider { border-bottom: 1pt dashed #ccc; margin: 8px 0; }
        
        .receipt-table { width: 100%; border-collapse: collapse; margin: 5px 0; table-layout: fixed; }
        .header-border-top { border-top: 1.5pt solid #000; }
        .header-border-bottom { border-bottom: 1.5pt solid #000; }
        
        .receipt-table th { padding: 6px 0; font-size: 10pt; font-weight: bold; }
        .receipt-table td { padding: 4px 0; font-size: 9.5pt; vertical-align: top; }
        
        .col-value { width: 22%; }
        .col-price { width: 22%; }
        .col-qty { width: 15%; }
        .col-item { width: 41%; }
        
        .item-row td { padding-top: 8px; }
        .item-name-cell { font-weight: bold; font-size: 10.5pt; }
        .product-id { font-size: 8pt; color: #666; padding-top: 0 !important; }
        .dashed-separator { border-bottom: 0.5pt dashed #eee; height: 1px; }

        .receipt-totals { margin-top: 5px; }
        .total-row-item { margin-bottom: 8px; color: #444; }
        .total-row-final { font-size: 13pt; font-weight: 900; margin-bottom: 10px; }
        .total-row-final span { color: #000; }
        .total-lbl { font-size: 12pt; }

        .receipt-footer-details { margin-top: 10px; line-height: 1.5; }
        .footer-line { font-size: 10pt; }
        .date-line { font-size: 8.5pt; margin-top: 5px; color: #555; font-family: sans-serif; }
        
        .barcode-footer { text-align: center; margin-top: 25px; }
        .main-barcode { width: 70%; height: auto; max-height: 60px; object-fit: contain; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .d-flex { display: flex; }
        .justify-content-between { justify-content: space-between; }

        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { visibility: hidden; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          #printable-receipt { 
            visibility: visible !important; 
            position: fixed !important; 
            left: 0 !important; top: 0 !important; 
            width: 80mm !important; 
            min-height: 100vh;
            background: white !important;
            padding: 8mm 5mm !important;
            z-index: 999999 !important;
            direction: rtl;
          }
          #printable-receipt * { visibility: visible !important; }
        }
      `}</style>
    </div>
  );
};

export default ThermalReceipt;
