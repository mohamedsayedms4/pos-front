import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Api, { SERVER_URL } from '../services/api';
import logoLoginDark from '../assets/img/logo-login-dark.png';
import { initPixel, trackCompleteRegistration } from '../services/fbPixel';

// Simple SVG Icons to replace MUI
const Icons = {
  Business: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="10" width="20" height="12" rx="2" /><path d="M6 10V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6" /></svg>,
  Email: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><rect width="20" height="14" x="2" y="5" rx="2" /></svg>,
  Phone: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  Language: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" x2="22" y1="12" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  Lock: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  CheckCircle: (props) => <svg {...props} width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--metro-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  ArrowForward: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  RocketLaunch: (props) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3" /><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5" /></svg>,
  AlertCircle: (props) => <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  XCircle: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  WifiOff: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
};

// ─── Client-Side Validation ───────────────────────────────────────────────────
const validateForm = (formData) => {
  const errors = {};

  // Validate businessName
  const businessName = (formData.businessName || '').trim();
  if (!businessName) {
    errors.businessName = 'الاسم التجاري مطلوب';
  } else if (businessName.length < 2) {
    errors.businessName = 'الاسم التجاري لا يقل عن حرفين';
  } else if (businessName.length > 100) {
    errors.businessName = 'الاسم التجاري لا يتجاوز 100 حرف';
  }

  // Validate adminEmail
  const adminEmail = (formData.adminEmail || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!adminEmail) {
    errors.adminEmail = 'البريد الإلكتروني مطلوب';
  } else if (!emailRegex.test(adminEmail)) {
    errors.adminEmail = 'صيغة البريد الإلكتروني غير صحيحة';
  }

  // Validate phone
  const phone = (formData.phone || '').trim();
  const phoneDigits = phone.replace(/[\s\-\+]/g, '');
  if (!phone) {
    errors.phone = 'رقم الجوال مطلوب';
  } else if (!/^\+?[\d\s\-]+$/.test(phone)) {
    errors.phone = 'رقم الجوال يجب أن يحتوي أرقاماً فقط';
  } else if (phoneDigits.length < 10) {
    errors.phone = 'رقم الجوال يجب أن يكون 10 أرقام على الأقل';
  } else if (phoneDigits.length > 15) {
    errors.phone = 'رقم الجوال لا يتجاوز 15 رقماً';
  }

  // Validate slug
  const slug = (formData.slug || '').trim();
  if (!slug) {
    errors.slug = 'رابط الدخول مطلوب';
  } else if (slug.length < 3) {
    errors.slug = 'رابط الدخول لا يقل عن 3 أحرف';
  } else if (slug.length > 50) {
    errors.slug = 'رابط الدخول لا يتجاوز 50 حرفاً';
  } else if (slug.startsWith('-') || slug.endsWith('-')) {
    errors.slug = 'الرابط لا يمكن أن يبدأ أو ينتهي بـ "-"';
  } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]$/.test(slug)) {
    errors.slug = 'الرابط يجب أن يحتوي أحرفاً إنجليزية صغيرة وأرقاماً وشرطة "-" فقط';
  }

  // Validate password
  const password = formData.password || '';
  if (!password) {
    errors.password = 'كلمة السر مطلوبة';
  } else if (password.length < 6) {
    errors.password = 'كلمة السر لا تقل عن 6 أحرف';
  } else if (password.length > 128) {
    errors.password = 'كلمة السر لا تتجاوز 128 حرفاً';
  }

  return errors;
};

// ─── Server Error Parser ──────────────────────────────────────────────────────
/**
 * يحول HTTP error إلى رسالة عربية واضحة للمستخدم.
 * يدعم كلاً من axios errors وfetch errors.
 * يغطي: email/phone/slug/businessName duplicates, field-level errors map,
 * network errors, timeout, 400/409/422/429/500/503.
 */

/**
 * يترجم رسالة خطأ حقل واحد من الإنجليزية/التقنية إلى عربية مفهومة.
 */
