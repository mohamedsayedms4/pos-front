import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import StoreApi from '../services/storeApi';
import Api, { SERVER_URL } from '../services/api';
import JsBarcode from 'jsbarcode';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import HeroSectionManager from '../components/settings/HeroSectionManager';
import ModalContainer from '../components/common/ModalContainer';
import A4Receipt from '../components/common/A4Receipt';
import ThermalReceipt from '../components/common/ThermalReceipt';
import ChatService from '../services/ChatService';
import CommunicationApi from '../services/CommunicationApi';

import '../styles/pages/SettingsPremium.css';

// SVG Icons
const IconStore = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/><path d="M18 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/><path d="M14 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/><path d="M10 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/><path d="M6 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/></svg>
);
const IconPalette = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.63 1.86-1.54l.32-1.78a2 2 0 0 1 1.97-1.68H18c2.2 0 4-1.8 4-4 0-4.97-4.5-9-10-9z"/></svg>
);
const IconPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);
const IconCreditCard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
);
const IconLink = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);
const IconMessage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
);
const IconShieldCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
);
const IconUploadCloud = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
);
const IconImagePlus = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg>
);
const IconTrash = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);
const IconRotateCcw = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);
const IconSave = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5z"/><path d="M14 2v4a1 1 0 0 0 1 1h4"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>
);
const IconLoader = () => (
  <svg width="18" height="18" className="spin-anim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const IconChevronDown = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);
const IconGlobe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);
const IconPrinter = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
);
const IconBarcode = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>
);
const IconMaximize = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>
);
const IconTestTube = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-6"/></svg>
);
const IconFileText = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a1 1 0 0 0 1 1h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
);
const IconSliders = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></svg>
);
const IconX = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const sectionsList = [
  { id: "general", label: "المعلومات الأساسية", icon: IconStore },
  { id: "identity", label: "الهوية والشعار", icon: IconPalette },
  { id: "contact", label: "بيانات التواصل", icon: IconPhone },
  { id: "sales", label: "البيع والأسعار", icon: IconCreditCard },
  { id: "integrations", label: "الروابط والتكاملات", icon: IconLink },
  { id: "chat", label: "المحادثات", icon: IconMessage }
];

const printSections = [
  { id: "invoice-format", label: "الفاتورة", icon: IconFileText },
  { id: "print-behavior", label: "سلوك الطباعة", icon: IconSliders },
  { id: "barcode-settings", label: "ملصق الباركود", icon: IconBarcode }
];

const paperOptions = [
  { value: "80", title: "كاشير حرارية 80mm", description: "الأفضل لمعظم نقاط البيع", width: "80 مم" },
  { value: "58", title: "كاشير حرارية 58mm", description: "للطابعات الصغيرة", width: "58 مم" },
  { value: "A4", title: "فاتورة A4", description: "للفواتير التفصيلية", width: "210 مم" }
];

const templateOptions = [
  { value: "classic", title: "قياسي", description: "تفاصيل كاملة مع الباركود", icon: "▤" },
  { value: "compact", title: "مختصر", description: "يوفّر الورق ويعرض الأساسيات", icon: "▥" },
  { value: "detailed", title: "تفصيلي", description: "ضرائب وخصومات وبيانات موسعة", icon: "▦" }
];

const barcodeTemplateOptions = [
  { value: "classic", title: "قالب 1 — تقليدي", description: "تفاصيل كاملة والاسم والباركود والسعر", icon: "" },
  { value: "price-focus", title: "قالب 2 — السعر بارز", description: "تركيز وإبراز خط السعر بشكل عريض", icon: "" },
  { value: "minimal", title: "قالب 3 — مختصر", description: "تصميم بسيط وموجز يوفر المساحة", icon: "️" }
];

function TextField({ label, name, value, onChange, type = "text", placeholder = "", error, required = false, dir, full = false, hint, inputMode }) {
  return (
    <div className={`field ${full ? "field--full" : ""}`}>
      <label htmlFor={name}>{label}{required && <span className="required">*</span>}</label>
      <input
        id={name} name={name} value={value || ''} onChange={onChange} type={type} placeholder={placeholder}
        aria-invalid={Boolean(error)} className={error ? "input-error" : ""} dir={dir} inputMode={inputMode}
      />
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="select-wrap">
        <select id={name} name={name} value={value || 'EGP'} onChange={onChange}>
          {options.map((option) => (
            <option value={option.value} key={option.value}>{option.label}</option>
          ))}
        </select>
        <IconChevronDown />
      </div>
    </div>
  );
}

function SwitchRow({ checked, onChange, title, description, icon: Icon }) {
  return (
    <div className="switch-row">
      <div className="switch-copy">
        <span className="switch-icon"><Icon /></span>
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </div>
      <button type="button" role="switch" aria-checked={checked} className={`switch-btn ${checked ? "switch-btn--active" : ""}`} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </div>
  );
}

