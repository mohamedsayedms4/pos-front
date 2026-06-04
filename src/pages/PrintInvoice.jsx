import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import Api from '../services/api';
import ThermalReceipt from '../components/common/ThermalReceipt';
import A4Receipt from '../components/common/A4Receipt';
import Loader from '../components/common/Loader';
import ShareInvoice from '../components/common/ShareInvoice';

const PrintInvoice = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Read print settings from localStorage
  const printFormat = localStorage.getItem('print_format') || '80mm';
  const printTemplate = localStorage.getItem('print_template') || (printFormat === 'A4' ? 'classic' : 'standard');
  const printAutoTrigger = localStorage.getItem('print_auto_trigger') === 'true';

  useEffect(() => {
    const loadInvoice = async () => {
      try {
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

  // Automated print trigger on load
  useEffect(() => {
    if (!loading && invoice && printAutoTrigger) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000); // 1-second delay for barcodes and images to fully render
      return () => clearTimeout(timer);
    }
  }, [loading, invoice, printAutoTrigger]);

  const handleDownloadPdf = () => {
    const element = document.getElementById('printable-receipt');
    if (!element || !invoice) return;

    const wasPreview = element.classList.contains('preview-mode');
    if (wasPreview) element.classList.remove('preview-mode');

    // Tailor PDF sizing and margins based on selected layout format
    const opt = {
      margin:       0, // Set margins to 0 so the template's internal padding is used directly
      filename:     `invoice_${invoice.invoiceNumber || invoice.id}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true,
        onclone: (clonedDoc) => {
          if (document.fonts && clonedDoc.fonts) {
            document.fonts.forEach(font => {
              try {
                clonedDoc.fonts.add(font);
              } catch (e) {
                console.warn('Failed to copy font face to cloned document:', e);
              }
            });
          }
        }
      },
      jsPDF:        printFormat === 'A4'
                      ? { unit: 'mm', format: 'a4', orientation: 'portrait' }
                      : { unit: 'mm', format: [80, 200], orientation: 'portrait' }
    };

    // Wait until web fonts (Cairo, etc.) are fully loaded before rendering HTML to canvas
    document.fonts.ready.then(() => {
      html2pdf().from(element).set(opt).save().then(() => {
        if (wasPreview) element.classList.add('preview-mode');
      }).catch(err => {
        console.error(err);
        if (wasPreview) element.classList.add('preview-mode');
      });
    }).catch(() => {
      // Fallback if fonts.ready fails or is not supported
      html2pdf().from(element).set(opt).save().then(() => {
        if (wasPreview) element.classList.add('preview-mode');
      });
    });
  };

  if (loading) return <Loader message="جاري تجهيز الفاتورة..." />;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>{error}</div>;
  if (!invoice) return <div style={{ padding: '2rem', textAlign: 'center' }}>الفاتورة غير موجودة</div>;

  return (
    <div className="print-page-wrapper">
      <div className="print-controls hide-on-print">
        <button onClick={() => window.print()} className="print-btn">
          🖨️ طباعة الفاتورة
        </button>
        <button onClick={handleDownloadPdf} className="download-btn">
          📥 تنزيل الفاتورة
        </button>
        <ShareInvoice invoice={invoice} btnClassName="share-invoice-btn" />
        <button onClick={() => window.close()} className="close-btn">
          ❌ إغلاق المعاينة
        </button>
      </div>

      <div className="receipt-preview-container">
        {printFormat === 'A4' ? (
          <A4Receipt invoice={invoice} template={printTemplate} isPreview={true} />
        ) : (
          <ThermalReceipt invoice={invoice} template={printTemplate} isPreview={true} />
        )}
      </div>

      <style>{`
        body {
          background-color: #f0f2f5;
          margin: 0;
          padding: 0;
          font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif;
          direction: rtl;
          letter-spacing: normal !important;
        }
        .print-page-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          direction: rtl;
          text-align: right;
          letter-spacing: normal !important;
        }
        .print-controls {
          margin-bottom: 20px;
          display: flex;
          gap: 15px;
        }
        .print-btn {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 16px;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
          font-weight: bold;
          box-shadow: 0 4px 6px rgba(0,123,255,0.2);
          transition: background 0.2s;
        }
        .print-btn:hover { background-color: #0056b3; }
        .download-btn {
          background-color: #28a745;
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 16px;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
          font-weight: bold;
          box-shadow: 0 4px 6px rgba(40,167,69,0.2);
          transition: background 0.2s;
        }
        .download-btn:hover { background-color: #218838; }
        .share-invoice-btn {
          background-color: #17a2b8;
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 16px;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
          font-weight: bold;
          box-shadow: 0 4px 6px rgba(23,162,184,0.2);
          transition: background 0.2s;
        }
        .share-invoice-btn:hover { background-color: #138496; }
        .close-btn {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 16px;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
          font-weight: bold;
          box-shadow: 0 4px 6px rgba(220,53,69,0.2);
          transition: background 0.2s;
        }
        .close-btn:hover { background-color: #a71d2a; }
        .receipt-preview-container {
          background: transparent;
          padding: 0;
          border-radius: 0;
          box-shadow: none;
        }

        @media print {
          .hide-on-print {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
          .receipt-preview-container {
            box-shadow: none !important;
            padding: 0 !important;
          }
          .print-page-wrapper {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintInvoice;