const translateFieldError = (fieldKey, rawMessage) => {
  const raw = (rawMessage || '').toLowerCase();
  const key = fieldKey.toLowerCase();

  // Email
  if (key.includes('email')) {
    if (raw.includes('exist') || raw.includes('taken') || raw.includes('already') || raw.includes('duplicate')) return 'هذا البريد الإلكتروني مسجّل مسبقاً';
    if (raw.includes('invalid') || raw.includes('format')) return 'صيغة البريد الإلكتروني غير صحيحة';
    if (raw.includes('required') || raw.includes('blank') || raw.includes('empty')) return 'البريد الإلكتروني مطلوب';
    return rawMessage;
  }
  // Phone
  if (key.includes('phone') || key.includes('mobile')) {
    if (raw.includes('exist') || raw.includes('taken') || raw.includes('already') || raw.includes('duplicate')) return 'رقم الجوال هذا مسجّل مسبقاً';
    if (raw.includes('invalid') || raw.includes('format')) return 'صيغة رقم الجوال غير صحيحة';
    if (raw.includes('required') || raw.includes('blank') || raw.includes('empty')) return 'رقم الجوال مطلوب';
    return rawMessage;
  }
  // Slug
  if (key.includes('slug')) {
    if (raw.includes('exist') || raw.includes('taken') || raw.includes('already') || raw.includes('duplicate')) return 'هذا الرابط محجوز مسبقاً';
    if (raw.includes('invalid') || raw.includes('format')) return 'صيغة الرابط غير صحيحة';
    if (raw.includes('required') || raw.includes('blank') || raw.includes('empty')) return 'رابط الدخول مطلوب';
    return rawMessage;
  }
  // Business name
  if (key.includes('name') || key.includes('business')) {
    if (raw.includes('exist') || raw.includes('taken') || raw.includes('already') || raw.includes('duplicate')) return 'هذا الاسم التجاري مسجّل مسبقاً';
    if (raw.includes('required') || raw.includes('blank') || raw.includes('empty')) return 'الاسم التجاري مطلوب';
    return rawMessage;
  }
  // Password
  if (key.includes('password')) {
    if (raw.includes('short') || raw.includes('length') || raw.includes('min')) return 'كلمة السر قصيرة جداً';
    if (raw.includes('required') || raw.includes('blank') || raw.includes('empty')) return 'كلمة السر مطلوبة';
    return rawMessage;
  }
  return rawMessage;
};