function SectionCard({ id, title, description, icon: Icon, children }) {
  return (
    <section className="settings-card" id={id}>
      <div className="card-heading">
        <span className="card-icon"><Icon /></span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}

function RadioCards({ value, onChange, options, compact = false }) {
  return (
    <div className={`radio-cards ${compact ? "radio-cards--compact" : ""}`}>
      {options.map((option) => (
        <button
          key={option.value} type="button" className={`radio-card ${value === option.value ? "active" : ""}`}
          onClick={() => onChange(option.value)} aria-pressed={value === option.value}
        >
          <span className="radio-dot">{value === option.value && <span />}</span>
          {option.icon && <span className="template-icon">{option.icon}</span>}
          <span className="radio-copy">
            <strong>{option.title}</strong>
            <small>{option.description}</small>
          </span>
          {option.width && <span className="paper-width">{option.width}</span>}
        </button>
      ))}
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, unit, hint, disabled }) {
  const update = (next) => onChange(Math.min(max, Math.max(min, Number(next) || min)));
  return (
    <div className={`field${disabled ? ' field--disabled' : ''}`}>
      <label>{label}</label>
      <div className="number-control">
        <button type="button" onClick={() => update(value - 1)} disabled={disabled}>−</button>
        <input type="number" value={value} min={min} max={max} onChange={(e) => update(e.target.value)} dir="ltr" disabled={disabled} />
        <span>{unit}</span>
        <button type="button" onClick={() => update(value + 1)} disabled={disabled}>+</button>
      </div>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

function RealBarcodeGenerator({ barcodeValue = "123456789", height = 36, width = 1.5 }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, String(barcodeValue), {
          format: "CODE128",
          width: width,
          height: height,
          displayValue: false,
          margin: 0,
          background: "#ffffff",
          lineColor: "#000000"
        });
      } catch (err) {
        console.error("JsBarcode error:", err);
      }
    }
  }, [barcodeValue, height, width]);

  return <svg ref={barcodeRef} style={{ maxWidth: '100%', height: `${height}px` }}></svg>;
}

function ReceiptPreview({ settings, storeName = "MeDo Group", full = false }) {
  const dummyInvoice = {
    id: "INV-PREVIEW-1052",
    invoiceNumber: "123456789",
    invoiceDate: new Date().toISOString(),
    status: "PAID",
    createdBy: "أحمد محمد",
    customerName: "عميل نقدي",
    tenantName: storeName,
    branchName: 'الفرع الرئيسي',
    totalAmount: 150.00,
    paidAmount: 150.00,
    remainingAmount: 0,
    discount: 10.00,
    items: [
      { id: 1, productName: 'منتج تجريبي 1', barcode: '1000123', quantity: 2, unitPrice: 50.00, unitName: 'قطعة' },
      { id: 2, productName: 'منتج تجريبي 2', barcode: '1000124', quantity: 1, unitPrice: 50.00, unitName: 'قطعة' }
    ]
  };

  const isA4 = settings.paperSize === "A4";
  const mappedTemplate = settings.invoiceTemplate === 'detailed'
    ? (isA4 ? 'modern' : 'standard')
    : settings.invoiceTemplate === 'compact'
      ? (isA4 ? 'barcode_only' : 'compact')
      : 'standard';

  return (
    <div style={{ transform: full ? 'scale(1)' : isA4 ? 'scale(0.68)' : 'scale(0.88)', transformOrigin: 'top center', margin: '0 auto' }}>
      {isA4 ? (
        <A4Receipt invoice={dummyInvoice} template={mappedTemplate === 'standard' ? 'classic' : mappedTemplate} isPreview={true} />
      ) : (
        <ThermalReceipt invoice={dummyInvoice} template={mappedTemplate} isPreview={true} />
      )}
    </div>
  );
}

function BarcodePreview({ settings, storeName = "MeDo Group" }) {
  const t = settings.barcodeTemplate || 'classic';
  const storeStr = settings.showStoreName ? storeName : null;
  const nameStr = settings.showProductName ? "سماعة بلوتوث لاسلكية" : null;
  const priceStr = settings.showPrice ? "EGP 150.00" : null;
  const skuStr = settings.showSku ? "SKU: 123456789" : null;
  const showBarcode = settings.showBarcode !== false;

  return (
    <div
      className={`barcode-label barcode-label--${t}`}
      style={{
        "--label-width": `${Math.max(165, (settings.barcodeWidth || 32) * 5.2)}px`,
        "--label-height": `${Math.max(105, (settings.barcodeHeight || 20) * 5)}px`,
        "--barcode-font-size": `${settings.barcodeFontSize || 10}px`,
        "--barcode-store-font-size": `${settings.storeNameFontSize || 8}px`,
        "--barcode-price-font-size": `${settings.priceFontSize || 13}px`,
        "--barcode-sku-font-size": `${settings.skuFontSize || 9}px`
      }}
    >
      {t === 'price-focus' ? (
        <>
          {storeStr && <div className="barcode-store-tag">{storeStr}</div>}
          {nameStr && <strong className="barcode-title">{nameStr}</strong>}
          {priceStr && <div className="barcode-price-focused">{priceStr}</div>}
          {showBarcode && <RealBarcodeGenerator barcodeValue="123456789" height={32} width={1.4} />}
          {skuStr && <small className="barcode-sku">{skuStr}</small>}
        </>
      ) : t === 'minimal' ? (
        <>
          <div className="barcode-compact-head">
            {nameStr && <strong>{nameStr}</strong>}
            {priceStr && <b>{priceStr}</b>}
          </div>
          {showBarcode && <RealBarcodeGenerator barcodeValue="123456789" height={30} width={1.3} />}
          {skuStr && <small>{skuStr}</small>}
        </>
      ) : (
        /* classic template */
        <>
          {storeStr && <div className="barcode-store-tag">{storeStr}</div>}
          {nameStr && <strong>{nameStr}</strong>}
          {showBarcode && <RealBarcodeGenerator barcodeValue="123456789" height={34} width={1.5} />}
          {skuStr && <small>{skuStr}</small>}
          {priceStr && <b className="barcode-price-classic">{priceStr}</b>}
        </>
      )}
    </div>
  );
}

