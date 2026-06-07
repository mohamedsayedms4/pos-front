import React, { useEffect, useState, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import StoreApi from '../../services/storeApi';
import { useBranch } from '../../context/BranchContext';

const A4Receipt = ({ invoice, template = 'classic', isPreview = false }) => {
  const [storeConfig, setStoreConfig] = useState(null);
  const barcodeRef = useRef(null);
  const branchContext = useBranch ? useBranch() : null;
  const activeBranch = branchContext?.getSelectedBranch ? branchContext.getSelectedBranch() : null;

  useEffect(() => {
    StoreApi.getStoreInfoPublic()
      .then(res => {
        const configData = res?.data || res;
        if (configData) {
          setStoreConfig(configData);
        }
      })
      .catch(err => {
        console.warn('Error fetching store config from network, falling back to local:', err);
        db.settings.get('store_config').then(localConfig => {
          if (localConfig && localConfig.value) {
            setStoreConfig(localConfig.value);
          }
        }).catch(() => {});
      });
  }, []);

  useEffect(() => {
    if (barcodeRef.current && invoice) {
      try {
        const barcodeValue = invoice.invoiceNumber || invoice.id || "117";
        JsBarcode(barcodeRef.current, String(barcodeValue), {
          format: "CODE128",
          width: 1.5,
          height: 35,
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
  }, [invoice, template]);

  if (!invoice) return null;

  const displayStoreName = storeConfig?.name || invoice.tenantName || invoice.branchName || "المتجر";
  const logoUrl = storeConfig?.offlineLogoBase64 || (storeConfig?.logoUrl ? StoreApi.getImageUrl(storeConfig.logoUrl) : null);
  const displayBranchName = activeBranch?.name || invoice.branchName || "الفرع الرئيسي";

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('ar-EG');
    try {
      let safeDateStr = dateStr;
      if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:?\d{2}$/)) {
        safeDateStr = dateStr.replace(' ', 'T') + 'Z';
      }
      const d = new Date(safeDateStr);
      return d.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
    } catch (e) {}

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
    cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
    cleaned = cleaned.replace(/[\d+\-\s()]{8,}/g, '');
    cleaned = cleaned.replace(/[()\-–—_]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned || 'عميل نقدي';
  };

  const items = invoice.items || [];
  const itemCount = items.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const transId = invoice.invoiceNumber || invoice.id || "117";
  const dateFormatted = formatDate(invoice.invoiceDate);
  const cashierName = cleanCashierName(invoice.createdBy);
  const customerName = cleanCustomerName(invoice.customerName);

  // Render Classic Template
  const renderClassic = () => (
    <div className="invoice-classic-wrapper">
      {/* Header */}
      <div className="classic-header">
        <div className="company-details" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {logoUrl && <img src={logoUrl} alt="Store Logo" style={{ maxHeight: '50px', maxWidth: '100px', objectFit: 'contain' }} />}
          <div>
            <h2>{displayStoreName}</h2>
            <p>{displayBranchName}</p>
            <p>تاريخ الفاتورة: {dateFormatted}</p>
          </div>
        </div>
        <div className="invoice-title-block">
          <h1>فاتورة مبيعات</h1>
          <div className="badge-classic">{invoice.status === 'PAID' ? 'مدفوعة بالكامل' : invoice.status === 'PARTIAL' ? 'مدفوعة جزئياً' : 'آجل'}</div>
        </div>
      </div>

      <hr className="divider-classic" />

      {/* Meta grid */}
      <div className="classic-meta-grid">
        <div className="meta-card">
          <h4>بيانات الفاتورة</h4>
          <table className="meta-table">
            <tbody>
              <tr>
                <td>رقم الفاتورة:</td>
                <td><strong>{transId}</strong></td>
              </tr>
              <tr>
                <td>الكاشير مسؤول:</td>
                <td>{cashierName}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="meta-card">
          <h4>العميل</h4>
          <table className="meta-table">
            <tbody>
              <tr>
                <td>اسم العميل:</td>
                <td>{customerName}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table */}
      <table className="classic-invoice-table">
        <thead>
          <tr>
            <th style={{ width: '8%' }}>#</th>
            <th style={{ width: '45%' }}>الصنف</th>
            <th style={{ width: '12%' }} className="text-center">الكمية</th>
            <th style={{ width: '15%' }} className="text-center">سعر الوحدة</th>
            <th style={{ width: '20%' }} className="text-left">القيمة الاجمالية</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td>{idx + 1}</td>
              <td>
                <div className="item-name">{item.productName || item.name}</div>
                {item.barcode && <div className="item-barcode-text">كود: {item.barcode}</div>}
              </td>
              <td className="text-center">{item.quantity} {item.unitName || ''}</td>
              <td className="text-center">{Number(item.unitPrice).toFixed(2)}</td>
              <td className="text-left">{(item.unitPrice * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Footer */}
      <div className="classic-summary-section">
        <div className="summary-block-classic">
          <table className="summary-table-classic">
            <tbody>
              <tr>
                <td>عدد القطع الإجمالي:</td>
                <td>{itemCount}</td>
              </tr>
              <tr>
                <td>الخصم المباشر:</td>
                <td>{Number(invoice.discount || 0).toFixed(2)}</td>
              </tr>
              <tr className="grand-total-row">
                <td>الإجمالي المستحق:</td>
                <td>{Number(invoice.totalAmount).toFixed(2)}</td>
              </tr>
              {invoice.paidAmount !== undefined && (
                <>
                  <tr>
                    <td>المبلغ المدفوع:</td>
                    <td>{Number(invoice.paidAmount).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>المبلغ المتبقي:</td>
                    <td>{Number(invoice.remainingAmount || 0).toFixed(2)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Modern/Premium Template
  const renderModern = () => (
    <div className="invoice-modern-wrapper">
      {/* Dynamic Header */}
      <div className="modern-header">
        <div className="modern-header-logo-side" style={{ display: 'flex', alignItems: 'center' }}>
          {logoUrl ? (
            <div className="modern-logo-container" style={{ background: 'transparent', boxShadow: 'none' }}>
              <img src={logoUrl} alt="Store Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <div className="modern-logo-container">
              <span className="logo-letter">{displayStoreName.charAt(0)}</span>
            </div>
          )}
          <div className="modern-company-info">
            <h2>{displayStoreName}</h2>
            <p className="branch-tag">📍 {displayBranchName}</p>
          </div>
        </div>
        <div className="modern-header-title-side">
          <span className="modern-invoice-tag">فاتورة مبيعات</span>
          <span className={`modern-status-badge ${invoice.status?.toLowerCase()}`}>{invoice.status === 'PAID' ? '✓ مدفوع' : invoice.status === 'PARTIAL' ? '⚠️ مدفوع جزئياً' : '💳 آجل'}</span>
        </div>
      </div>

      {/* Grid details cards */}
      <div className="modern-cards-grid">
        <div className="modern-info-card">
          <div className="card-header-modern">
            <span className="card-icon">📄</span>
            <h3>تفاصيل المعاملة</h3>
          </div>
          <div className="card-row">
            <span className="lbl">رقم الفاتورة:</span>
            <span className="val highlight">{transId}</span>
          </div>
          <div className="card-row">
            <span className="lbl">تاريخ الإصدار:</span>
            <span className="val">{dateFormatted}</span>
          </div>
          <div className="card-row">
            <span className="lbl">كاشير مسؤول:</span>
            <span className="val">{cashierName}</span>
          </div>
        </div>

        <div className="modern-info-card">
          <div className="card-header-modern">
            <span className="card-icon">👥</span>
            <h3>العميل</h3>
          </div>
          <div className="card-row">
            <span className="lbl">اسم العميل:</span>
            <span className="val">{customerName}</span>
          </div>
        </div>
      </div>

      {/* Sleek Items Table */}
      <table className="modern-invoice-table">
        <thead>
          <tr>
            <th className="th-idx">#</th>
            <th>الصنف والوصف</th>
            <th className="text-center">الكمية</th>
            <th className="text-center">السعر</th>
            <th className="text-left">القيمة الاجمالية</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id || idx} className="modern-item-row">
              <td className="td-idx">{String(idx + 1).padStart(2, '0')}</td>
              <td>
                <div className="item-name-modern">{item.productName || item.name}</div>
                {item.barcode && <span className="item-barcode-badge">كود: {item.barcode}</span>}
              </td>
              <td className="text-center text-qty-modern">{item.quantity} {item.unitName || ''}</td>
              <td className="text-center">{Number(item.unitPrice).toFixed(2)}</td>
              <td className="text-left font-bold">{(item.unitPrice * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Section */}
      <div className="modern-summary-section">
        <div className="modern-summary-card">
          <div className="summary-line">
            <span>عدد القطع الإجمالي</span>
            <span>{itemCount}</span>
          </div>
          <div className="summary-line">
            <span>الخصم المباشر</span>
            <span>{Number(invoice.discount || 0).toFixed(2)} ج.م</span>
          </div>
          <div className="divider-modern"></div>
          <div className="summary-line grand-total">
            <span>الإجمالي النهائي</span>
            <span className="total-val-modern">{Number(invoice.totalAmount).toFixed(2)} ج.م</span>
          </div>
          {invoice.paidAmount !== undefined && (
            <div className="modern-payments-block">
              <div className="summary-line sub-line">
                <span>المبلغ المدفوع</span>
                <span>{Number(invoice.paidAmount).toFixed(2)} ج.م</span>
              </div>
              <div className="summary-line sub-line warning">
                <span>المبلغ المتبقي</span>
                <span>{Number(invoice.remainingAmount || 0).toFixed(2)} ج.م</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`a4-invoice-container ${template === 'modern' ? 'modern-theme' : 'classic-theme'} ${isPreview ? 'preview-mode' : ''}`} id="printable-receipt" dir="rtl">
      
      {/* Load core template */}
      {template === 'modern' ? renderModern() : renderClassic()}

      {/* Shared Footer Barcode & Powered-By */}
      <div className="a4-shared-footer">
        <div className="a4-barcode-container">
          <svg ref={barcodeRef}></svg>
        </div>
        <div className="a4-powered-by">powered by seggelerp.com</div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap');

        /* Core layout styling */
        .a4-invoice-container {
          width: 210mm;
          min-height: 280mm;
          padding: 15mm 20mm;
          background: #ffffff;
          color: #1e293b;
          font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif;
          direction: rtl;
          text-align: right;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .a4-invoice-container h1, 
        .a4-invoice-container h2, 
        .a4-invoice-container h3, 
        .a4-invoice-container h4, 
        .a4-invoice-container h5, 
        .a4-invoice-container h6,
        .a4-invoice-container span,
        .a4-invoice-container div,
        .a4-invoice-container td,
        .a4-invoice-container th,
        .a4-invoice-container p {
          font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif !important;
          letter-spacing: normal !important;
        }

        .preview-mode {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 30px;
        }

        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }

        /* --- Classic CSS Theme --- */
        .classic-theme .classic-header {
          display: block;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .classic-theme .company-details {
          float: right;
          text-align: right;
        }
        .classic-theme .company-details h2 { margin: 0 0 5px 0; font-size: 1.6rem; font-weight: 700; }
        .classic-theme .company-details p { margin: 2px 0; color: #475569; font-size: 0.9rem; }
        .classic-theme .invoice-title-block {
          float: left;
          text-align: right;
        }
        .classic-theme .invoice-title-block h1 { margin: 0 0 10px 0; font-size: 1.8rem; font-weight: 700; }
        .classic-theme .badge-classic {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 4px 12px;
          font-size: 0.85rem;
          font-weight: bold;
          display: inline-block;
        }
        .classic-theme .divider-classic { border: none; border-top: 2px solid #000000; clear: both; margin: 10px 0 20px 0; }
        .classic-theme .classic-meta-grid {
          display: block;
          overflow: hidden;
          margin-bottom: 30px;
        }
        .classic-theme .meta-card {
          width: 47%;
          float: right;
          box-sizing: border-box;
        }
        .classic-theme .meta-card:last-child {
          float: left;
        }
        .classic-theme .meta-card h4 { margin: 0 0 10px 0; border-bottom: 1px solid #000; padding-bottom: 5px; font-size: 1rem; font-weight: 600; text-align: right; }
        .classic-theme .meta-table { width: 100%; border-collapse: collapse; }
        .classic-theme .meta-table td { padding: 4px 0; font-size: 0.9rem; text-align: right; }
        .classic-theme .meta-table td:first-child { width: 35%; color: #475569; }
        .classic-theme .meta-table td:last-child { text-align: left; }
        
        .classic-theme .classic-invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; clear: both; }
        .classic-theme .classic-invoice-table th {
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 10px 8px;
          font-weight: bold;
          font-size: 0.95rem;
          text-align: right;
        }
        .classic-theme .classic-invoice-table th.text-center { text-align: center; }
        .classic-theme .classic-invoice-table th.text-left { text-align: left; }
        .classic-theme .classic-invoice-table td { border-bottom: 1px solid #e2e8f0; padding: 12px 8px; font-size: 0.95rem; vertical-align: top; text-align: right; }
        .classic-theme .classic-invoice-table td.text-center { text-align: center; }
        .classic-theme .classic-invoice-table td.text-left { text-align: left; }
        .classic-theme .item-name { font-weight: bold; }
        .classic-theme .item-barcode-text { font-size: 0.75rem; color: #64748b; margin-top: 2px; font-family: monospace; }
        
        .classic-theme .classic-summary-section { display: block; overflow: hidden; clear: both; }
        .classic-theme .summary-block-classic { width: 45%; float: left; }
        .classic-theme .summary-table-classic { width: 100%; border-collapse: collapse; }
        .classic-theme .summary-table-classic td { padding: 6px 4px; font-size: 0.9rem; text-align: right; }
        .classic-theme .summary-table-classic td:first-child { color: #475569; }
        .classic-theme .summary-table-classic td:last-child { text-align: left; font-weight: 600; }
        .classic-theme .summary-table-classic .grand-total-row { border-top: 1px solid #000; border-bottom: 2px double #000; }
        .classic-theme .summary-table-classic .grand-total-row td { font-size: 1.1rem; font-weight: 700; padding: 10px 4px; color: #000; }
        
        /* --- Modern CSS Theme --- */
        .modern-theme .modern-header {
          display: block;
          overflow: hidden;
          margin-bottom: 30px;
          border-bottom: 1.5px solid #f1f5f9;
          padding-bottom: 20px;
        }
        .modern-theme .modern-header-logo-side {
          float: right;
        }
        .modern-theme .modern-logo-container {
          width: 55px;
          height: 55px;
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          border-radius: 12px;
          display: inline-block;
          vertical-align: middle;
          margin-left: 15px;
          text-align: center;
          line-height: 55px;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
        }
        .modern-theme .logo-letter { color: #ffffff; font-size: 1.7rem; font-weight: 900; font-family: 'Inter', sans-serif; display: inline-block; vertical-align: middle; }
        .modern-theme .modern-company-info {
          display: inline-block;
          vertical-align: middle;
          text-align: right;
        }
        .modern-theme .modern-company-info h2 { margin: 0 0 4px 0; font-size: 1.35rem; font-weight: 700; color: #0f172a; }
        .modern-theme .branch-tag { margin: 0; font-size: 0.85rem; color: #64748b; font-weight: 600; }
        
        .modern-theme .modern-header-title-side {
          float: left;
          text-align: right;
        }
        .modern-theme .modern-invoice-tag {
          font-size: 1.8rem;
          font-weight: 700;
          color: #4f46e5;
          display: block;
          margin-bottom: 5px;
        }
        .modern-theme .modern-status-badge {
          font-size: 0.8rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          display: inline-block;
        }
        .modern-theme .modern-status-badge.paid { background: #dcfce7; color: #15803d; }
        .modern-theme .modern-status-badge.partial { background: #fef3c7; color: #b45309; }
        .modern-theme .modern-status-badge.credit { background: #fee2e2; color: #b91c1c; }
        
        .modern-theme .modern-cards-grid {
          display: block;
          overflow: hidden;
          margin-bottom: 30px;
          clear: both;
        }
        .modern-theme .modern-info-card {
          width: 48%;
          float: right;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px;
          box-sizing: border-box;
        }
        .modern-theme .modern-info-card:last-child {
          float: left;
        }
        .modern-theme .card-header-modern {
          display: block;
          overflow: hidden;
          margin-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
        }
        .modern-theme .card-icon {
          float: right;
          font-size: 1rem;
          margin-left: 8px;
        }
        .modern-theme .card-header-modern h3 {
          float: right;
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: #1e293b;
        }
        .modern-theme .card-row {
          display: block;
          overflow: hidden;
          margin-bottom: 6px;
          font-size: 0.85rem;
        }
        .modern-theme .card-row .lbl {
          float: right;
          color: #64748b;
        }
        .modern-theme .card-row .val {
          float: left;
          color: #334155;
          font-weight: 600;
        }
        .modern-theme .card-row .val.highlight { color: #4f46e5; font-family: monospace; font-size: 0.95rem; }
        
        .modern-theme .modern-invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; clear: both; }
        .modern-theme .modern-invoice-table th {
          background: #f1f5f9;
          padding: 12px 16px;
          color: #475569;
          font-weight: 800;
          font-size: 0.85rem;
          text-align: right;
        }
        .modern-theme .modern-invoice-table th.th-idx { border-top-right-radius: 8px; border-bottom-right-radius: 8px; width: 6%; }
        .modern-theme .modern-invoice-table th:last-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
        .modern-theme .modern-invoice-table th.text-center { text-align: center; }
        .modern-theme .modern-invoice-table th.text-left { text-align: left; }
        .modern-theme .modern-item-row td { padding: 14px 16px; border-bottom: 1.5px solid #f1f5f9; font-size: 0.9rem; color: #334155; text-align: right; }
        .modern-theme .modern-item-row td.text-center { text-align: center; }
        .modern-theme .modern-item-row td.text-left { text-align: left; }
        .modern-theme .td-idx { color: #94a3b8; font-family: monospace; }
        .modern-theme .item-name-modern { font-weight: 700; color: #0f172a; }
        .modern-theme .item-barcode-badge {
          display: inline-block;
          font-size: 0.7rem;
          background: #f1f5f9;
          color: #475569;
          padding: 1px 6px;
          border-radius: 4px;
          margin-top: 4px;
          font-family: monospace;
        }
        .modern-theme .text-qty-modern { font-weight: 700; color: #0f172a; }
        
        .modern-theme .modern-summary-section {
          display: block;
          overflow: hidden;
          clear: both;
        }
        .modern-theme .modern-summary-card {
          width: 45%;
          float: left;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 20px;
          box-sizing: border-box;
        }
        .modern-theme .summary-line {
          display: block;
          overflow: hidden;
          margin-bottom: 8px;
          font-size: 0.9rem;
          color: #475569;
        }
        .modern-theme .summary-line span:first-child {
          float: right;
        }
        .modern-theme .summary-line span:last-child {
          float: left;
          font-weight: 700;
          color: #1e293b;
        }
        .modern-theme .divider-modern { border-top: 1px solid #cbd5e1; margin: 10px 0; clear: both; }
        .modern-theme .summary-line.grand-total { font-size: 1.15rem; color: #0f172a; }
        .modern-theme .summary-line.grand-total span:last-child { color: #4f46e5; font-weight: 700; }
        .modern-theme .modern-payments-block { background: #f1f5f9; border-radius: 8px; padding: 8px 12px; margin-top: 10px; clear: both; }
        .modern-theme .summary-line.sub-line { font-size: 0.8rem; margin-bottom: 4px; }
        .modern-theme .summary-line.sub-line:last-child { margin-bottom: 0; }
        .modern-theme .summary-line.sub-line.warning span:last-child { color: #b91c1c; }
        .modern-theme .summary-line.grand-total span:last-child { color: #4f46e5; font-weight: 900; }
        .modern-theme .modern-payments-block { background: #f1f5f9; border-radius: 8px; padding: 8px 12px; margin-top: 10px; }
        .modern-theme .summary-line.sub-line { font-size: 0.8rem; margin-bottom: 4px; }
        .modern-theme .summary-line.sub-line:last-child { margin-bottom: 0; }
        .modern-theme .summary-line.sub-line.warning span:last-child { color: #b91c1c; }

        /* --- Shared A4 Footer --- */
        .a4-shared-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          border-top: 1px dashed #cbd5e1;
          padding-top: 15px;
        }
        .a4-barcode-container { display: flex; justify-content: center; }
        .a4-powered-by { font-size: 7.5pt; color: #94a3b8; font-family: sans-serif; letter-spacing: 0.5px; text-transform: lowercase; }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible !important; }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 280mm !important;
            padding: 15mm 20mm !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
    </div>
  );
};

export default A4Receipt;
