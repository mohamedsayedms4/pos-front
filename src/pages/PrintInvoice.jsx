import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import Api from '../services/api';
import ThermalReceipt from '../components/common/ThermalReceipt';
import A4Receipt from '../components/common/A4Receipt';
import Loader from '../components/common/Loader';
import ShareInvoice from '../components/common/ShareInvoice';

const PrintInvoice = () => {
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isAutoPrintUrl = queryParams.get('auto') === 'true';
  const isIframePrint = queryParams.get('iframe') === 'true';

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Read print settings from localStorage
  const printFormat = localStorage.getItem('print_format') || '80mm';
  const printTemplate = localStorage.getItem('print_template') || (printFormat === 'A4' ? 'classic' : 'standard');
  const printAutoTrigger = localStorage.getItem('print_auto_trigger') === 'true' || isAutoPrintUrl;

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        if (id && id.startsWith('OFF-')) {
          const storedStr = localStorage.getItem('print_preview_invoice');
          if (storedStr) {
             const parsed = JSON.parse(storedStr);
             if (parsed && parsed.id === id) {
                 setInvoice(parsed);
                 setLoading(false);
                 return;
             }
          }
          setError('لم يتم العثور على الفاتورة المؤقتة.');
          setLoading(false);
          return;
        }
        
        const res = await Api.getSaleById(id);
        setInvoice(res);
      } catch (err) {
        setError('تعذر تحميل الفاتورة');
      } finally {
        setLoading(false);
      }
    };
    loadInvoice();
  }, [id]);

   /**
   * الحل الجذري: فتح نافذة جديدة نظيفة أو طباعة صامتة (Iframe) بدون CSS خارجي
   */
  const triggerCleanPrint = (useIframe = false) => {
    const receiptEl = document.getElementById('printable-receipt');
    if (!receiptEl) {
      window.print();
      return;
    }

    // تحويل كل SVG باركود لـ data URL حتى يظهر في النافذة الجديدة
    const receiptClone = receiptEl.cloneNode(true);
    const svgsInClone = receiptClone.querySelectorAll('svg');
    const svgsInOriginal = receiptEl.querySelectorAll('svg');
    svgsInOriginal.forEach((svg, i) => {
      if (svgsInClone[i]) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const img = document.createElement('img');
        img.src = svgUrl;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        svgsInClone[i].replaceWith(img);
      }
    });

    // استخراج جميع الـ <style> tags اللي جوه الـ receipt
    const styleContent = Array.from(receiptEl.querySelectorAll('style'))
      .map(s => s.innerText || s.textContent)
      .join('\n');

    // إزالة الـ <style> tags من الـ clone
    receiptClone.querySelectorAll('style').forEach(s => s.remove());

    const pageSize = printFormat === 'A4' ? 'A4 portrait' : '80mm auto';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${invoice?.invoiceNumber || invoice?.id || ''}</title>
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
      </html>
    `;

    if (useIframe) {
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
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
        // Remove after print dialog finishes
        setTimeout(() => document.body.removeChild(printIframe), 10000);
      }, 800);
    } else {
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        window.print();
        return;
      }
      printWindow.document.write(htmlContent + `
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }, 600);
          };
        </script>
      `);
      printWindow.document.close();
    }
  };

  // Automated print trigger on load
  useEffect(() => {
    if (!loading && invoice && (printAutoTrigger || isIframePrint)) {
      const timer = setTimeout(() => {
        triggerCleanPrint(isIframePrint);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, invoice, printAutoTrigger, isIframePrint]);

  // Handle auto close if triggered by auto URL
  useEffect(() => {
    if (isAutoPrintUrl) {
      const handleAfterPrint = () => {
        window.close();
      };
      window.addEventListener('afterprint', handleAfterPrint);
      return () => window.removeEventListener('afterprint', handleAfterPrint);
    }
  }, [isAutoPrintUrl]);

  const handleDownloadPdf = () => {
    const element = document.getElementById('printable-receipt');
    if (!element || !invoice) return;

    const wasPreview = element.classList.contains('preview-mode');
    if (wasPreview) element.classList.remove('preview-mode');

    const opt = {
      margin:       0,
      filename:     `invoice_${invoice.invoiceNumber || invoice.id}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          if (document.fonts && clonedDoc.fonts) {
            document.fonts.forEach(font => {
              try {
                clonedDoc.fonts.add(font);
              } catch (e) {}
            });
          }
        }
      },
      jsPDF: printFormat === 'A4'
               ? { unit: 'mm', format: 'a4', orientation: 'portrait' }
               : { unit: 'mm', format: [80, 200], orientation: 'portrait' }
    };

    document.fonts.ready.then(() => {
      html2pdf().from(element).set(opt).save().then(() => {
        if (wasPreview) element.classList.add('preview-mode');
      }).catch(err => {
        console.error(err);
        if (wasPreview) element.classList.add('preview-mode');
      });
    }).catch(() => {
      html2pdf().from(element).set(opt).save().then(() => {
        if (wasPreview) element.classList.add('preview-mode');
      });
    });
  };

  if (loading) return <Loader message="جاري تجهيز الفاتورة..." />;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>{error}</div>;
  if (!invoice) return <div style={{ padding: '2rem', textAlign: 'center' }}>الفاتورة غير موجودة</div>;

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
      <div className="no-print" style={{
        marginBottom: '20px',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '520px'
      }}>
        <button onClick={() => triggerCleanPrint(false)} style={{
          background: '#007bff', color: '#fff', border: 'none',
          padding: '10px 18px', fontSize: '15px', borderRadius: '8px',
          cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
          fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          🖨️ طباعة الفاتورة
        </button>
        <button onClick={handleDownloadPdf} style={{
          background: '#28a745', color: '#fff', border: 'none',
          padding: '10px 18px', fontSize: '15px', borderRadius: '8px',
          cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
          fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          📥 تنزيل الفاتورة
        </button>
        <ShareInvoice invoice={invoice} btnClassName="share-invoice-btn" />
        <button onClick={() => window.close()} style={{
          background: '#dc3545', color: '#fff', border: 'none',
          padding: '10px 18px', fontSize: '15px', borderRadius: '8px',
          cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
          fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          ❌ إغلاق المعاينة
        </button>
      </div>

      {/* معاينة الفاتورة */}
      <div style={{ background: 'transparent', padding: 0, borderRadius: 0, boxShadow: 'none' }}>
        {printFormat === 'A4' ? (
          <A4Receipt invoice={invoice} template={printTemplate} isPreview={true} />
        ) : (
          <ThermalReceipt invoice={invoice} template={printTemplate} isPreview={true} />
        )}
      </div>

      {/* Share button and Print CSS */}
      <style>{`
        @media print {
          body { background: #fff !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        .share-invoice-btn {
          background-color: #17a2b8 !important;
          color: white !important;
          border: none !important;
          padding: 10px 18px !important;
          font-size: 15px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          font-family: 'Cairo', sans-serif !important;
          font-weight: bold !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          white-space: nowrap !important;
        }
        .share-invoice-btn:hover { background-color: #138496 !important; }
      `}</style>
    </div>
  );
};

export default PrintInvoice;