function PreviewPanel({ settings, storeName, onOpenFull, onTestPrint }) {
  const [tab, setTab] = useState("invoice");

  return (
    <aside className="preview-panel">
      <div className="preview-head">
        <div>
          <span className="preview-status"><i /> معاينة مباشرة</span>
          <h2>شكل الطباعة</h2>
        </div>
        <button className="btn-seggele btn-seggele--ghost" type="button" onClick={onOpenFull} title="تكبير المعاينة">
          <IconMaximize />
        </button>
      </div>

      <div className="preview-tabs">
        <button type="button" className={tab === "invoice" ? "active" : ""} onClick={() => setTab("invoice")}>
          الفاتورة
        </button>
        <button type="button" className={tab === "barcode" ? "active" : ""} onClick={() => setTab("barcode")}>
          الباركود
        </button>
      </div>

      <div className={`preview-stage ${tab === "barcode" ? "preview-stage--barcode" : ""}`}>
        {tab === "invoice" ? (
          <ReceiptPreview settings={settings} storeName={storeName} />
        ) : (
          <BarcodePreview settings={settings} storeName={storeName} />
        )}
      </div>

      <div className="preview-actions">
        <button className="btn-seggele btn-seggele--secondary" onClick={onOpenFull}>
          <IconMaximize /> معاينة كاملة
        </button>
        <button className="btn-seggele btn-seggele--primary" onClick={onTestPrint}>
          <IconTestTube /> طباعة تجريبية
        </button>
      </div>

      <p className="preview-note">
        المعاينة تقريبية وقد تختلف الهوامش قليلًا حسب تعريف الطابعة.
      </p>
    </aside>
  );
}