const parseServerError = (err, step = 'register') => {
  // ─── Network / No Internet ───
  if (
    err.message === 'Failed to fetch' ||
    err.message === 'لا يمكن الاتصال بالسيرفر' ||
    err.code === 'ERR_NETWORK' ||
    err.code === 'ECONNABORTED'
  ) {
    return { type: 'network', message: 'لا يوجد اتصال بالإنترنت، تحقق من اتصالك وأعد المحاولة' };
  }

  // ─── Timeout ───
  if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
    return { type: 'network', message: 'انتهت مدة الانتظار، يرجى المحاولة مرة أخرى' };
  }

  // ─── Auto-login step ───
  if (step === 'login') {
    return {
      type: 'warning',
      message: 'تم إنشاء حسابك بنجاح 🎉، لكن تعذّر تسجيل الدخول التلقائي. يرجى تسجيل الدخول يدوياً.',
      redirectToLogin: true,
    };
  }

  // ─── Resolve step ───
  if (step === 'resolve') {
    const s = err.status || err.response?.status;
    if (s === 404) return { type: 'error', message: 'تعذّر العثور على الحساب بعد التسجيل. يرجى التواصل مع الدعم الفني.' };
    return { type: 'error', message: 'تم إنشاء الحساب لكن حدث خطأ في التحقق. يرجى تسجيل الدخول يدوياً.', redirectToLogin: true };
  }

  // ─── Registration step ───
  const status     = err.status || err.response?.status;
  const bodyData   = err.response?.data;
  const serverMsg  = bodyData?.message || (typeof bodyData === 'string' ? bodyData : '') || err.message || '';
  const msgLower   = serverMsg.toLowerCase();
  const errorCode  = (bodyData?.errorCode || bodyData?.code || err.errorCode || '').toUpperCase();

  // Helper
  const mentions = (...words) => words.some(w => msgLower.includes(w));

  // ── A. Structured field-errors map from server: { errors: { email: '...', phone: '...' } } ──
  const fieldErrorsMap = bodyData?.errors || err.errors;
  if (fieldErrorsMap && typeof fieldErrorsMap === 'object' && !Array.isArray(fieldErrorsMap)) {
    // Map server field names → local form field names
    const FIELD_MAP = {
      email: 'adminEmail', adminEmail: 'adminEmail',
      phone: 'phone',      phoneNumber: 'phone',
      slug: 'slug',        tenantSlug: 'slug',
      businessName: 'businessName', name: 'businessName', tenantName: 'businessName',
      password: 'password',
    };
    const translated = {};
    for (const [serverField, serverValue] of Object.entries(fieldErrorsMap)) {
      const localField = FIELD_MAP[serverField] || serverField;
      translated[localField] = translateFieldError(serverField, serverValue);
    }
    if (Object.keys(translated).length > 0) return { type: 'fieldErrors', fieldErrors: translated };
  }

  // ── B. Duplicate detection — errorCode takes priority, then message keywords ──

  // EMAIL duplicate
  if (
    ['DUPLICATE_EMAIL', 'EMAIL_ALREADY_EXISTS', 'EMAIL_TAKEN', 'EMAIL_EXISTS'].includes(errorCode) ||
    (mentions('email', 'بريد') && mentions('exist', 'taken', 'already', 'duplicate', 'registered', 'مسجل', 'مستخدم', 'موجود'))
  ) {
    return { type: 'error', field: 'adminEmail', message: 'هذا البريد الإلكتروني مسجّل مسبقاً — يمكنك تسجيل الدخول مباشرةً' };
  }

  // PHONE duplicate
  if (
    ['DUPLICATE_PHONE', 'PHONE_ALREADY_EXISTS', 'PHONE_TAKEN', 'PHONE_EXISTS'].includes(errorCode) ||
    (mentions('phone', 'جوال', 'رقم', 'هاتف', 'mobile') && mentions('exist', 'taken', 'already', 'duplicate', 'registered', 'مسجل', 'مستخدم', 'موجود'))
  ) {
    return { type: 'error', field: 'phone', message: 'رقم الجوال هذا مسجّل مسبقاً — استخدم رقماً آخر أو سجّل الدخول' };
  }

  // SLUG duplicate
  if (
    ['DUPLICATE_SLUG', 'SLUG_ALREADY_EXISTS', 'SLUG_TAKEN', 'SLUG_EXISTS'].includes(errorCode) ||
    (mentions('slug', 'رابط', 'subdomain') && mentions('exist', 'taken', 'already', 'duplicate', 'مسجل', 'مستخدم', 'موجود'))
  ) {
    return { type: 'error', field: 'slug', message: 'هذا الرابط محجوز مسبقاً — اختر رابطاً مختلفاً' };
  }

  // BUSINESS NAME duplicate
  if (
    ['DUPLICATE_BUSINESS_NAME', 'BUSINESS_NAME_TAKEN', 'NAME_ALREADY_EXISTS', 'NAME_TAKEN'].includes(errorCode) ||
    (mentions('business', 'name', 'اسم', 'تجاري') && mentions('exist', 'taken', 'already', 'duplicate', 'مسجل', 'مستخدم', 'موجود'))
  ) {
    return { type: 'error', field: 'businessName', message: 'هذا الاسم التجاري مسجّل مسبقاً — جرّب اسماً آخر' };
  }

  // ── C. 409 Conflict — guess field from message ──
  if (status === 409) {
    if (mentions('email', 'بريد'))                       return { type: 'error', field: 'adminEmail',   message: 'هذا البريد الإلكتروني مسجّل مسبقاً' };
    if (mentions('phone', 'جوال', 'هاتف', 'mobile'))    return { type: 'error', field: 'phone',        message: 'رقم الجوال هذا مسجّل مسبقاً' };
    if (mentions('slug', 'رابط', 'subdomain'))           return { type: 'error', field: 'slug',         message: 'هذا الرابط محجوز مسبقاً' };
    if (mentions('name', 'اسم', 'business'))             return { type: 'error', field: 'businessName', message: 'هذا الاسم التجاري مسجّل مسبقاً' };
    return { type: 'error', message: serverMsg || 'البيانات المُدخلة موجودة مسبقاً في النظام، يرجى التحقق من الحقول' };
  }

  // ── D. 400 Bad Request — pinpoint field if possible ──
  if (status === 400) {
    if (mentions('email', 'بريد'))                       return { type: 'error', field: 'adminEmail',   message: serverMsg || 'البريد الإلكتروني غير صحيح' };
    if (mentions('phone', 'جوال', 'هاتف', 'mobile'))    return { type: 'error', field: 'phone',        message: serverMsg || 'رقم الجوال غير صحيح' };
    if (mentions('slug', 'رابط', 'subdomain'))           return { type: 'error', field: 'slug',         message: serverMsg || 'رابط الدخول غير صحيح' };
    if (mentions('password', 'كلمة'))                   return { type: 'error', field: 'password',     message: serverMsg || 'كلمة السر غير صحيحة' };
    if (mentions('name', 'اسم', 'business'))             return { type: 'error', field: 'businessName', message: serverMsg || 'الاسم التجاري غير صحيح' };
    return { type: 'error', message: serverMsg || 'البيانات المُدخلة غير صحيحة، يرجى المراجعة والمحاولة مرة أخرى' };
  }

  // ── E. 422 Unprocessable ──
  if (status === 422) {
    return { type: 'error', message: serverMsg || 'البيانات المُدخلة غير صالحة، يرجى مراجعة الحقول والمحاولة مجدداً' };
  }

  // ── F. 429 Rate Limit ──
  if (status === 429) {
    return { type: 'error', message: 'لقد تجاوزت الحد المسموح به من المحاولات، يرجى الانتظار قليلاً ثم المحاولة مجدداً' };
  }

  // ── G. 500 Internal Server Error ──
  if (status === 500) {
    return { type: 'error', message: 'حدث خطأ داخلي في الخادم، يرجى المحاولة لاحقاً أو التواصل مع الدعم' };
  }

  // ── H. 503 Service Unavailable ──
  if (status === 503) {
    return { type: 'error', message: 'الخدمة غير متاحة حالياً لأعمال الصيانة، يرجى المحاولة بعد قليل' };
  }

  // ── I. Generic fallback ──
  if (serverMsg && serverMsg.length < 300) return { type: 'error', message: serverMsg };
  return { type: 'error', message: 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني' };
};

