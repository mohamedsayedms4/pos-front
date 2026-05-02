import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/ExpensesPremium.css';

const CustomSelect = ({ options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="exp-custom-select-container">
      <div className={`exp-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <i className={`fas ${icon} icon-start`}></i>
        <span className="selected-text">{selectedOption.label}</span>
        <i className="fas fa-chevron-down icon-end"></i>
      </div>
      {isOpen && (
        <>
          <div className="exp-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="exp-custom-select-dropdown">
            {options.map(opt => (
              <div key={opt.value} className={`exp-custom-select-item ${opt.value === value ? 'active' : ''}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, confirm } = useGlobalUI();
  const [searchParams] = useSearchParams();

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const isAdmin = Api.isAdminOrBranchManager();

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: 'GENERAL', amount: '', expenseDate: new Date().toISOString().slice(0, 16), description: '', recurring: false, recurringPeriod: 'MONTHLY' });

  const categories = [
    { id: 'RENT', label: 'إيجار العقار', icon: 'fa-home', color: '#f59e0b' },
    { id: 'SALARIES', label: 'المرتبات والأجور', icon: 'fa-users', color: '#10b981' },
    { id: 'UTILITIES', label: 'مرافق (كهرباء/مياه)', icon: 'fa-lightbulb', color: '#06b6d4' },
    { id: 'TRANSPORT', label: 'نقل ومواصلات', icon: 'fa-truck', color: '#8b5cf6' },
    { id: 'MARKETING', label: 'دعاية وتسويق', icon: 'fa-bullhorn', color: '#3b82f6' },
    { id: 'MAINTENANCE', label: 'صيانة وتصليح', icon: 'fa-tools', color: '#f43f5e' },
    { id: 'GENERAL', label: 'مصروفات عامة', icon: 'fa-file-alt', color: '#94a3b8' }
  ];

  useEffect(() => {
    const user = Api._getUser();
    const branchFromUrl = searchParams.get('branchId');
    if (branchFromUrl) setSelectedBranchId(branchFromUrl);
    else if (user?.branchId) setSelectedBranchId(user.branchId);

    if (isAdmin) Api._request('/branches').then(res => setBranches(res.data || [])).catch(() => {});
  }, [isAdmin, searchParams]);

  useEffect(() => { loadExpenses(); }, [currentPage, category, startDate, endDate, selectedBranchId]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await Api.getExpenses(currentPage, 12, category, startDate, endDate, selectedBranchId);
      setExpenses(res.content || []);
      setTotalPages(res.totalPages || 0);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await Api.createExpense(form, selectedBranchId);
      toast('تم تسجيل المصروف بنجاح', 'success');
      setShowModal(false);
      setForm({ category: 'GENERAL', amount: '', expenseDate: new Date().toISOString().slice(0, 16), description: '', recurring: false, recurringPeriod: 'MONTHLY' });
      loadExpenses();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleDelete = (id) => {
    confirm('هل أنت متأكد من حذف هذا المصروف؟ سيتم إرجاع المبلغ للخزينة وعكس العملية.', async () => {
        try {
            await Api.deleteExpense(id);
            toast('تم حذف المصروف وعكس العملية بنجاح', 'success');
            loadExpenses();
        } catch (err) { toast(err.message, 'error'); }
    });
  };

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const salaryCount = expenses.filter(e => e.category === 'SALARIES').length;

  return (
    <div className="expenses-container">
      {/* 1. Header */}
      <div className="exp-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="exp-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>المالية</span>
          </div>
          <h1>إدارة المصروفات</h1>
        </div>
        <div className="exp-header-actions">
          <button className="exp-btn-premium exp-btn-blue" onClick={() => setShowModal(true)}>
            <i className="fas fa-plus"></i> إضافة مصروف
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="exp-stats-grid">
        <div className="exp-stat-card">
          <div className="exp-stat-info">
            <h4>إجمالي المصروفات</h4>
            <div className="exp-stat-value">{totalSpent.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="exp-stat-visual">
            <div className="exp-stat-icon icon-amber">
              <i className="fas fa-money-bill-wave"></i>
            </div>
          </div>
        </div>
        <div className="exp-stat-card">
          <div className="exp-stat-info">
            <h4>عدد قيود الرواتب</h4>
            <div className="exp-stat-value">{salaryCount} <span style={{fontSize: '0.8rem'}}>قيد</span></div>
          </div>
          <div className="exp-stat-visual">
            <div className="exp-stat-icon icon-blue">
              <i className="fas fa-users-cog"></i>
            </div>
          </div>
        </div>
        <div className="exp-stat-card">
          <div className="exp-stat-info">
            <h4>آخر مصروف</h4>
            <div className="exp-stat-value" style={{fontSize: '1rem', height: '40px', overflow: 'hidden'}}>{expenses.length > 0 ? expenses[0].description : '---'}</div>
          </div>
          <div className="exp-stat-visual">
            <div className="exp-stat-icon icon-purple">
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
          </div>
        </div>
        <div className="exp-stat-card">
          <div className="exp-stat-info">
            <h4>تصنيفات المصروف</h4>
            <div className="exp-stat-value">{categories.length} <span style={{fontSize: '0.8rem'}}>تصنيف</span></div>
          </div>
          <div className="exp-stat-visual">
            <div className="exp-stat-icon icon-green">
              <i className="fas fa-tags"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar */}
      <div className="exp-toolbar-card">
        <div className="exp-toolbar-left" style={{ flexWrap: 'wrap' }}>
          {isAdmin && (
            <CustomSelect 
              icon="fa-store"
              value={selectedBranchId}
              onChange={val => { setSelectedBranchId(val); setCurrentPage(0); }}
              options={[{ value: '', label: 'جميع الفروع' }, ...branches.map(b => ({ value: b.id.toString(), label: b.name }))]}
            />
          )}
          <CustomSelect 
            icon="fa-tag"
            value={category}
            onChange={val => { setCategory(val); setCurrentPage(0); }}
            options={[{ value: '', label: 'جميع التصنيفات' }, ...categories.map(c => ({ value: c.id, label: c.label }))]}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="date" className="exp-input" style={{ width: '140px', padding: '8px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span style={{color: 'var(--exp-text-secondary)'}}>إلى</span>
            <input type="date" className="exp-input" style={{ width: '140px', padding: '8px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="exp-table-card">
        <div className="exp-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
          ) : expenses.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--exp-text-secondary)' }}>
              <i className="fas fa-search" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد نتائج بحث</h3>
            </div>
          ) : (
            <table className="exp-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>التصنيف</th>
                  <th>الوصف والتفاصيل</th>
                  <th>المبلغ</th>
                  <th>المسؤول</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => {
                  const cat = categories.find(c => c.id === exp.category) || categories[categories.length - 1];
                  return (
                    <tr key={exp.id}>
                      <td>
                        <div style={{ fontWeight: 800 }}>{new Date(exp.expenseDate).toLocaleDateString('ar-EG')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--exp-text-secondary)' }}>
                          {new Date(exp.expenseDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <span className="exp-type-badge" style={{ background: cat.color + '15', color: cat.color }}>
                          <i className={`fas ${cat.icon}`}></i> {cat.label}
                        </span>
                      </td>
                      <td style={{ maxWidth: '300px', fontSize: '0.9rem' }}>{exp.description}</td>
                      <td style={{ color: '#f43f5e', fontWeight: 800, fontSize: '1.1rem' }}>
                        - {exp.amount.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                            {exp.createdBy?.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.85rem' }}>{exp.createdBy}</span>
                        </div>
                      </td>
                      <td>
                        <button className="exp-action-btn delete" onClick={() => handleDelete(exp.id)} title="حذف"><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="exp-pagination">
          <div className="exp-pagination-info">صفحة {currentPage + 1} من {totalPages}</div>
          <div className="exp-pagination-btns">
            <button className="exp-page-btn" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>السابق</button>
            <button className="exp-page-btn active">{currentPage + 1}</button>
            <button className="exp-page-btn" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>التالي</button>
          </div>
        </div>
      </div>

      {showModal && (
        <ModalContainer>
          <div className="exp-modal-overlay" onClick={(e) => { if (e.target.classList.contains('exp-modal-overlay')) setShowModal(false); }}>
            <div className="exp-modal" style={{ maxWidth: '650px' }}>
              <div className="exp-modal-header">
                <h3>إضافة مصروف جديد</h3>
                <button className="exp-modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div className="exp-modal-body">
                <form id="expenseForm" onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="exp-form-group">
                      <label>تصنيف المصروف</label>
                      <select className="exp-input" required value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="exp-form-group">
                      <label>المبلغ (ج.م)</label>
                      <input type="number" className="exp-input" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" style={{ fontWeight: 800, fontSize: '1.1rem' }} />
                    </div>
                  </div>

                  <div className="exp-form-group">
                    <label>تاريخ وتوقيت العملية</label>
                    <input type="datetime-local" className="exp-input" required value={form.expenseDate} onChange={e => setForm({...form, expenseDate: e.target.value})} />
                  </div>

                  <div className="exp-form-group">
                    <label>الوصف والسبب</label>
                    <textarea className="exp-textarea" rows="3" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="مثال: فاتورة الكهرباء..." />
                  </div>

                  <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="checkbox" id="recurring" checked={form.recurring} onChange={e => setForm({...form, recurring: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                    <label htmlFor="recurring" style={{ marginBottom: 0, fontWeight: 600 }}>تفعيل التكرار التلقائي؟</label>
                  </div>

                  {form.recurring && (
                    <div className="exp-form-group" style={{ marginTop: '16px' }}>
                      <label>دورية التكرار</label>
                      <select className="exp-input" value={form.recurringPeriod} onChange={e => setForm({...form, recurringPeriod: e.target.value})}>
                        <option value="WEEKLY">كل أسبوع</option>
                        <option value="MONTHLY">كل شهر</option>
                        <option value="YEARLY">كل سنة</option>
                      </select>
                    </div>
                  )}
                </form>
              </div>
              <div className="exp-modal-footer">
                <button type="button" className="exp-btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" form="expenseForm" className="exp-btn-primary">حفظ المصروف</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Expenses;
