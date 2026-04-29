import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, confirm } = useGlobalUI();
  const [searchParams] = useSearchParams();

  // Branch Selection
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const isAdmin = Api.isAdminOrBranchManager();

  // Filters & Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    category: 'GENERAL',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 16),
    description: '',
    recurring: false,
    recurringPeriod: 'MONTHLY'
  });

  const categories = [
    { id: 'RENT', label: 'إيجار العقار', icon: '🏠', color: 'var(--metro-orange)' },
    { id: 'SALARIES', label: 'المرتبات والأجور', icon: '💰', color: 'var(--metro-green)' },
    { id: 'UTILITIES', label: 'مرافق (كهرباء/مياه)', icon: '💡', color: 'var(--metro-teal)' },
    { id: 'TRANSPORT', label: 'نقل ومواصلات', icon: '🚛', color: 'var(--metro-purple)' },
    { id: 'MARKETING', label: 'دعاية وتسويق', icon: '📢', color: 'var(--metro-blue)' },
    { id: 'MAINTENANCE', label: 'صيانة وتصليح', icon: '🔧', color: 'var(--metro-rose)' },
    { id: 'GENERAL', label: 'مصروفات عامة', icon: '📝', color: 'var(--text-dim)' }
  ];

  useEffect(() => {
    const user = Api._getUser();
    const branchFromUrl = searchParams.get('branchId');

    if (branchFromUrl) {
      setSelectedBranchId(branchFromUrl);
    } else if (user?.branchId) {
      setSelectedBranchId(user.branchId);
    }

    if (isAdmin) {
      Api._request('/branches').then(res => setBranches(res.data || [])).catch(() => {});
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [currentPage, category, startDate, endDate, selectedBranchId]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await Api.getExpenses(currentPage, 12, category, startDate, endDate, selectedBranchId);
      setExpenses(res.content || []);
      setTotalPages(res.totalPages || 0);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await Api.createExpense(form, selectedBranchId);
      toast('تم تسجيل المصروف بنجاح', 'success');
      setShowModal(false);
      setForm({
        category: 'GENERAL',
        amount: '',
        expenseDate: new Date().toISOString().slice(0, 16),
        description: '',
        recurring: false,
        recurringPeriod: 'MONTHLY'
      });
      loadExpenses();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = (id) => {
    confirm('هل أنت متأكد من حذف هذا المصروف؟ سيتم إرجاع المبلغ للخزينة وعكس العملية.', async () => {
        try {
            await Api.deleteExpense(id);
            toast('تم حذف المصروف وعكس العملية بنجاح', 'success');
            loadExpenses();
        } catch (err) {
            toast(err.message, 'error');
        }
    });
  };

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const salaryCount = expenses.filter(e => e.category === 'SALARIES').length;

  return (
    <div className="page-section anim-fade-in">
      <div className="stats-grid mb-4">
        <StatTile
          id="expenses_total_spent"
          label="إجمالي المصروفات المعروضة"
          value={`${totalSpent.toLocaleString()} ج.م`}
          icon="💰"
          defaults={{ color: 'emerald', size: 'tile-wd-sm' }}
        />
        <StatTile
          id="expenses_salary_count"
          label="عدد قيود الرواتب"
          value={`${salaryCount} قيد`}
          icon="👥"
          defaults={{ color: 'blue', size: 'tile-sq-sm' }}
        />
        <StatTile
          id="expenses_last"
          label="آخر مصروف تم تسجيله"
          value={expenses.length > 0 ? expenses[0].description.substring(0, 15) + '...' : '---'}
          icon="📝"
          defaults={{ color: 'amber', size: 'tile-sq-sm' }}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>🏢 إدارة المصروفات</h3>
          <div className="toolbar">
            <div style={{ display: 'flex', gap: '10px' }}>
              {isAdmin && (
                  <select className="form-control" value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} style={{ width: '150px', height: '40px' }}>
                    <option value="">جميع الفروع</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
              )}
              <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '180px', height: '40px', padding: '0 10px' }}>
                <option value="">جميع التصنيفات</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '150px', height: '40px' }} />
              <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '150px', height: '40px' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <span>+</span> إضافة مصروف
              </button>
            </div>
          </div>
        </div>



        <div className="card-body no-padding">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>التاريخ</th>
                  <th style={{ width: '180px' }}>التصنيف</th>
                  <th>الوصف والتفاصيل</th>
                  <th style={{ width: '150px' }}>المبلغ</th>
                  <th style={{ width: '150px' }}>المسؤول</th>
                  <th style={{ width: '100px' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ padding: '80px 0' }}><Loader message="جاري تحميل سجلات المصروفات..." /></td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '100px 0', textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', opacity: 0.2 }}>🔍</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '10px' }}>لا توجد مصروفات مسجلة تطابق هذا الفلتر</div>
                  </td></tr>
                ) : (
                  expenses.map(exp => {
                    const cat = categories.find(c => c.id === exp.category) || { label: exp.category, icon: '📄', color: 'var(--text-dim)' };
                    return (
                        <tr key={exp.id} className="anim-slide-in">
                            <td style={{ fontFamily: 'monospace' }}>{new Date(exp.expenseDate).toLocaleDateString('ar-EG')}</td>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                                    <span className="badge" style={{ background: cat.color + '22', color: cat.color, border: '1px solid ' + cat.color + '44' }}>
                                        {cat.label}
                                    </span>
                                </div>
                            </td>
                            <td style={{ maxWidth: '300px' }}>{exp.description}</td>
                            <td style={{ color: 'var(--metro-rose)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                - {exp.amount.toLocaleString()} <span style={{ fontSize: '0.8rem' }}>ج.م</span>
                            </td>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--gradient-secondary)', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {exp.createdBy?.charAt(0).toUpperCase() || 'A'}
                                    </div>
                                    <span style={{ fontSize: '0.85rem' }}>{exp.createdBy}</span>
                                </div>
                            </td>
                            <td>
                                <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDelete(exp.id)} style={{ padding: '5px 15px' }}>حذف</button>
                            </td>
                        </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: '20px' }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto', padding: '0 15px' }} disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>السابق</button>
          <button className="active">{currentPage + 1}</button>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto', padding: '0 15px' }} disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>التالي</button>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <ModalContainer>
          <div className="modal-overlay active anim-fade-in" onClick={() => setShowModal(false)} style={{ zIndex: 100000 }}>
            <div className="modal-content anim-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }}>
                <div className="modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '25px' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span>🖋️</span> إضافة مصروف مالي جديد</h2>
                    <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ padding: '30px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>تصنيف المصروف</label>
                                <select className="form-control" required value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ height: '48px' }}>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>المبلغ (ج.م)</label>
                                <input type="number" className="form-control" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" style={{ height: '48px', fontSize: '1.2rem', fontWeight: 'bold' }} />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '25px' }}>
                            <label>تاريخ وتوقيت العملية</label>
                            <input type="datetime-local" className="form-control" required value={form.expenseDate} onChange={e => setForm({...form, expenseDate: e.target.value})} style={{ height: '48px' }} />
                        </div>

                        <div className="form-group" style={{ marginBottom: '25px' }}>
                            <label>الوصف والسبب</label>
                            <textarea className="form-control" rows="3" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="مثال: فاتورة الكهرباء لشهر مارس..." style={{ padding: '15px' }}></textarea>
                        </div>

                        <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <input type="checkbox" id="recurring" checked={form.recurring} onChange={e => setForm({...form, recurring: e.target.checked})} style={{ width: '20px', height: '20px' }} />
                            <label htmlFor="recurring" style={{ marginBottom: 0, cursor: 'pointer' }}>تفعيل التكرار التلقائي لهذا المصروف؟</label>
                        </div>

                        {form.recurring && (
                            <div className="form-group anim-slide-in" style={{ marginTop: '20px' }}>
                                <label>دورية التكرار</label>
                                <select className="form-control" value={form.recurringPeriod} onChange={e => setForm({...form, recurringPeriod: e.target.value})} style={{ height: '48px' }}>
                                    <option value="WEEKLY">كل أسبوع</option>
                                    <option value="MONTHLY">كل شهر</option>
                                    <option value="YEARLY">كل سنة</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '25px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ height: '50px', padding: '0 30px' }}>إلغاء</button>
                        <button type="submit" className="btn btn-primary" style={{ height: '50px', padding: '0 40px', background: 'var(--gradient-primary)', border: 'none' }}>حفظ قيد المصروف</button>
                    </div>
                </form>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Expenses;