// ─── Small inline error component ────────────────────────────────────────────
const FieldError = ({ message }) =>
  message ? (
    <span className="field-error-msg">
      <Icons.AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
      {message}
    </span>
  ) : null;

// ─── Server Error Banner ──────────────────────────────────────────────────────
const ServerErrorBanner = ({ error, onClose }) => {
  if (!error) return null;
  const isWarning = error.type === 'warning';
  const isNetwork = error.type === 'network';
  return (
    <div className={`server-error-banner ${isWarning ? 'warning' : isNetwork ? 'network' : 'error'}`}>
      <div className="server-error-content">
        {isNetwork ? (
          <Icons.WifiOff style={{ flexShrink: 0 }} />
        ) : (
          <Icons.XCircle style={{ flexShrink: 0 }} />
        )}
        <span>{error.message}</span>
      </div>
      <button className="server-error-close" onClick={onClose} aria-label="إغلاق">×</button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TenantRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Field-level validation errors
  const [errors, setErrors] = useState({});
  // Server-level error (banner at top of form)
  const [serverError, setServerError] = useState(null);

  const [formData, setFormData] = useState({
    businessName: '',
    slug: '',
    adminEmail: '',
    adminName: '',
    password: '',
    phone: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    // Clear server error banner on any input
    if (serverError) setServerError(null);
  };

  const handleSlugChange = (e) => {
    // Keep slug alphanumeric and hyphens only
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, slug: val });
    if (errors.slug) {
      setErrors((prev) => ({ ...prev, slug: undefined }));
    }
    if (serverError) setServerError(null);
  };

  // Pre-load pixel from global config (in case user lands directly on /register)
  useEffect(() => {
    Api.getGlobalConfig()
      .then((cfg) => {
        if (cfg?.facebookPixelId) initPixel(cfg.facebookPixelId);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    // ── Step 1: Client-side validation ──
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      const firstErrorField = Object.keys(validationErrors)[0];
      document.querySelector(`[name="${firstErrorField}"]`)?.focus();
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      // ── Step 2: Register the new tenant ──
      await axios.post(`${SERVER_URL}/api/public/tenants/register`, formData);

    } catch (err) {
      // ── Handle Registration errors ──
      const parsed = parseServerError(err, 'register');

      if (parsed.type === 'fieldErrors') {
        // Server returned field-level errors map
        setErrors(parsed.fieldErrors);
      } else if (parsed.field) {
        // Server identified a specific field issue
        setErrors({ [parsed.field]: parsed.message });
      } else {
        setServerError(parsed);
      }

      setLoading(false);
      return;
    }

    // ── Step 3: Resolve tenant ID from slug ──
    let tenantData;
    try {
      const resolveRes = await fetch(
        `${SERVER_URL}/api/public/tenants/resolve/${encodeURIComponent(formData.slug)}`
      );
      if (!resolveRes.ok) {
        const err = new Error('resolve failed');
        err.status = resolveRes.status;
        throw err;
      }
      tenantData = await resolveRes.json();
    } catch (err) {
      const parsed = parseServerError(err, 'resolve');
      setServerError(parsed);
      if (parsed.redirectToLogin) {
        setTimeout(() => navigate('/login'), 4000);
      }
      setLoading(false);
      return;
    }

    // ── Step 4: Auto-login ──
    try {
      await Api.login(formData.adminEmail, formData.password, tenantData.id);
    } catch (err) {
      const parsed = parseServerError(err, 'login');
      setServerError(parsed);
      setLoading(false);
      // Redirect to login after short delay so user reads the message
      setTimeout(() => navigate('/login'), 4000);
      return;
    }

    // ── Step 5: Facebook Pixel ──
    try {
      trackCompleteRegistration({ businessName: formData.businessName });
    } catch (_) {
      // Pixel errors should never block the flow
    }

    localStorage.setItem('welcome_business_name', formData.businessName);
    localStorage.setItem('welcome_admin_email', formData.adminEmail);
    localStorage.setItem('welcome_slug', formData.slug);

    setLoading(false);

    // ── Step 6: Navigate to Welcome ──
    navigate('/welcome', {
      state: {
        businessName: formData.businessName,
        adminEmail: formData.adminEmail,
        slug: formData.slug,
      }
    });
  };

  return (
    <div className="tenant-register-page">
      <div className="register-left">
        <div className="register-card">
          <div className="register-header">
            <Link to="/" style={{ display: 'inline-block' }}>
              <img src={logoLoginDark} alt="Logo" className="register-logo" />
            </Link>
            <h2>إنشاء حساب جديد</h2>
            <p>ابدأ رحلتك في إدارة أعمالك باحترافية</p>
          </div>

          {/* ── Server Error Banner ── */}
          <ServerErrorBanner
            error={serverError}
            onClose={() => setServerError(null)}
          />

          <form className="register-form" onSubmit={handleSubmit} noValidate>

            {/* Business Name */}
            <div className={`input-group ${errors.businessName ? 'has-error' : ''}`}>
              <label htmlFor="reg-businessName">الاسم التجاري *</label>
              <div className="input-with-icon">
                <Icons.Business className="icon" />
                <input
                  id="reg-businessName"
                  type="text"
                  name="businessName"
                  placeholder="مثال: صيدلية الأمل"
                  value={formData.businessName}
                  onChange={handleChange}
                  aria-describedby={errors.businessName ? 'err-businessName' : undefined}
                  aria-invalid={!!errors.businessName}
                />
              </div>
              <FieldError message={errors.businessName} />
            </div>

            {/* Email */}
            <div className={`input-group ${errors.adminEmail ? 'has-error' : ''}`}>
              <label htmlFor="reg-adminEmail">البريد الإلكتروني *</label>
              <div className="input-with-icon">
                <Icons.Email className="icon" />
                <input
                  id="reg-adminEmail"
                  type="email"
                  name="adminEmail"
                  placeholder="name@company.com"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  aria-invalid={!!errors.adminEmail}
                />
              </div>
              <FieldError message={errors.adminEmail} />
            </div>

            {/* Phone */}
            <div className={`input-group ${errors.phone ? 'has-error' : ''}`}>
              <label htmlFor="reg-phone">رقم الجوال *</label>
              <div className="input-with-icon">
                <Icons.Phone className="icon" />
                <input
                  id="reg-phone"
                  type="tel"
                  name="phone"
                  placeholder="01xxxxxxxxx"
                  value={formData.phone}
                  onChange={handleChange}
                  aria-invalid={!!errors.phone}
                />
              </div>
              <FieldError message={errors.phone} />
            </div>

            {/* Slug */}
            <div className={`input-group ${errors.slug ? 'has-error' : ''}`}>
              <label htmlFor="reg-slug">رابط صفحة الدخول *</label>
              <div className="input-with-icon slug-input">
                <Icons.Language className="icon" />
                <input
                  id="reg-slug"
                  type="text"
                  name="slug"
                  placeholder="my-business"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  aria-invalid={!!errors.slug}
                />
                <span className="slug-suffix">.pos.com</span>
              </div>
              {errors.slug
                ? <FieldError message={errors.slug} />
                : <small>هذا الرابط ستستخدمه أنت وموظفوك للدخول للنظام</small>
              }
            </div>

            {/* Password */}
            <div className={`input-group ${errors.password ? 'has-error' : ''}`}>
              <label htmlFor="reg-password">كلمة السر *</label>
              <div className="input-with-icon">
                <Icons.Lock className="icon" />
                <input
                  id="reg-password"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={!!errors.password}
                />
              </div>
              <FieldError message={errors.password} />
            </div>

            <button type="submit" id="btn-register-submit" className="btn-register" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  جاري إنشاء الحساب وتسجيل الدخول...
                </>
              ) : (
                <>
                  ابدأ الاستخدام مجاناً الآن
                  <Icons.ArrowForward className="btn-icon" />
                </>
              )}
            </button>

            <div className="form-footer">
              بتسجيلك، فإنك توافق على <Link to="/terms">الشروط والأحكام</Link>
              <p style={{ marginTop: '8px' }}>هل لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link></p>
            </div>
          </form>
        </div>
      </div>

      <div className="register-right">
        <div className="marketing-content">
          <div className="marketing-badge">
            <Icons.RocketLaunch className="badge-icon" />
            <span>سجل المتكامل</span>
          </div>
          <h1>كل ما تحتاجه لإدارة أعمالك في برنامج واحد!</h1>
          <ul className="feature-list">
            <li>
              <div className="dot" />
              <div>
                <strong>المبيعات ونقاط البيع:</strong> واجهة بيع سريعة وسهلة.
              </div>
            </li>
            <li>
              <div className="dot" />
              <div>
                <strong>المخازن والمنتجات:</strong> إدارة دقيقة للمخزون والتنبيهات.
              </div>
            </li>
            <li>
              <div className="dot" />
              <div>
                <strong>الحسابات العامة:</strong> تقارير مالية وضرائب تلقائية.
              </div>
            </li>
            <li>
              <div className="dot" />
              <div>
                <strong>إدارة العملاء:</strong> برامج ولاء وقاعدة بيانات متكاملة.
              </div>
            </li>
          </ul>
        </div>
      </div>

      <style>{`
        .tenant-register-page {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: var(--bg-black);
          color: var(--text-white);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          direction: rtl;
        }

        .register-left {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: var(--bg-black);
          overflow-y: auto;
          height: 100vh;
        }

        .register-card {
          background: var(--bg-dark);
          width: 100%;
          max-width: 480px;
          padding: 1.6rem 2rem;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          backdrop-filter: blur(20px);
          animation: metroSlideUp 0.5s cubic-bezier(0.1, 0.8, 0.2, 1) both;
        }

        @keyframes metroSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .register-header {
          text-align: center;
          margin-bottom: 1rem;
        }

        .register-logo {
          height: 44px;
          object-fit: contain;
          margin-bottom: 0.6rem;
        }

        .register-header h2 {
          color: var(--text-white);
          margin-bottom: 0.2rem;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .register-header p {
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        /* ── Server Error Banner ── */
        .server-error-banner {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 0.75rem;
          font-size: 0.82rem;
          line-height: 1.4;
          animation: bannerIn 0.3s ease;
        }

        @keyframes bannerIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .server-error-banner.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
        }

        .server-error-banner.warning {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fcd34d;
        }

        .server-error-banner.network {
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.35);
          color: #a5b4fc;
        }

        .server-error-content {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          flex: 1;
        }

        .server-error-close {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          font-size: 1.2rem;
          line-height: 1;
          padding: 0;
          opacity: 0.7;
          flex-shrink: 0;
          transition: opacity 0.2s;
        }
        .server-error-close:hover { opacity: 1; }

        /* ── Form ── */
        .register-form .input-group {
          margin-bottom: 0.7rem;
        }

        .register-form label {
          display: block;
          margin-bottom: 0.3rem;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.8rem;
          transition: color 0.2s;
        }

        .has-error label {
          color: #fca5a5;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon .icon {
          position: absolute;
          right: 14px;
          color: var(--text-dim);
          width: 18px;
          height: 18px;
          pointer-events: none;
          transition: color 0.2s;
        }

        .has-error .input-with-icon .icon {
          color: #f87171;
        }

        .input-with-icon input {
          width: 100%;
          padding: 10px 44px 10px 12px;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          border-radius: 6px;
          color: var(--text-white);
          font-size: 0.9rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }

        .input-with-icon input:focus {
          border-color: var(--metro-blue);
          background: var(--bg-dark);
          box-shadow: 0 0 0 3px rgba(0, 120, 215, 0.15);
        }

        /* Error state for inputs */
        .has-error .input-with-icon input {
          border-color: rgba(239, 68, 68, 0.6);
          background: rgba(239, 68, 68, 0.05);
        }

        .has-error .input-with-icon input:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }

        /* ── Field error message ── */
        .field-error-msg {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 5px;
          color: #f87171;
          font-size: 0.78rem;
          font-weight: 500;
          animation: fieldErrIn 0.2s ease;
        }

        @keyframes fieldErrIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Slug ── */
        .slug-input .slug-suffix {
          position: absolute;
          left: 14px;
          color: var(--text-dim);
          font-weight: 600;
          font-size: 0.95rem;
          direction: ltr;
          pointer-events: none;
        }

        .slug-input input {
          padding-left: 80px;
        }

        .register-form small {
          display: block;
          margin-top: 0.4rem;
          color: var(--text-dim);
          font-size: 0.75rem;
        }

        /* ── Submit Button ── */
        .btn-register {
          width: 100%;
          background: var(--metro-blue);
          color: white;
          border: none;
          padding: 11px;
          border-radius: 6px;
          font-size: 0.97rem;
          font-weight: 700;
          cursor: pointer;
          margin-top: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(0, 120, 215, 0.2);
        }

        .btn-register:hover:not(:disabled) {
          background: var(--metro-dark-blue);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 120, 215, 0.35);
        }

        .btn-register:active:not(:disabled) { transform: translateY(0); }

        .btn-register:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* ── Loading Spinner ── */
        .spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Footer ── */
        .form-footer {
          margin-top: 0.8rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.82rem;
          line-height: 1.5;
        }

        .form-footer a {
          color: var(--metro-blue);
          text-decoration: none;
          font-weight: 600;
        }

        .form-footer a:hover { text-decoration: underline; }

        /* ── Right panel ── */
        .register-right {
          flex: 1;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #ffffff !important;
          height: 100vh;
        }

        .register-right::before,
        .register-right::after {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.25;
          pointer-events: none;
        }
        .register-right::before {
          background: var(--metro-blue);
          top: 10%; right: 10%;
          animation: floatOrb1 15s infinite alternate;
        }
        .register-right::after {
          background: var(--metro-purple);
          bottom: 10%; left: 10%;
          animation: floatOrb2 15s infinite alternate;
        }

        @keyframes floatOrb1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, 50px) scale(1.2); }
        }
        @keyframes floatOrb2 {
          0%   { transform: translate(0, 0) scale(1.2); }
          100% { transform: translate(-50px, -50px) scale(1); }
        }

        @media (max-width: 1024px) {
          .register-right { display: none; }
          .register-left {
            padding: 1rem 0.75rem;
          }
          .register-card {
            padding: 1.2rem 1.25rem;
            border-radius: 10px;
          }
        }

        @media (max-width: 480px) {
          .register-card {
            padding: 1rem;
            border-radius: 8px;
          }
          .register-form .input-group {
            margin-bottom: 0.55rem;
          }
          .register-header h2 { font-size: 1.25rem; }
          .register-logo { height: 36px; }
        }

        .marketing-content {
          max-width: 480px;
          z-index: 10;
          color: #ffffff !important;
        }

        .marketing-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 120, 215, 0.15);
          border: 1px solid rgba(0, 120, 215, 0.3);
          color: #60a5fa !important;
          padding: 6px 16px;
          border-radius: 50px;
          margin-bottom: 1.25rem;
          font-weight: 600;
          font-size: 0.85rem;
          backdrop-filter: blur(5px);
        }

        .marketing-content h1 {
          font-size: 2.1rem;
          line-height: 1.3;
          margin-bottom: 1.5rem;
          font-weight: 700;
          color: #ffffff !important;
          letter-spacing: -0.5px;
        }

        .feature-list {
          list-style: none;
          padding: 0;
        }

        .feature-list li {
          display: flex;
          gap: 14px;
          margin-bottom: 1.1rem;
          font-size: 1rem;
          align-items: flex-start;
          color: #e2e8f0 !important;
        }

        .feature-list li strong { color: #ffffff !important; }

        .feature-list .dot {
          width: 10px;
          height: 10px;
          background: var(--metro-blue);
          box-shadow: 0 0 10px var(--metro-blue);
          border-radius: 50%;
          margin-top: 8px;
          flex-shrink: 0;
        }

        .register-success-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
          background: var(--bg-black);
          color: var(--text-white);
          padding: 2rem;
          direction: rtl;
        }

        .register-success-container h1 {
          margin-top: 1.8rem;
          color: var(--text-white);
          font-weight: 700;
          font-size: 2rem;
        }

        .register-success-container p {
          color: var(--text-muted);
          font-size: 1.1rem;
          margin-top: 0.75rem;
        }
      `}</style>
    </div>
  );
};

export default TenantRegister;
