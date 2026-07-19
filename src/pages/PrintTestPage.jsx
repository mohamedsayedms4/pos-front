import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ThermalReceipt from '../components/common/ThermalReceipt';
import A4Receipt from '../components/common/A4Receipt';

/**
 * PrintTestPage — صفحة React كاملة للطباعة التجريبية
 * الحل الجذري: تستخرج HTML الفاتورة + الـ <style> tags المدمجة بداخلها
 * وتطبعها من iframe مخفي نظيف — بدون CSS variables أو Dark Mode
 * نفس منطق triggerCleanPrint(useIframe=true) في PrintInvoice.jsx
 */
const PrintTestPage = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isAuto = queryParams.get('auto') === 'true';
  const [ready, setReady] = useState(false);

  const printFormat = localStorage.getItem('print_format') || '80mm';
  const printTemplate = localStorage.getItem('print_template') || (printFormat === 'A4' ? 'classic' : 'standard');
  const storeName = localStorage.getItem('store_name_cached') || 'المتجر';

  const dummyInvoice = {
    id: 'TEST-PREVIEW-001',
    invoiceNumber: '123456789',
    invoiceDate: new Date().toISOString(),
    status: 'PAID',
    createdBy: 'موظف الكاشير',
    customerName: 'عميل تجريبي',
    tenantName: storeName,
    branchName: 'الفرع الرئيسي',
    totalAmount: 150.00,
    paidAmount: 150.00,
    remainingAmount: 0,
    discount: 10.00,
    items: [
      { id: 1, productName: 'منتج تجريبي - طقم كامل', barcode: '1000123', quantity: 2, unitPrice: 50.00, unitName: 'قطعة' },
      { id: 2, productName: 'منتج تجريبي - ملحقات', barcode: '1000124', quantity: 1, unitPrice: 50.00, unitName: 'قطعة' },
    ]
  };

  const isA4 = printFormat === 'A4';
  const mappedTemplate = printTemplate === 'detailed'
    ? (isA4 ? 'modern' : 'standard')
    : printTemplate === 'compact'
      ? (isA4 ? 'barcode_only' : 'compact')
      : printTemplate;

  useEffect(() => {
    // انتظر تحميل React وrender الـ receipt قبل الطباعة
    const timer = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && isAuto) {
      const timer = setTimeout(() => triggerCleanPrint(), 1000);
      return () => clearTimeout(timer);
    }
  }, [ready, isAuto]);

  /**
   * الحل الجذري:
   * 1. clone الـ receipt DOM
   * 2. تحويل كل SVG باركود لـ <img> (ObjectURL)
   * 3. استخراج الـ <style> tags المدمجة داخل الـ receipt فقط
   * 4. بناء HTML نظيف بالكامل: white background + black text + font من Google
   * 5. طباعته من iframe مخفي (لا popup = لا blocking)
   */
  const triggerCleanPrint = () => {
    const receiptEl = document.getElementById('printable-receipt-test');
    if (!receiptEl) return;

    // clone ومعالجة SVG → img
    const receiptClone = receiptEl.cloneNode(true);
    const svgsInClone = receiptClone.querySelectorAll('svg');
    const svgsInOriginal = receiptEl.querySelectorAll('svg');
    svgsInOriginal.forEach((svg, i) => {
      if (svgsInClone[i]) {
        try {
          const svgData = new XMLSerializer().serializeToString(svg);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const svgUrl = URL.createObjectURL(svgBlob);
          const img = document.createElement('img');
          img.src = svgUrl;
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
          svgsInClone[i].replaceWith(img);
        } catch (e) {}
      }
    });

    // استخراج الـ <style> tags من داخل الـ receipt فقط (لا CSS variables، لا dark theme)
    const styleContent = Array.from(receiptEl.querySelectorAll('style'))
      .map(s => s.innerText || s.textContent)
      .join('\n');
    receiptClone.querySelectorAll('style').forEach(s => s.remove());

    const pageSize = printFormat === 'A4' ? 'A4 portrait' : '80mm auto';

    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>طباعة تجريبية</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif !important;
      direction: rtl;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      width: ${printFormat === 'A4' ? '210mm' : '100%'} !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow-x: hidden !important;
    }
    @page { size: ${pageSize}; margin: 0; }
    ${styleContent}
  </style>
</head>
<body>
  <div style="background:#fff; color:#000; direction:rtl;">
    ${receiptClone.outerHTML}
  </div>
</body>
</html>`;

    // إنشاء iframe مخفي للطباعة (لا popup = لا blocking)
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'absolute';
    printIframe.style.top = '0';
    printIframe.style.left = '0';
    printIframe.style.width = '1px';
    printIframe.style.height = '1px';
    printIframe.style.opacity = '0';
    printIframe.style.pointerEvents = 'none';
    document.body.appendChild(printIframe);

    const printDoc = printIframe.contentWindow.document;
    printDoc.open();
    printDoc.write(htmlContent);
    printDoc.close();

    setTimeout(() => {
      if (printIframe.contentWindow) {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
      }
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 10000);
    }, 900);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f2f5',
      color: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      direction: 'rtl',
      fontFamily: "'Cairo', 'Tahoma', 'Arial', sans-serif"
    }}>
      {/* أزرار التحكم */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '520px'
      }}>
        <button onClick={triggerCleanPrint} style={{
          background: '#007bff', color: '#fff', border: 'none',
          padding: '10px 18px', fontSize: '15px', borderRadius: '8px',
          cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
          fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <i className="fa-solid fa-print"></i> طباعة تجريبية
        </button>
        <button onClick={() => window.close()} style={{
          background: '#dc3545', color: '#fff', border: 'none',
          padding: '10px 18px', fontSize: '15px', borderRadius: '8px',
          cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
          fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <i className="fa-solid fa-xmark"></i> إغلاق
        </button>
      </div>

      {/* معاينة الفاتورة — يتم استخراج HTML+styles منها للطباعة */}
      <div id="printable-receipt-test" style={{ background: 'transparent', padding: 0 }}>
        {isA4 ? (
          <A4Receipt invoice={dummyInvoice} template={mappedTemplate === 'standard' ? 'classic' : mappedTemplate} isPreview={false} />
        ) : (
          <ThermalReceipt invoice={dummyInvoice} template={mappedTemplate} isPreview={false} />
        )}
      </div>
    </div>
  );
};

export default PrintTestPage;
