import React, { useState, useEffect } from 'react';
import Api from '../../services/api';

const ShareInvoice = ({ invoice, btnClassName = 'btn-ghost' }) => {
  const [tenantName, setTenantName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customPhone, setCustomPhone] = useState('');

  useEffect(() => {
    Api.getCurrentTenantDetails()
      .then(res => {
        if (res && res.name) {
          setTenantName(res.name);
        }
      })
      .catch(err => console.warn('Error fetching tenant details:', err));
  }, []);

  // Pre-fill phone if available in the invoice object
  useEffect(() => {
    if (invoice) {
      const phone = invoice.customerPhone || invoice.phone || '';
      setCustomPhone(phone);
    }
  }, [invoice]);

  if (!invoice) return null;

  const getCleanPhone = (phoneStr) => {
    if (!phoneStr) return '';
    let cleaned = phoneStr.replace(/\D/g, ''); // keep only numbers
    if (cleaned.startsWith('01') && cleaned.length === 11) {
      cleaned = '2' + cleaned; // prepending Egypt country code
    }
    return cleaned;
  };

  const getFormattedMessage = (isWhatsAppFormat = false) => {
    const storeName = tenantName || invoice.branchName || 'المتجر';
    const invoiceNum = invoice.invoiceNumber || invoice.id;
    
    // Formatting date
    let dateFormatted = '';
    if (invoice.invoiceDate) {
      try {
        dateFormatted = new Date(invoice.invoiceDate).toLocaleDateString('ar-EG', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      } catch {
        dateFormatted = invoice.invoiceDate;
      }
    }

    const customerName = invoice.customerName || 'عميل نقدي';
    const items = invoice.items || [];
    
    let itemsText = '';
    items.forEach(item => {
      const pName = item.productName || item.name || '';
      const qty = item.quantity || 0;
      const total = Number(item.totalPrice || (item.unitPrice * qty)).toFixed(2);
      itemsText += `\n- ${pName} (عدد: ${qty}) : ${total} ج.م`;
    });

    const bold = (txt) => isWhatsAppFormat ? `*${txt}*` : txt;

    let text = `📄 ${bold('فاتورة مبيعات')}
${bold('المتجر:')} ${storeName}
${bold('رقم الفاتورة:')} ${invoiceNum}
${bold('التاريخ:')} ${dateFormatted}
${bold('العميل:')} ${customerName}
${itemsText ? `\n${bold('المنتجات:')}${itemsText}\n` : ''}
${bold('الإجمالي:')} ${Number(invoice.totalAmount).toFixed(2)} ج.م`;

    if (invoice.remainingAmount && Number(invoice.remainingAmount) > 0) {
      text += `\n${bold('المتبقي (مديونية):')} ${Number(invoice.remainingAmount).toFixed(2)} ج.م`;
    }

    text += `\n\nشكراً لتعاملكم معنا! ❤️`;
    return text;
  };

  const handleCopy = () => {
    const text = getFormattedMessage(false);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(getFormattedMessage(true));
    const cleanPhone = getCleanPhone(customPhone);
    let url = '';
    if (cleanPhone) {
      url = `https://wa.me/${cleanPhone}?text=${text}`;
    } else {
      url = `https://wa.me/?text=${text}`;
    }
    window.open(url, '_blank');
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(getFormattedMessage(false));
    const url = `https://t.me/share/url?url=&text=${text}`;
    window.open(url, '_blank');
  };

  const handleMessengerShare = () => {
    // Messenger sharing defaults to copying the summary text and opening Messenger
    handleCopy();
    const url = `https://m.me/`;
    window.open(url, '_blank');
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `فاتورة رقم ${invoice.invoiceNumber || invoice.id}`,
        text: getFormattedMessage(false),
      }).catch(err => console.warn('Native share failed:', err));
    }
  };

  const isShareApiSupported = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="share-invoice-container" style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        type="button" 
        className={`btn ${btnClassName} share-trigger-btn`} 
        onClick={() => setShowDropdown(!showDropdown)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <span>📤</span> مشاركة الفاتورة
      </button>

      {showDropdown && (
        <>
          <div className="share-overlay-backdrop" onClick={() => setShowDropdown(false)}></div>
          <div className="share-dropdown-menu" dir="rtl">
            <div className="share-header-title">أختر منصة المشاركة</div>
            
            {/* Phone input for direct WhatsApp */}
            <div className="share-phone-field">
              <label>رقم هاتف العميل (لواتساب):</label>
              <input 
                type="text" 
                placeholder="مثال: 01012345678" 
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="share-phone-input"
              />
            </div>

            <div className="share-options-list">
              <button onClick={handleWhatsAppShare} className="share-opt-btn wa-btn">
                <svg viewBox="0 0 24 24" className="share-icon-svg" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                واتساب (WhatsApp)
              </button>

              <button onClick={handleTelegramShare} className="share-opt-btn tg-btn">
                <svg viewBox="0 0 24 24" className="share-icon-svg" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.62.15-.15 2.7-2.48 2.75-2.7.01-.03.01-.14-.06-.2-.07-.06-.17-.04-.25-.02-.11.02-1.9 1.2-5.36 3.53-.51.35-.97.52-1.37.51-.44-.01-1.28-.25-1.91-.45-.77-.25-1.38-.39-1.33-.82.03-.22.33-.45.92-.69 3.58-1.55 5.97-2.58 7.18-3.07 3.42-1.4 4.13-1.64 4.6-1.65.1 0 .33.03.48.15.12.1.16.24.18.34.02.12.02.24.01.37z"/>
                </svg>
                تليجرام (Telegram)
              </button>

              <button onClick={handleMessengerShare} className="share-opt-btn msgr-btn">
                <svg viewBox="0 0 24 24" className="share-icon-svg" fill="currentColor">
                  <path d="M12 2C6.36 2 2 6.13 2 11.5c0 2.9 1.22 5.5 3.2 7.27V22l3.07-1.69c1.17.32 2.4.5 3.73.5 5.64 0 10-4.13 10-9.5S17.64 2 12 2zm1.2 12.35l-2.4-2.55-4.7 2.55 5.17-5.5 2.43 2.55 4.67-2.55-5.17 5.5z"/>
                </svg>
                ماسينجر (Messenger)
              </button>

              <button onClick={handleCopy} className={`share-opt-btn copy-btn ${copied ? 'copied-success' : ''}`}>
                <svg viewBox="0 0 24 24" className="share-icon-svg" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                {copied ? 'تم نسخ النص! ✓' : 'نسخ نص الفاتورة'}
              </button>

              {isShareApiSupported && (
                <button onClick={handleNativeShare} className="share-opt-btn native-btn">
                  <svg viewBox="0 0 24 24" className="share-icon-svg" fill="currentColor">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                  </svg>
                  مشاركة عبر تطبيقات الهاتف
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .share-overlay-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.2);
          z-index: 1000;
        }
        
        .share-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 280px;
          background: var(--bg-tile, #1d1d1d);
          border: 1px solid var(--border-input, #333);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
          z-index: 1001;
          display: flex;
          flex-direction: column;
          padding: 12px;
          animation: metroSlideUp 0.15s ease-out;
        }

        .share-header-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-muted, #888);
          margin-bottom: 12px;
          border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.05));
          padding-bottom: 6px;
        }

        .share-phone-field {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .share-phone-field label {
          font-size: 0.75rem;
          color: var(--text-light, #ccc);
        }

        .share-phone-input {
          background: var(--bg-input, #0d0d0d);
          border: 1px solid var(--border-input, #333);
          color: var(--text-white, #fff);
          padding: 6px 10px;
          font-size: 0.85rem;
          outline: none;
        }

        .share-phone-input:focus {
          border-color: var(--metro-blue, #0078D7);
        }

        .share-options-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .share-opt-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border: 1px solid transparent;
          color: #fff;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          text-align: right;
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
        }

        .share-opt-btn:hover {
          filter: brightness(1.1);
          transform: translateX(-2px);
          background: rgba(255, 255, 255, 0.08);
        }

        .share-icon-svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .wa-btn {
          border-left: 3px solid #25D366;
        }
        .wa-btn:hover {
          background: rgba(37, 211, 102, 0.1);
        }

        .tg-btn {
          border-left: 3px solid #0088cc;
        }
        .tg-btn:hover {
          background: rgba(0, 136, 204, 0.1);
        }

        .msgr-btn {
          border-left: 3px solid #0084FF;
        }
        .msgr-btn:hover {
          background: rgba(0, 132, 255, 0.1);
        }

        .copy-btn {
          border-left: 3px solid #647687;
        }
        .copy-btn:hover {
          background: rgba(100, 118, 135, 0.1);
        }
        .copied-success {
          border-left-color: #107C10 !important;
          background: rgba(16, 124, 16, 0.15) !important;
          color: #25D366;
        }

        .native-btn {
          border-left: 3px solid #AA00FF;
        }
        .native-btn:hover {
          background: rgba(170, 0, 255, 0.1);
        }

        @keyframes metroSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ShareInvoice;
