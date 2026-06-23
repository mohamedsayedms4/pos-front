import React, { useEffect, useState, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import StoreApi from '../../services/storeApi';
import Api from '../../services/api';
import { useBranch } from '../../context/BranchContext';

const ThermalReceipt = ({ invoice, template = 'standard', settings = {}, isPreview = false }) => {
  const [storeConfig, setStoreConfig] = useState(null);
  const barcodeRef = useRef(null);
  const branchContext = useBranch ? useBranch() : null;
  const activeBranch = branchContext?.getSelectedBranch ? branchContext.getSelectedBranch() : null;

  useEffect(() => {
    // استخدام Admin API لجلب بيانات المتجر الصحيحة للتنت الحالي
    StoreApi.getStoreInfoAdmin()
      .then(res => {
        const configData = res?.data || res;
        if (configData) {
          setStoreConfig(configData);
        }
      })
      .catch(err => {
        console.warn('Error fetching store config from admin API', err);
        // fallback للـ public API
        StoreApi.getStoreInfoPublic()
          .then(res => {
            const configData = res?.data || res;
            if (configData) setStoreConfig(configData);
          })
          .catch(() => { });
      });
  }, []);

  useEffect(() => {
    if (barcodeRef.current && invoice) {
      try {
        const barcodeValue = invoice.invoiceNumber || invoice.id || "117";
        JsBarcode(barcodeRef.current, String(barcodeValue), {
          format: "CODE128",
          width: 1.8,
          height: 40,
          displayValue: true,
          fontSize: 10,
          margin: 0,
          background: "#ffffff",
          lineColor: "#000000"
        });
      } catch (err) {
        console.error("Barcode generation failed:", err);
      }
    }
  }, [invoice]);

  if (!invoice) return null;

  const displayStoreName = storeConfig?.name || invoice.tenantName || settings.storeName || invoice.branchName || "المتجر";
  // اللوجو: يحاول offlineLogoBase64 أولاً، ثم يبني URL من الـ admin API
  const logoUrl = storeConfig?.offlineLogoBase64 ||
    (storeConfig?.logoUrl
      ? (storeConfig.logoUrl.startsWith('http') || storeConfig.logoUrl.startsWith('data:') || storeConfig.logoUrl.startsWith('/')
        ? (storeConfig.logoUrl.startsWith('/') ? `${window.location.origin.replace(':5173', ':8080')}${storeConfig.logoUrl}` : storeConfig.logoUrl)
        : Api.getImageUrl(storeConfig.logoUrl))
      : null);
  const displayBranchName = activeBranch?.name || invoice.branchName || settings.branchName || "الفرع الرئيسي";

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '');
    try {
      let safeDateStr = dateStr;
      if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:?\d{2}$/)) {
        safeDateStr = dateStr.replace(' ', 'T') + 'Z';
      }
      const d = new Date(safeDateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).replace(',', '');
    } catch {
      return dateStr;
    }
  };

  const cleanCashierName = (createdBy) => {
    if (!createdBy) return "Mohamed Sayed";
    try {
      const userStr = localStorage.getItem('pos_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && (createdBy === user.email || createdBy === user.username)) {
          return user.name || user.username || createdBy;
        }
      }
    } catch (e) { }

    if (createdBy.includes('@')) {
      const part = createdBy.split('@')[0];
      return part
        .replace(/[._\d]/g, ' ')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return createdBy;
  };

  const cleanCustomerName = (name) => {
    if (!name) return 'عميل نقدي';
    let cleaned = name;
    // Remove email pattern
    cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
    // Remove phone numbers or sequences of 8+ digits
    cleaned = cleaned.replace(/[\d+\-\s()]{8,}/g, '');
    // Clean up remaining dashes, parentheses, or trailing spaces
    cleaned = cleaned.replace(/[()\-–—_]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned || 'عميل نقدي';
  };

  const items = invoice.items || [];
  const itemCount = items.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const transId = invoice.invoiceNumber || invoice.id || "117";
  const dateFormatted = formatDate(invoice.invoiceDate);
  const cashierName = cleanCashierName(invoice.createdBy);
  const customerName = cleanCustomerName(invoice.customerName);

  return (
    <div className={`receipt-container ${isPreview ? 'preview-mode' : ''} ${template === 'compact' ? 'compact-mode' : ''}`} id="printable-receipt" dir="rtl">
      {/* Header: Logo + Store Name centered */}
      <div className="receipt-header-container">
        {logoUrl && (
          <div className="logo-wrapper">
            <img src={logoUrl} alt="Store Logo" className="store-logo" />
          </div>
        )}
        <div className="store-info-block">
          <h1 className="store-name-title">{displayStoreName}</h1>
          <p className="branch-subtitle">{displayBranchName}</p>
        </div>
        <div className="solid-divider" style={{ marginTop: '8px' }}></div>
      </div>

      <table className="receipt-table">
        <thead>
          <tr className="header-border-top header-border-bottom">
            <th className="text-right col-item">الصنف</th>
            <th className="text-center col-qty">كمية</th>
            <th className="text-center col-price">السعر</th>
            <th className="text-left col-value">القيمة</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <React.Fragment key={item.id || idx}>
              <tr className="item-row">
                <td className="text-right item-name-cell" style={template === 'barcode_only' ? { fontFamily: 'monospace', fontSize: '11pt' } : {}}>
                  {template === 'barcode_only' ? (item.barcode || 'لا يوجد باركود') : (item.productName || item.name || item.barcode || 'بدون اسم')}
                </td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-center">{Number(item.unitPrice).toFixed(2)}</td>
                <td className="text-left">{(item.unitPrice * item.quantity).toFixed(2)}</td>
              </tr>
              {template !== 'barcode_only' && (
                <tr>
                  <td colSpan="4" className="text-right product-id">{item.barcode || item.productBarcode || 'PRB-000000000'}</td>
                </tr>
              )}
              {idx < items.length - 1 && <tr className="dashed-separator"><td colSpan="4"></td></tr>}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div className="solid-divider"></div>

      <div className="receipt-totals">
        <div className="d-flex justify-content-between total-row-item">
          <span>عدد القطع:</span>
          <span>{itemCount}</span>
        </div>
        <div className="d-flex justify-content-between total-row-final">
          <span className="total-lbl">الإجمالي:</span>
          <span className="total-val">{Number(invoice.totalAmount).toFixed(2)}</span>
        </div>
      </div>

      <div className="dashed-divider"></div>

      <div className="receipt-footer-details text-right">
        {template !== 'compact' && <div className="footer-line">الكاشير: {cashierName}</div>}
        {template !== 'compact' && <div className="footer-line">العميل: {customerName}</div>}
        <div className="footer-line date-line">Date: {dateFormatted}</div>
      </div>

      {template !== 'compact' && (
        <div className="receipt-barcode-container">
          <svg ref={barcodeRef}></svg>
        </div>
      )}

      <div className="powered-by-line">powered by seggelerp.com</div>

      <style>{`
        /* ─── Header ─── */
        .receipt-header-container {
          text-align: center;
          margin-bottom: 6px;
        }
        .logo-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 6px;
        }
        .store-logo {
          height: 48px;
          width: auto;
          max-width: 100px;
          object-fit: contain;
          display: block;
        }
        .store-info-block {
          text-align: center;
        }
        .receipt-container {
          width: 80mm;
          max-width: 80mm;
          padding: 6mm 4mm;
          background: #fff;
          color: #000;
          font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif;
          font-size: 9.5pt;
          direction: rtl;
          text-align: right;
          margin: 0 auto;
          box-sizing: border-box;
          overflow: hidden;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .receipt-container h1,
        .receipt-container h2,
        .receipt-container h3,
        .receipt-container h4,
        .receipt-container h5,
        .receipt-container h6,
        .receipt-container span,
        .receipt-container div,
        .receipt-container td,
        .receipt-container th,
        .receipt-container p {
          font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif !important;
          letter-spacing: normal !important;
          color: #000 !important;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .preview-mode {
          box-shadow: 0 0 20px rgba(0,0,0,0.4);
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        .store-name-title {
          font-size: 16pt;
          font-weight: 900;
          margin: 0 0 3px 0;
          display: block;
          color: #000 !important;
          text-align: center;
          line-height: 1.3;
          word-break: break-word;
        }
        .branch-subtitle {
          font-size: 9.5pt;
          margin: 0 0 4px 0;
          font-weight: 500;
          color: #444 !important;
          text-align: center;
          word-break: break-word;
        }
        
        .solid-divider { border: none; border-bottom: 1.5pt solid #000; margin: 4px 0; }
        .dashed-divider { border: none; border-bottom: 1pt dashed #aaa; margin: 7px 0; }
        
        .receipt-table { width: 100%; border-collapse: collapse; margin: 4px 0; table-layout: fixed; }
        .header-border-top { border-top: 1.5pt solid #000; }
        .header-border-bottom { border-bottom: 1.5pt solid #000; }
        
        .receipt-table th {
          padding: 5px 2px;
          font-size: 9.5pt;
          font-weight: bold;
          overflow: hidden;
          white-space: nowrap;
        }
        .receipt-table td {
          padding: 3px 2px;
          font-size: 9pt;
          vertical-align: top;
          overflow: hidden;
        }
        
        .col-value { width: 22%; text-align: left; }
        .col-price { width: 20%; text-align: center; }
        .col-qty   { width: 15%; text-align: center; }
        .col-item  { width: 43%; text-align: right; }
        
        .item-row td { padding-top: 6px; }
        .item-name-cell {
          font-weight: bold;
          font-size: 9.5pt;
          word-break: break-word;
          white-space: normal;
          line-height: 1.3;
        }
        .product-id {
          font-size: 7.5pt;
          color: #666;
          padding-top: 1px !important;
          font-family: monospace, sans-serif !important;
          word-break: break-all;
        }
        .dashed-separator { border-bottom: 0.5pt dashed #ddd; height: 1px; }

        .receipt-totals { margin-top: 6px; }
        .total-row-item { margin-bottom: 5px; color: #333; font-size: 9.5pt; }
        .total-row-final { font-size: 14pt; font-weight: 900; margin-bottom: 8px; }
        .total-row-final span { color: #000; }
        .total-lbl { font-size: 13pt; }

        .receipt-footer-details { margin-top: 8px; line-height: 1.6; }
        .footer-line { font-size: 9.5pt; word-break: break-word; }
        .date-line { font-size: 8pt; margin-top: 4px; color: #555; font-family: 'Courier New', monospace !important; direction: ltr; text-align: left; }
        .powered-by-line { font-size: 7pt; text-align: center; margin-top: 10px; color: #888; font-family: sans-serif; }
        .receipt-barcode-container { display: flex; justify-content: center; margin-top: 12px; margin-bottom: 4px; }
        .receipt-barcode-container svg { max-width: 100%; height: auto; }
        .receipt-barcode-container img { max-width: 100%; height: auto; }

        /* Compact Mode */
        .compact-mode { font-size: 8pt !important; padding: 3mm 2mm !important; }
        .compact-mode .store-name-title  { font-size: 13pt !important; }
        .compact-mode .branch-subtitle   { font-size: 8.5pt !important; }
        .compact-mode .receipt-table th  { padding: 3px 1px !important; font-size: 8pt !important; }
        .compact-mode .receipt-table td  { padding: 2px 1px !important; font-size: 8pt !important; }
        .compact-mode .item-name-cell    { font-size: 8.2pt !important; }
        .compact-mode .product-id        { font-size: 6.5pt !important; }
        .compact-mode .total-row-final   { font-size: 11pt !important; }
        .compact-mode .total-lbl         { font-size: 10pt !important; }
        .compact-mode .powered-by-line   { margin-top: 5px !important; }
        .compact-mode .store-logo        { height: 36px !important; }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .d-flex { display: flex; }
        .justify-content-between { justify-content: space-between; }

        @media print {
          @page { size: 80mm auto; margin: 0; }
          .hide-on-print { display: none !important; }
          .print-page-wrapper { padding: 0 !important; background: white !important; }
          .receipt-preview-container { box-shadow: none !important; padding: 0 !important; }
          #printable-receipt {
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            padding: 0 2mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            direction: rtl;
            margin: 0;
            box-sizing: border-box !important;
          }
          .receipt-barcode-container svg,
          .receipt-barcode-container img {
            display: block !important;
            visibility: visible !important;
            max-width: 100% !important;
          }
          .preview-mode {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ThermalReceipt;
