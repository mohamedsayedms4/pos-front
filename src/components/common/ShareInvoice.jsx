import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import html2pdf from 'html2pdf.js';

const ShareInvoice = ({ invoice, btnClassName = 'btn-ghost' }) => {
  const [tenantName, setTenantName] = useState('');
  const [shareStatus, setShareStatus] = useState('idle'); // 'idle' | 'generating'

  useEffect(() => {
    Api.getCurrentTenantDetails()
      .then(res => {
        if (res && res.name) {
          setTenantName(res.name);
        }
      })
      .catch(err => console.warn('Error fetching tenant details:', err));
  }, []);

  if (!invoice) return null;

  const printFormat = localStorage.getItem('print_format') || '80mm';

  const generatePdfBlob = () => {
    return new Promise((resolve, reject) => {
      const element = document.getElementById('printable-receipt');
      if (!element) return reject(new Error('Receipt element not found'));

      const opt = {
        margin: 0,
        filename: `invoice_${invoice.invoiceNumber || invoice.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: printFormat === 'A4'
          ? { unit: 'mm', format: 'a4', orientation: 'portrait' }
          : { unit: 'mm', format: [80, 200], orientation: 'portrait' }
      };

      document.fonts.ready.then(() => {
        html2pdf().from(element).set(opt).outputPdf('blob').then(blob => {
          resolve(blob);
        }).catch(reject);
      }).catch(() => {
        html2pdf().from(element).set(opt).outputPdf('blob').then(blob => {
          resolve(blob);
        }).catch(reject);
      });
    });
  };

  const handleShareAsPdf = async () => {
    if (shareStatus === 'generating') return;
    setShareStatus('generating');
    try {
      const blob = await generatePdfBlob();
      const fileName = `invoice_${invoice.invoiceNumber || invoice.id}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `فاتورة رقم ${invoice.invoiceNumber || invoice.id}`,
          text: `فاتورة من ${tenantName || 'المتجر'}`,
          files: [file],
        });
      } else {
        // Fallback for desktop/unsupported browsers: download the PDF directly
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('PDF share failed, falling back to download:', err);
        // Fallback in case of sharing errors on mobile
        try {
          const blob = await generatePdfBlob();
          const fileName = `invoice_${invoice.invoiceNumber || invoice.id}.pdf`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error('Fallback download failed:', e);
        }
      }
    } finally {
      setShareStatus('idle');
    }
  };

  return (
    <div className="share-invoice-container" style={{ display: 'inline-block' }}>
      <button 
        type="button" 
        className={`btn ${btnClassName} share-trigger-btn ${shareStatus === 'generating' ? 'generating' : ''}`} 
        onClick={handleShareAsPdf}
        disabled={shareStatus === 'generating'}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
      >
        <span><i className="fa-solid fa-upload"></i></span>
        {shareStatus === 'generating' ? 'جاري التجهيز...' : 'مشاركة الفاتورة (PDF)'}
      </button>

      <style>{`
        .share-trigger-btn.generating {
          opacity: 0.7;
          cursor: wait;
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ShareInvoice;