function PreviewModal({ open, onClose, settings, storeName, onPrint }) {
  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-stage-box" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head-box">
          <h2><i className="fa-solid fa-eye"></i>️ معاينة الطباعة الكاملة</h2>
          <button className="btn-seggele btn-seggele--ghost" type="button" onClick={onClose}><IconX /></button>
        </header>

        <div className="modal-content-stage">
          <ReceiptPreview settings={settings} storeName={storeName} full />
        </div>

        <footer className="modal-footer-box">
          <button className="btn-seggele btn-seggele--secondary" type="button" onClick={onClose}>إغلاق</button>
          <button className="btn-seggele btn-seggele--primary" type="button" onClick={onPrint}>
            <IconPrinter /> طباعة الفاتورة
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function LogoUploader({ value, onUpload, onDelete, uploading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`logo-uploader ${dragging ? "logo-uploader--dragging" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onUpload(e.dataTransfer.files[0]); }}
    >
      <div className="logo-preview">
        {value ? <img src={value} alt="شعار المتجر" /> : (
          <div className="brand-preview"><span className="brand-mark">S</span><span>eggele</span></div>
        )}
      </div>

      <div className="upload-copy">
        <span className="upload-icon"><IconUploadCloud /></span>
        <div>
          <strong>اسحب الشعار هنا أو اختر صورة</strong>
          <p>PNG أو JPG أو SVG، بحد أقصى 2MB. سيتم تطبيق المقاسات تلقائيًا عبر النظام.</p>
          <div className="upload-actions">
            <button className="btn-seggele btn-seggele--secondary" type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <IconImagePlus />
              {uploading ? "جاري الرفع..." : value ? "استبدال الشعار" : "اختيار صورة"}
            </button>
            {value && (
              <button className="btn-seggele btn-seggele--danger-ghost" type="button" onClick={onDelete} disabled={uploading}>
                <IconTrash /> حذف
              </button>
            )}
          </div>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/jpg" hidden onChange={(e) => onUpload(e.target.files[0])} />
    </div>
  );
}

const Settings = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useGlobalUI();

    const isIdentity = location.pathname === '/settings';
    const isSmtp = location.pathname === '/settings/smtp';
    const isPrint = location.pathname === '/settings/print';
    const isBanner = location.pathname === '/settings/banner';

    const [info, setInfo] = useState({
        name: '', currency: 'EGP', logoUrl: '', phone1: '', phone2: '', address: '', email: '', whatsappNumber: '', facebookUrl: '', instagramUrl: '', tiktokUrl: '', aboutUs: '', facebookPixelId: '', facebookAdAccountId: '', facebookAccessToken: '', enableWholesale: false
    });
    const [savedInfo, setSavedInfo] = useState(null);
    const [interBranchChatEnabled, setInterBranchChatEnabled] = useState(true);
    const [savedInterBranchChat, setSavedInterBranchChat] = useState(true);

    // Print & Barcode Settings State
    const [printSettings, setPrintSettings] = useState({
        paperSize: localStorage.getItem('print_format') === 'A4' ? 'A4' : localStorage.getItem('print_format') === '58mm' ? '58' : '80',
        invoiceTemplate: localStorage.getItem('print_template') || 'classic',
        autoOpenPrintWindow: localStorage.getItem('print_auto_trigger') === 'true',
        previewBeforePrint: localStorage.getItem('pos_print_preview') !== 'false',
        autoPrintAfterSale: localStorage.getItem('auto_print_sale') === 'true',
        printCustomerCopy: localStorage.getItem('print_customer_copy') !== 'false',
        barcodeWidth: 32,
        barcodeHeight: 20,
        barcodeTemplate: localStorage.getItem('pos_barcode_template') || 'classic',
        showStoreName: localStorage.getItem('barcode_show_store_name') !== 'false',
        showProductName: localStorage.getItem('barcode_show_name') !== 'false',
        showBarcode: localStorage.getItem('barcode_show_barcode') !== 'false',
        showPrice: localStorage.getItem('barcode_show_price') !== 'false',
        showSku: localStorage.getItem('barcode_show_sku') !== 'false',
        storeNameFontSize: parseInt(localStorage.getItem('barcode_store_font_size') || '8', 10),
        barcodeFontSize: parseInt(localStorage.getItem('barcode_font_size') || '11', 10),
        priceFontSize: parseInt(localStorage.getItem('barcode_price_font_size') || '13', 10),
        skuFontSize: parseInt(localStorage.getItem('barcode_sku_font_size') || '10', 10),
        barcodeOffsetX: parseInt(localStorage.getItem('barcode_offset_x') || '0', 10)
    });
    const [savedPrintSettings, setSavedPrintSettings] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const [activeSection, setActiveSection] = useState(isPrint ? "invoice-format" : "general");
    const [previewOpen, setPreviewOpen] = useState(false);

    // Track Dirty Form State
    const dirty = useMemo(() => {
        if (isIdentity) {
            if (!savedInfo) return false;
            const infoChanged = JSON.stringify(info) !== JSON.stringify(savedInfo);
            const chatChanged = interBranchChatEnabled !== savedInterBranchChat;
            return infoChanged || chatChanged;
        } else if (isPrint) {
            if (!savedPrintSettings) return false;
            return JSON.stringify(printSettings) !== JSON.stringify(savedPrintSettings);
        }
        return false;
    }, [isIdentity, isPrint, info, savedInfo, interBranchChatEnabled, savedInterBranchChat, printSettings, savedPrintSettings]);

    // Active Section Observer for ScrollSpy
    useEffect(() => {
        const sectionsToObserve = isPrint ? printSections : sectionsList;
        const observers = sectionsToObserve.map(({ id }) => {
            const element = document.getElementById(id);
            if (!element) return null;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) setActiveSection(id);
                },
                { rootMargin: "-20% 0px -60% 0px", threshold: 0.01 }
            );

            observer.observe(element);
            return observer;
        });

        return () => observers.forEach((obs) => obs?.disconnect());
    }, [isIdentity, isPrint, loading]);

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveSection(id);
    };

    // SMTP Config
    const [smtpConfig, setSmtpConfig] = useState({
        host: '', port: 587, username: '', password: '',
        authEnabled: true, tlsEnabled: true, fromEmail: '', fromName: ''
    });
    const [savingSmtp, setSavingSmtp] = useState(false);

    useEffect(() => {
        loadInfo();
    }, []);

    const loadInfo = async () => {
        setLoading(true);
        try {
            const res = await StoreApi.getStoreInfoAdmin();
            if (res.success) {
                setInfo(res.data);
                setSavedInfo(res.data);
            }

            try {
                const chatSetting = await ChatService.getInterBranchSetting();
                setInterBranchChatEnabled(chatSetting);
                setSavedInterBranchChat(chatSetting);
            } catch (e) {
                console.warn('Could not load chat settings');
            }

            try {
                const smtpData = await CommunicationApi.getSmtpConfig();
                if (smtpData) setSmtpConfig(smtpData);
            } catch (e) {
                console.warn('Could not load SMTP config');
            }

            try {
                const bConfig = await Api.getPrinterConfig();
                if (bConfig) {
                    setPrintSettings(prev => {
                        const updated = {
                            ...prev,
                            barcodeWidth: bConfig.labelWidthMm || prev.barcodeWidth,
                            barcodeHeight: bConfig.labelHeightMm || prev.barcodeHeight
                        };
                        setSavedPrintSettings(updated);
                        return updated;
                    });
                } else {
                    setSavedPrintSettings(printSettings);
                }
            } catch (e) {
                console.warn('Could not load printer config');
                setSavedPrintSettings(printSettings);
            }
        } catch (e) {
            toast('خطأ في تحميل الإعدادات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveStoreInfo = async () => {
        if (!info.name || !info.name.trim()) {
            toast('اسم المتجر مطلوب للحفظ', 'error');
            scrollToSection('general');
            return;
        }

        setSaving(true);
        try {
            const res = await StoreApi.updateStoreInfoAdmin(info);
            try {
                await ChatService.setInterBranchSetting(interBranchChatEnabled);
                setSavedInterBranchChat(interBranchChatEnabled);
            } catch (e) {
                console.warn('Could not save chat settings');
            }

            if (res.success) {
                toast('تم حفظ الإعدادات بنجاح ', 'success');
                setToastMessage('تم حفظ الإعدادات بنجاح.');
                setTimeout(() => setToastMessage(''), 3000);
                setInfo(res.data);
                setSavedInfo(res.data);
            } else {
                toast(res.message || 'فشل الحفظ', 'error');
            }
        } catch (e) {
            toast('خطأ في الاتصال بالسيرفر', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSavePrintSettings = async () => {
        setSaving(true);
        try {
            const formatVal = printSettings.paperSize === 'A4' ? 'A4' : printSettings.paperSize === '58' ? '58mm' : '80mm';
            localStorage.setItem('print_format', formatVal);
            localStorage.setItem('print_template', printSettings.invoiceTemplate);
            localStorage.setItem('print_auto_trigger', String(printSettings.autoOpenPrintWindow));
            localStorage.setItem('pos_print_preview', String(printSettings.previewBeforePrint));
            localStorage.setItem('auto_print_sale', String(printSettings.autoPrintAfterSale));
            localStorage.setItem('print_customer_copy', String(printSettings.printCustomerCopy));
            localStorage.setItem('pos_barcode_template', printSettings.barcodeTemplate);
            localStorage.setItem('barcode_show_store_name', String(printSettings.showStoreName));
            localStorage.setItem('barcode_show_name', String(printSettings.showProductName));
            localStorage.setItem('barcode_show_barcode', String(printSettings.showBarcode));
            localStorage.setItem('barcode_show_price', String(printSettings.showPrice));
            localStorage.setItem('barcode_show_sku', String(printSettings.showSku));
            localStorage.setItem('barcode_store_font_size', String(printSettings.storeNameFontSize));
            localStorage.setItem('barcode_font_size', String(printSettings.barcodeFontSize));
            localStorage.setItem('barcode_price_font_size', String(printSettings.priceFontSize));
            localStorage.setItem('barcode_sku_font_size', String(printSettings.skuFontSize));
            localStorage.setItem('barcode_offset_x', String(printSettings.barcodeOffsetX || 0));

            await Api.updatePrinterConfig({
                labelWidthMm: printSettings.barcodeWidth,
                labelHeightMm: printSettings.barcodeHeight
            });

            setSavedPrintSettings(printSettings);
            toast('تم حفظ إعدادات الطباعة بنجاح ️', 'success');
            setToastMessage('تم حفظ إعدادات الطباعة والباركود بنجاح.');
            setTimeout(() => setToastMessage(''), 3000);
        } catch (err) {
            toast('فشل حفظ إعدادات الطباعة والباركود', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = () => {
        if (isIdentity) {
            if (savedInfo) setInfo(savedInfo);
            setInterBranchChatEnabled(savedInterBranchChat);
        } else if (isPrint) {
            if (savedPrintSettings) setPrintSettings(savedPrintSettings);
        }
        setToastMessage('تم تجاهل التعديلات.');
        setTimeout(() => setToastMessage(''), 2500);
    };

    const setPrintProp = (key, value) => {
        setPrintSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleTestPrint = () => {
        // فتح صفحة React كاملة للطباعة التجريبية — نفس منطق PrintInvoice.jsx
        // هذا هو الحل الجذري: الصفحة الجديدة تحمل كل CSS بشكل طبيعي ولا تعتمد على iframe أو popup فارغ
        window.open('/print-test?auto=true', '_blank', 'width=900,height=700,noopener');
        toast('جاري فتح نافذة الطباعة التجريبية...', 'info');
    };

    const handleLogoUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const res = await StoreApi.uploadLogo(file);
            if (res.success) {
                toast('تم تحديث الشعار بنجاح', 'success');
                setInfo(prev => ({ ...prev, logoUrl: res.data }));
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('خطأ في رفع اللوجو', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleLogoDelete = () => {
        setInfo(prev => ({ ...prev, logoUrl: '' }));
    };

    const handleSaveSmtp = async (e) => {
        e.preventDefault();
        setSavingSmtp(true);
        try {
            await CommunicationApi.saveSmtpConfig(smtpConfig);
            toast('تم حفظ إعدادات خادم البريد بنجاح', 'success');
        } catch (e) {
            toast('خطأ أثناء حفظ إعدادات البريد', 'error');
        } finally {
            setSavingSmtp(false);
        }
    };

    if (loading) return <Loader message="جاري تحميل الإعدادات..." />;

    const logoPreview = info.logoUrl ? StoreApi.getImageUrl(info.logoUrl) : '';

    return (
        <div className="page-section settings-page-wrapper" style={{ direction: 'rtl', padding: '24px' }}>
            {isIdentity && (
                <>
                    {/* Header */}
                    <div className="settings-page-header">
                        <div>
                            <span className="settings-eyebrow">إدارة المتجر</span>
                            <h1>إعدادات المتجر والهوية</h1>
                            <p>حدّث بيانات متجرك والهوية وطرق التواصل وإعدادات البيع.</p>
                        </div>

                        <div className="header-buttons">
                            <button className="btn-seggele btn-seggele--secondary" type="button" onClick={handleDiscard} disabled={!dirty || saving}>
                                <IconRotateCcw /> تجاهل
                            </button>
                            <button className="btn-seggele btn-seggele--primary" type="button" onClick={handleSaveStoreInfo} disabled={!dirty || saving}>
                                {saving ? <IconLoader /> : <IconSave />}
                                {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                            </button>
                        </div>
                    </div>

                    {/* Main Settings Grid Layout */}
                    <div className="settings-layout">
                        <aside className="settings-nav">
                            <nav>
                                {sectionsList.map(({ id, label, icon: Icon }) => (
                                    <button
                                        type="button" key={id}
                                        className={activeSection === id ? "section-link active" : "section-link"}
                                        onClick={() => scrollToSection(id)}
                                    >
                                        <Icon /><span>{label}</span>
                                        {activeSection === id && <span className="active-dot" />}
                                    </button>
                                ))}
                            </nav>

                            <div className="security-note">
                                <IconShieldCheck />
                                <div>
                                    <strong>بياناتك محمية</strong>
                                    <p>يتم حفظ التغييرات بشكل آمن وتشفير البيانات بالنظام.</p>
                                </div>
                            </div>
                        </aside>

                        <div className="settings-content">
                            <SectionCard id="general" title="المعلومات الأساسية" description="البيانات التي تظهر في الفواتير وتقارير المتجر الرسمية." icon={IconStore}>
                                <div className="form-grid">
                                    <TextField label="اسم المتجر" name="name" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} required placeholder="مثال: MeDo Group" />
                                    <SelectField label="العملة" name="currency" value={info.currency} onChange={(e) => setInfo({ ...info, currency: e.target.value })} options={[
                                        { value: "EGP", label: "جنيه مصري (EGP)" },
                                        { value: "SAR", label: "ريال سعودي (SAR)" },
                                        { value: "AED", label: "درهم إماراتي (AED)" },
                                        { value: "USD", label: "دولار أمريكي (USD)" }
                                    ]} />
                                    <TextField label="رقم الهاتف الأساسي" name="phone1" value={info.phone1} onChange={(e) => setInfo({ ...info, phone1: e.target.value })} required dir="ltr" inputMode="tel" placeholder="010 0000 0000" />
                                    <TextField label="رقم هاتف إضافي" name="phone2" value={info.phone2} onChange={(e) => setInfo({ ...info, phone2: e.target.value })} dir="ltr" inputMode="tel" placeholder="اختياري" />
                                    <TextField label="العنوان" name="address" value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} placeholder="المدينة، المنطقة، الشارع" full />
                                </div>
                            </SectionCard>

                            <SectionCard id="identity" title="الهوية والشعار" description="استخدم شعارًا واضحًا بخلفية شفافة للحصول على أفضل نتيجة بالفواتير والـ Header." icon={IconPalette}>
                                <LogoUploader value={logoPreview} onUpload={handleLogoUpload} onDelete={handleLogoDelete} uploading={uploading} />
                            </SectionCard>

                            <SectionCard id="contact" title="بيانات التواصل" description="وسائل التواصل التي تظهر للعملاء في التذييل والفواتير المطبوعة." icon={IconPhone}>
                                <div className="form-grid">
                                    <TextField label="البريد الإلكتروني" name="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} type="email" dir="ltr" placeholder="hello@example.com" />
                                    <TextField label="رقم واتساب" name="whatsappNumber" value={info.whatsappNumber} onChange={(e) => setInfo({ ...info, whatsappNumber: e.target.value })} dir="ltr" inputMode="tel" placeholder="+20 100 000 0000" />
                                </div>
                            </SectionCard>

                            <SectionCard id="sales" title="البيع والأسعار" description="تحكم في خيارات سياسة الأسعار والبيع لفريق الكاشير والمبيعات." icon={IconCreditCard}>
                                <SwitchRow checked={Boolean(info.enableWholesale)} onChange={(checked) => setInfo({ ...info, enableWholesale: checked })} title="تفعيل البيع بأسعار الجملة" description="إتاحة سعر جملة منفصل للمنتجات في شاشات المبيعات والمستخدمين المصرح لهم." icon={IconCreditCard} />
                            </SectionCard>

                            <SectionCard id="integrations" title="الروابط والتكاملات" description="روابط الصفحات الخارجية وحسابات وسائل التواصل الاجتماعي." icon={IconLink}>
                                <div className="form-grid">
                                    <TextField label="رابط فيسبوك" name="facebookUrl" value={info.facebookUrl} onChange={(e) => setInfo({ ...info, facebookUrl: e.target.value })} dir="ltr" placeholder="https://facebook.com/..." />
                                    <TextField label="رابط إنستجرام" name="instagramUrl" value={info.instagramUrl} onChange={(e) => setInfo({ ...info, instagramUrl: e.target.value })} dir="ltr" placeholder="https://instagram.com/..." />
                                    <TextField label="رابط تيك توك" name="tiktokUrl" value={info.tiktokUrl} onChange={(e) => setInfo({ ...info, tiktokUrl: e.target.value })} dir="ltr" placeholder="https://tiktok.com/@..." full />
                                </div>
                                <div className="integration-tip"><IconGlobe /><span>يتم التحقق من الروابط وإظهارها للعملاء في منصات البيع.</span></div>
                            </SectionCard>

                            <SectionCard id="chat" title="المحادثات" description="تحديد نطاق مراسلة وتواصل الموظفين داخل شاشة المحادثات الداخلية." icon={IconMessage}>
                                <SwitchRow checked={interBranchChatEnabled} onChange={(checked) => setInterBranchChatEnabled(checked)} title="السماح بالمحادثة بين الفروع" description="عند الإيقاف، يتمكن الموظفون من مراسلة زملائهم في نفس الفرع فقط. (المدراء مستثنون دائماً)." icon={IconMessage} />
                            </SectionCard>
                        </div>
                    </div>
                </>
            )}

            {/* Print & Templates Sub-Page */}
            {isPrint && (
                <>
                    {/* Header */}
                    <div className="settings-page-header">
                        <div>
                            <span className="settings-eyebrow">إعدادات الجهاز الحالي</span>
                            <h1>الطباعة وقوالب الفواتير</h1>
                            <p>اضبط شكل الفاتورة وسلوك الطباعة وملصقات الباركود من مكان واحد.</p>
                        </div>

                        <div className="header-buttons">
                            <button className="btn-seggele btn-seggele--secondary" type="button" onClick={handleDiscard} disabled={!dirty || saving}>
                                <IconRotateCcw /> تجاهل
                            </button>
                            <button className="btn-seggele btn-seggele--primary" type="button" onClick={handleSavePrintSettings} disabled={!dirty || saving}>
                                {saving ? <IconLoader /> : <IconSave />}
                                {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                            </button>
                        </div>
                    </div>



                    {/* Print Workspace Grid */}
                    <div className="settings-layout workspace-print">
                        <div className="settings-content">
                            {/* Card 1: Format */}
                            <SectionCard id="invoice-format" title="تنسيق الفاتورة" description="اختر حجم الورق والقالب المناسب لطبيعة نشاطك." icon={IconFileText}>
                                <div className="subsection">
                                    <div className="subsection-head">
                                        <div><h3>حجم الورق</h3><p>تأكد من مطابقة الحجم لتعريف الطابعة.</p></div>
                                    </div>
                                    <RadioCards value={printSettings.paperSize} onChange={(val) => setPrintProp("paperSize", val)} options={paperOptions} />
                                </div>

                                <div className="divider" />

                                <div className="subsection">
                                    <div className="subsection-head">
                                        <div><h3>قالب تصميم الفاتورة</h3><p>يمكن تغيير القالب دون التأثير على البيانات.</p></div>
                                    </div>
                                    <RadioCards value={printSettings.invoiceTemplate} onChange={(val) => setPrintProp("invoiceTemplate", val)} options={templateOptions} compact />
                                </div>
                            </SectionCard>

                            {/* Card 2: Behavior */}
                            <SectionCard id="print-behavior" title="سلوك الطباعة" description="حدد ما يحدث بعد إنشاء أو فتح الفاتورة." icon={IconSliders}>
                                <div className="switch-list">
                                    <SwitchRow checked={printSettings.previewBeforePrint} onChange={(val) => setPrintProp("previewBeforePrint", val)} title="معاينة الفاتورة قبل الطباعة" description="عرض الفاتورة للتأكد منها قبل إرسالها إلى الطابعة." icon={IconMaximize} />
                                    <SwitchRow checked={printSettings.autoOpenPrintWindow} onChange={(val) => setPrintProp("autoOpenPrintWindow", val)} title="فتح نافذة الطباعة تلقائيًا" description="فتح مربع حوار الطباعة فور فتح الفاتورة." icon={IconPrinter} />

                                </div>
                            </SectionCard>

                            {/* Card 3: Barcode Settings */}
                            <SectionCard id="barcode-settings" title="إعدادات ملصق الباركود" description="اضبط المقاس والمعلومات التي ستظهر على الملصق." icon={IconBarcode}>
                                <div className="dimensions">
                                    <NumberInput label="العرض" value={printSettings.barcodeWidth} onChange={(val) => setPrintProp("barcodeWidth", val)} min={20} max={100} unit="مم" hint="20–100 مم" />
                                    <NumberInput label="الطول" value={printSettings.barcodeHeight} onChange={(val) => setPrintProp("barcodeHeight", val)} min={15} max={80} unit="مم" hint="15–80 مم" />
                                    <NumberInput label="معايرة أفقية" value={printSettings.barcodeOffsetX} onChange={(val) => setPrintProp("barcodeOffsetX", val)} min={-10} max={10} unit="مم" hint="لو الملصق بيطبع منزاح لليمين أو الشمال، عدّل هنا" />
                                </div>

                                <div className="divider" />

                                <div className="subsection">
                                    <div className="subsection-head">
                                        <div><h3>قالب الملصق</h3><p>ترتيب المعلومات داخل ملصق الباركود.</p></div>
                                    </div>
                                    <RadioCards
                                        value={printSettings.barcodeTemplate}
                                        onChange={(val) => setPrintProp("barcodeTemplate", val)}
                                        options={barcodeTemplateOptions}
                                        compact
                                    />
                                </div>

                                <div className="divider" />

                                <div className="subsection">
                                    <div className="subsection-head">
                                        <div><h3>عناصر الملصق</h3><p>تحكم كامل: أظهر أو أخفِ كل عنصر، واضبط حجم خطه بشكل مستقل.</p></div>
                                    </div>
                                    <div className="label-options">
                                        <label>
                                            <input type="checkbox" checked={printSettings.showStoreName} onChange={(e) => setPrintProp("showStoreName", e.target.checked)} />
                                            <span><b>اسم المتجر</b><small>إظهار اسم المتجر أعلى الملصق</small></span>
                                        </label>
                                        <label>
                                            <input type="checkbox" checked={printSettings.showProductName} onChange={(e) => setPrintProp("showProductName", e.target.checked)} />
                                            <span><b>اسم المنتج</b><small>إظهار اسم الصنف أعلى الباركود</small></span>
                                        </label>
                                        <label>
                                            <input type="checkbox" checked={printSettings.showBarcode} onChange={(e) => setPrintProp("showBarcode", e.target.checked)} />
                                            <span><b>الباركود</b><small>إظهار رمز الباركود نفسه</small></span>
                                        </label>
                                        <label>
                                            <input type="checkbox" checked={printSettings.showPrice} onChange={(e) => setPrintProp("showPrice", e.target.checked)} />
                                            <span><b>السعر</b><small>طباعة سعر البيع على الملصق</small></span>
                                        </label>
                                        <label>
                                            <input type="checkbox" checked={printSettings.showSku} onChange={(e) => setPrintProp("showSku", e.target.checked)} />
                                            <span><b>كود الصنف</b><small>إظهار SKU أسفل الباركود</small></span>
                                        </label>
                                    </div>
                                </div>

                                <div className="divider" />

                                <div className="subsection">
                                    <div className="subsection-head">
                                        <div><h3>أحجام الخطوط</h3><p>حجم كل عنصر مستقل تمامًا عن الباقي.</p></div>
                                    </div>
                                    <div className="dimensions">
                                        <NumberInput label="حجم اسم المتجر" value={printSettings.storeNameFontSize} onChange={(val) => setPrintProp("storeNameFontSize", val)} min={6} max={24} unit="px" hint="6–24 بكسل" disabled={!printSettings.showStoreName} />
                                        <NumberInput label="حجم اسم المنتج" value={printSettings.barcodeFontSize} onChange={(val) => setPrintProp("barcodeFontSize", val)} min={6} max={30} unit="px" hint="6–30 بكسل" disabled={!printSettings.showProductName} />
                                        <NumberInput label="حجم السعر" value={printSettings.priceFontSize} onChange={(val) => setPrintProp("priceFontSize", val)} min={6} max={30} unit="px" hint="6–30 بكسل" disabled={!printSettings.showPrice} />
                                        <NumberInput label="حجم كود الصنف" value={printSettings.skuFontSize} onChange={(val) => setPrintProp("skuFontSize", val)} min={6} max={24} unit="px" hint="6–24 بكسل" disabled={!printSettings.showSku} />
                                    </div>
                                </div>
                            </SectionCard>
                        </div>

                        {/* Interactive Right Live Preview Panel */}
                        <PreviewPanel
                            settings={printSettings}
                            storeName={info.name || "MeDo Group"}
                            onOpenFull={() => setPreviewOpen(true)}
                            onTestPrint={handleTestPrint}
                        />
                    </div>
                </>
            )}

            {/* SMTP Settings Sub-Page */}
            {isSmtp && (
                <div className="settings-card" style={{ marginBottom: '20px' }}>
                    <div className="card-heading">
                        <span className="card-icon"><IconPhone /></span>
                        <div>
                            <h2><i className="fa-solid fa-envelope-open-text"></i> إعدادات خادم البريد (SMTP)</h2>
                            <p>تكوين إعدادات إرسال البريد الإلكتروني والإشعارات.</p>
                        </div>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSaveSmtp}>
                            <div className="form-grid">
                                <TextField label="الخادم (Host)" name="host" value={smtpConfig.host} onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })} placeholder="smtp.gmail.com" required />
                                <TextField label="المنفذ (Port)" name="port" value={smtpConfig.port} onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) })} placeholder="587" required type="number" />
                                <TextField label="اسم المستخدم (Email)" name="username" value={smtpConfig.username} onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })} placeholder="example@gmail.com" required />
                                <TextField label="كلمة المرور (App Password)" name="password" value={smtpConfig.password} onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })} placeholder="••••••••" type="password" />
                                <TextField label="إيميل المرسل (From Email)" name="fromEmail" value={smtpConfig.fromEmail} onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })} placeholder="info@mystore.com" />
                                <TextField label="اسم المرسل (From Name)" name="fromName" value={smtpConfig.fromName} onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })} placeholder="اسم المتجر" />
                            </div>
                            <div style={{ marginTop: '20px' }}>
                                <button className="btn-seggele btn-seggele--primary" type="submit" disabled={savingSmtp}>
                                    {savingSmtp ? <IconLoader /> : <IconSave />}
                                    {savingSmtp ? 'جاري الحفظ...' : 'حفظ إعدادات البريد'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Banner Section */}
            {isBanner && (
                <div className="settings-card">
                    <div className="card-heading">
                        <span className="card-icon"><IconPalette /></span>
                        <div>
                            <h2><i className="fa-solid fa-image"></i>️ الـ Banner الإعلاني (Hero Sections)</h2>
                            <p>إدارة لافتات واجهة المتجر والصور الترويجية.</p>
                        </div>
                    </div>
                    <div className="card-body">
                        <HeroSectionManager />
                    </div>
                </div>
            )}

            {/* Floating Unsaved Action Bar */}
            {dirty && (
                <div className="unsaved-bar" role="status">
                    <div className="unsaved-copy">
                        <span className="unsaved-indicator" />
                        <div>
                            <strong>لديك تغييرات غير محفوظة</strong>
                            <p>احفظ الإعدادات قبل مغادرة الصفحة لتطبيقها على النظام.</p>
                        </div>
                    </div>
                    <div className="unsaved-actions">
                        <button className="btn-seggele btn-seggele--ghost" type="button" onClick={handleDiscard} disabled={saving}>
                            تجاهل
                        </button>
                        <button className="btn-seggele btn-seggele--primary" type="button" onClick={isIdentity ? handleSaveStoreInfo : handleSavePrintSettings} disabled={saving}>
                            {saving ? <IconLoader /> : <IconSave />}
                            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                        </button>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className="toast-popup" role="alert">
                    <span className="toast-popup-icon"><IconCheck /></span>
                    {toastMessage}
                </div>
            )}

            {/* Full Receipt Modal */}
            <PreviewModal
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                settings={printSettings}
                storeName={info.name || "MeDo Group"}
                onPrint={handleTestPrint}
            />
        </div>
    );
};

export default Settings;
