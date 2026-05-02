import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import CheckPrintTemplate from '../components/CheckPrintTemplate';
import '../styles/pages/ChecksPremium.css';

const CustomSelect = ({ options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="chk-custom-select-container">
      <div className={`chk-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <i className={`fas ${icon} icon-start`}></i>
        <span className="selected-text">{selectedOption.label}</span>
        <i className="fas fa-chevron-down icon-end"></i>
      </div>
      {isOpen && (
        <>
          <div className="chk-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="chk-custom-select-dropdown">
            {options.map(opt => (
              <div key={opt.value} className={`chk-custom-select-item ${opt.value === value ? 'active' : ''}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const CheckManagement = () => {
  const { toast, confirm } = useGlobalUI();
  const [checks, setChecks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEndorseModal, setShowEndorseModal] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [endorseeName, setEndorseeName] = useState('');
  const [printingCheck, setPrintingCheck] = useState(null);

  const [formData, setFormData] = useState({ checkNumber: '', dueDate: new Date().toISOString().split('T')[0], amount: 0, bankName: '', beneficiary: '', checkType: 'RECEIVABLE', accountId: '', notes: '' });
  const [filters, setFilters] = useState({ status: 'ALL', type: 'ALL', dateFrom: '', dateTo: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [checkRes, accRes] = await Promise.all([ Api.getChecks(), Api.getTreasuryOverview() ]);
      setChecks(checkRes.content || []);
      const bankAccounts = (accRes || []).filter(a => a.accountType === 'BANK' || a.accountType === 'bank');
      setAccounts(bankAccounts.length > 0 ? bankAccounts : accRes || []);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const stats = useMemo(() => {
    return {
      totalReceivable: checks.filter(c => c.checkType === 'RECEIVABLE').reduce((sum, c) => sum + c.amount, 0),
      totalPayable: checks.filter(c => c.checkType === 'PAYABLE').reduce((sum, c) => sum + c.amount, 0),
      pendingAmount: checks.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0),
      collectedAmount: checks.filter(c => c.status === 'COLLECTED').reduce((sum, c) => sum + c.amount, 0),
    };
  }, [checks]);

  const filteredChecks = useMemo(() => {
    return checks.filter(c => {
      const matchStatus = filters.status === 'ALL' || c.status === filters.status;
      const matchType = filters.type === 'ALL' || c.checkType === filters.type;
      const matchFrom = !filters.dateFrom || new Date(c.dueDate) >= new Date(filters.dateFrom);
      const matchTo = !filters.dateTo || new Date(c.dueDate) <= new Date(filters.dateTo);
      return matchStatus && matchType && matchFrom && matchTo;
    });
  }, [checks, filters]);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, account: { id: formData.accountId } };
      await Api.registerCheck(data);
      toast('تم تسجيل الشيك بنجاح', 'success');
      setShowForm(false);
      loadData();
    } catch (err) { toast(err.message, 'error'); }
  };

  const updateStatus = async (id, status, statusText) => {
    confirm(`هل أنت متأكد من تغيير حالة الشيك إلى: ${statusText}؟`, async () => {
      try {
        await Api.updateCheckStatus(id, status);
        toast('تم تحديث حالة الشيك', 'success');
        loadData();
      } catch (err) { toast(err.message, 'error'); }
    });
  };

  const handlePrint = (check) => {
    setPrintingCheck(check);
    setTimeout(() => { window.print(); setPrintingCheck(null); }, 500);
  };

  const statusMap = {
    PENDING: { label: 'تحت التحصيل', color: '#6366f1', icon: 'fa-hourglass-half' },
    COLLECTED: { label: 'تم التحصيل', color: '#10b981', icon: 'fa-check-double' },
    REJECTED: { label: 'مرفوض', color: '#f43f5e', icon: 'fa-times-circle' },
    ENDORSED: { label: 'تم التجيير', color: '#8b5cf6', icon: 'fa-reply-all' },
    CANCELLED: { label: 'ملغي', color: '#94a3b8', icon: 'fa-ban' }
  };

  if (printingCheck) return <CheckPrintTemplate check={printingCheck} />;

  return (
    <div className="checks-container">
      {/* 1. Header */}
      <div className="chk-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="chk-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>الأوراق المالية</span>
          </div>
          <h1>إدارة الشيكات</h1>
        </div>
        <div className="chk-header-actions">
          <button className="chk-btn-premium chk-btn-blue" onClick={() => setShowForm(true)}>
            <i className="fas fa-plus"></i> تسجيل شيك جديد
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="chk-stats-grid">
        <div className="chk-stat-card">
          <div className="chk-stat-info">
            <h4>أوراق القبض</h4>
            <div className="chk-stat-value">{stats.totalReceivable.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="chk-stat-visual">
            <div className="chk-stat-icon icon-green">
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
          </div>
        </div>
        <div className="chk-stat-card">
          <div className="chk-stat-info">
            <h4>أوراق الدفع</h4>
            <div className="chk-stat-value">{stats.totalPayable.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="chk-stat-visual">
            <div className="chk-stat-icon icon-amber">
              <i className="fas fa-file-export"></i>
            </div>
          </div>
        </div>
        <div className="chk-stat-card">
          <div className="chk-stat-info">
            <h4>تحت التحصيل</h4>
            <div className="chk-stat-value">{stats.pendingAmount.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="chk-stat-visual">
            <div className="chk-stat-icon icon-blue">
              <i className="fas fa-hourglass-half"></i>
            </div>
          </div>
        </div>
        <div className="chk-stat-card">
          <div className="chk-stat-info">
            <h4>تم تحصيلها</h4>
            <div className="chk-stat-value">{stats.collectedAmount.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="chk-stat-visual">
            <div className="chk-stat-icon icon-purple">
              <i className="fas fa-check-double"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar (Filters) */}
      <div className="chk-toolbar-card">
        <div className="chk-toolbar-left" style={{ flexWrap: 'wrap' }}>
          <CustomSelect 
            icon="fa-filter"
            value={filters.status}
            onChange={val => setFilters({...filters, status: val})}
            options={[{ value: 'ALL', label: 'كل الحالات' }, ...Object.keys(statusMap).map(k => ({ value: k, label: statusMap[k].label }))]}
          />
          <CustomSelect 
            icon="fa-exchange-alt"
            value={filters.type}
            onChange={val => setFilters({...filters, type: val})}
            options={[{ value: 'ALL', label: 'كل الأنواع' }, { value: 'RECEIVABLE', label: 'قبض' }, { value: 'PAYABLE', label: 'دفع' }]}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="date" className="chk-input" style={{ width: '140px' }} value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
            <span style={{color: 'var(--chk-text-secondary)'}}>إلى</span>
            <input type="date" className="chk-input" style={{ width: '140px' }} value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} />
          </div>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="chk-table-card">
        <div className="chk-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري تحميل سجل الشيكات..." /></div>
          ) : filteredChecks.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--chk-text-secondary)' }}>
              <i className="fas fa-money-check" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد شيكات مطابقة للبحث</h3>
            </div>
          ) : (
            <table className="chk-table">
              <thead>
                <tr>
                  <th>رقم الشيك</th>
                  <th>تاريخ الاستحقاق</th>
                  <th>المبلغ</th>
                  <th>النوع</th>
                  <th>المستفيد / البنك</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredChecks.map(c => {
                  const status = statusMap[c.status] || { label: c.status, color: '#94a3b8', icon: 'fa-info-circle' };
                  const isOverdue = new Date(c.dueDate) <= new Date() && c.status === 'PENDING';
                  return (
                    <tr key={c.id}>
                      <td><code>{c.checkNumber}</code></td>
                      <td style={{ color: isOverdue ? '#f43f5e' : 'inherit', fontWeight: isOverdue ? 800 : 400 }}>
                        {c.dueDate} {isOverdue && <i className="fas fa-exclamation-triangle" title="متأخر"></i>}
                      </td>
                      <td style={{ fontWeight: 800, fontSize: '1.1rem' }}>{c.amount.toLocaleString('ar-EG')}</td>
                      <td>
                        <span className={`chk-type-badge ${c.checkType === 'RECEIVABLE' ? 'badge-green' : 'badge-amber'}`}>
                          {c.checkType === 'RECEIVABLE' ? '📥 قبض' : '📤 دفع'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{c.beneficiary}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--chk-text-secondary)' }}>{c.bankName}</div>
                      </td>
                      <td>
                        <span className="chk-type-badge" style={{ background: status.color + '15', color: status.color }}>
                          <i className={`fas ${status.icon}`}></i> {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="chk-actions">
                          {c.status === 'PENDING' && (
                            <>
                              <button className="chk-action-btn" onClick={() => updateStatus(c.id, 'COLLECTED', 'تم التحصيل')} title="تحصيل"><i className="fas fa-check-circle"></i></button>
                              <button className="chk-action-btn" onClick={() => updateStatus(c.id, 'REJECTED', 'مرفوض')} title="رفض"><i className="fas fa-times-circle"></i></button>
                            </>
                          )}
                          <button className="chk-action-btn" onClick={() => handlePrint(c)} title="طباعة"><i className="fas fa-print"></i></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <ModalContainer>
          <div className="chk-modal-overlay" onClick={(e) => { if (e.target.classList.contains('chk-modal-overlay')) setShowForm(false); }}>
            <div className="chk-modal" style={{ maxWidth: '600px' }}>
              <div className="chk-modal-header">
                <h3>تسجيل شيك جديد</h3>
                <button className="chk-modal-close" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <div className="chk-modal-body">
                <form id="checkForm" onSubmit={handleRegister}>
                  <div className="chk-form-group">
                    <label>رقم الشيك</label>
                    <input className="chk-input" value={formData.checkNumber} onChange={e => setFormData({ ...formData, checkNumber: e.target.value })} required placeholder="000000" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="chk-form-group">
                      <label>تاريخ الاستحقاق</label>
                      <input type="date" className="chk-input" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} required />
                    </div>
                    <div className="chk-form-group">
                      <label>المبلغ</label>
                      <input type="number" className="chk-input" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required placeholder="0.00" />
                    </div>
                  </div>
                  <div className="chk-form-group">
                    <label>النوع</label>
                    <select className="chk-input" value={formData.checkType} onChange={e => setFormData({ ...formData, checkType: e.target.value })}>
                      <option value="RECEIVABLE">قبض (من عميل)</option>
                      <option value="PAYABLE">دفع (لمورد)</option>
                    </select>
                  </div>
                  <div className="chk-form-group">
                    <label>المستفيد / الساحب</label>
                    <input className="chk-input" value={formData.beneficiary} onChange={e => setFormData({ ...formData, beneficiary: e.target.value })} placeholder="اسم المستفيد..." />
                  </div>
                  <div className="chk-form-group">
                    <label>البنك</label>
                    <input className="chk-input" value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} placeholder="اسم البنك المصدر..." />
                  </div>
                  <div className="chk-form-group">
                    <label>الحساب المالي المرتبط</label>
                    <select className="chk-input" value={formData.accountId} onChange={e => setFormData({ ...formData, accountId: e.target.value })} required>
                      <option value="">-- اختر البنك المودع فيه --</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </form>
              </div>
              <div className="chk-modal-footer">
                <button type="button" className="chk-btn-ghost" onClick={() => setShowForm(false)}>إلغاء</button>
                <button type="submit" form="checkForm" className="chk-btn-primary">تسجيل الشيك</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default CheckManagement;
