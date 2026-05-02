import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import { useBranch } from '../context/BranchContext';
import '../styles/pages/DebtsPremium.css';

const CustomSelect = ({ options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="dbt-custom-select-container">
      <div className={`chk-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <i className={`fas ${icon} icon-start`}></i>
        <span className="selected-text">{selectedOption.label}</span>
        <i className="fas fa-chevron-down icon-end"></i>
      </div>
      {isOpen && (
        <>
          <div className="dbt-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="dbt-custom-select-dropdown">
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

const DebtManagement = () => {
  const { toast, confirm } = useGlobalUI();
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();
  
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('RECEIVABLE');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branches, setBranches] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [scheduleTime, setScheduleTime] = useState('06:00');

  const [newDebt, setNewDebt] = useState({
    type: 'RECEIVABLE', entityName: '', entityType: 'CUSTOMER', entityId: null, totalAmount: '', reason: '',
    installments: [{ amount: '', dueDate: new Date().toISOString().split('T')[0] }]
  });
  const [entities, setEntities] = useState([]);

  useEffect(() => {
    const user = Api._getUser();
    if (globalBranchId) setSelectedBranchId(globalBranchId);
    else if (user?.branchId) setSelectedBranchId(user.branchId);
    if (contextBranches?.length > 0) setBranches(contextBranches);
  }, [globalBranchId, contextBranches]);

  const loadDebts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api.getDebts(currentPage, pageSize, activeTab, statusFilter, entityTypeFilter, query, selectedBranchId);
      setDebts(res.content || []);
      setTotalElements(res.totalElements || 0);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }, [activeTab, statusFilter, entityTypeFilter, query, currentPage, pageSize, selectedBranchId]);

  useEffect(() => { loadDebts(); }, [loadDebts]);

  const loadEntities = async (type) => {
    try {
      let res;
      if (type === 'CUSTOMER') res = await Api.getCustomers(0, 1000, '', selectedBranchId);
      else if (type === 'SUPPLIER') res = await Api.getSuppliers(0, 1000, '', '', selectedBranchId);
      setEntities(res?.items || res?.content || []);
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleSaveDebt = async (e) => {
    e.preventDefault();
    const sum = newDebt.installments.reduce((acc, curr) => acc + Number(curr.amount), 0);
    if (Math.abs(sum - Number(newDebt.totalAmount)) > 0.01) {
      toast('مجموع الأقساط يجب أن يساوي المبلغ الإجمالي', 'error'); return;
    }
    try {
      await Api.createManualDebt(newDebt);
      toast('تم تسجيل الدين بنجاح', 'success'); setShowAddModal(false); loadDebts();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await Api.payDebtInstallment(selectedInstallment.id, payAmount);
      toast('تم السداد بنجاح', 'success'); setShowPayModal(false); loadDebts();
    } catch (err) { toast(err.message, 'error'); }
  };

  const statusMap = {
    PAID: { label: 'تم السداد', color: '#10b981', icon: 'fa-check-circle' },
    PARTIAL: { label: 'سداد جزئي', color: '#6366f1', icon: 'fa-adjust' },
    PENDING: { label: 'انتظار', color: '#f59e0b', icon: 'fa-clock' },
    OVERDUE: { label: 'متأخر', color: '#f43f5e', icon: 'fa-exclamation-circle' }
  };

  return (
    <div className="debts-container">
      {/* 1. Header */}
      <div className="dbt-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="dbt-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>المالية</span>
          </div>
          <h1>إدارة الآجل والديون</h1>
        </div>
        <div className="dbt-header-actions">
          <button className="dbt-btn-premium dbt-btn-outline" onClick={() => setShowSettingsModal(true)}>
            <i className="fas fa-cog"></i> إعدادات التذكير
          </button>
          <button className="dbt-btn-premium dbt-btn-blue" onClick={() => { setNewDebt({...newDebt, type: activeTab}); setShowAddModal(true); }}>
            <i className="fas fa-plus"></i> إضافة دين يدوي
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="dbt-stats-grid">
        <div className="dbt-stat-card">
          <div className="dbt-stat-info">
            <h4>سجلات لنا (مدين)</h4>
            <div className="dbt-stat-value">{activeTab === 'RECEIVABLE' ? totalElements : '-'}</div>
          </div>
          <div className="dbt-stat-visual">
            <div className="dbt-stat-icon icon-blue">
              <i className="fas fa-hand-holding-usd"></i>
            </div>
          </div>
        </div>
        <div className="dbt-stat-card">
          <div className="dbt-stat-info">
            <h4>سجلات علينا (دائن)</h4>
            <div className="dbt-stat-value">{activeTab === 'PAYABLE' ? totalElements : '-'}</div>
          </div>
          <div className="dbt-stat-visual">
            <div className="dbt-stat-icon icon-amber">
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
          </div>
        </div>
        <div className="dbt-stat-card">
          <div className="dbt-stat-info">
            <h4>أقساط سددت (اليوم)</h4>
            <div className="dbt-stat-value">جديد</div>
          </div>
          <div className="dbt-stat-visual">
            <div className="dbt-stat-icon icon-green">
              <i className="fas fa-calendar-check"></i>
            </div>
          </div>
        </div>
        <div className="dbt-stat-card">
          <div className="dbt-stat-info">
            <h4>أقساط متأخرة</h4>
            <div className="dbt-stat-value">⚠️</div>
          </div>
          <div className="dbt-stat-visual">
            <div className="dbt-stat-icon icon-red">
              <i className="fas fa-clock"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar (Tabs & Filters) */}
      <div className="dbt-toolbar-card">
        <div className="dbt-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button className={`dbt-btn-premium ${activeTab === 'RECEIVABLE' ? 'dbt-btn-blue' : 'dbt-btn-ghost'}`} onClick={() => setActiveTab('RECEIVABLE')}>
            💰 لنا (تحصيلات)
          </button>
          <button className={`dbt-btn-premium ${activeTab === 'PAYABLE' ? 'dbt-btn-amber' : 'dbt-btn-ghost'}`} onClick={() => setActiveTab('PAYABLE')}>
            💸 علينا (سداد)
          </button>
        </div>
        <div className="dbt-toolbar-left" style={{ flexWrap: 'wrap' }}>
          <div className="dbt-search-container" style={{ flex: 2, minWidth: '250px' }}>
            <i className="fas fa-search"></i>
            <input type="text" className="dbt-input" placeholder="بحث بالاسم أو السبب..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <CustomSelect 
            icon="fa-filter"
            value={statusFilter}
            onChange={val => setStatusFilter(val)}
            options={[{ value: '', label: 'كل الحالات' }, { value: 'PENDING', label: 'انتظار' }, { value: 'PARTIAL', label: 'سداد جزئي' }, { value: 'PAID', label: 'تم السداد' }]}
          />
          <CustomSelect 
            icon="fa-user-tag"
            value={entityTypeFilter}
            onChange={val => setEntityTypeFilter(val)}
            options={[{ value: '', label: 'كل الجهات' }, { value: 'CUSTOMER', label: 'عملاء' }, { value: 'SUPPLIER', label: 'موردين' }, { value: 'BANK', label: 'بنوك' }]}
          />
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="dbt-table-card">
        <div className="dbt-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
          ) : debts.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--dbt-text-secondary)' }}>
              <i className="fas fa-money-bill-wave" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد سجلات ديون</h3>
            </div>
          ) : (
            <table className="dbt-table">
              <thead>
                <tr>
                  <th>الجهة</th>
                  <th>النوع</th>
                  <th>الإجمالي</th>
                  <th>المسدد</th>
                  <th>المتبقي</th>
                  <th>الحالة</th>
                  <th>السبب</th>
                  <th>الأقساط</th>
                </tr>
              </thead>
              <tbody>
                {debts.map(debt => (
                  <React.Fragment key={debt.id}>
                    <tr className={selectedDebt?.id === debt.id ? 'active-row' : ''}>
                      <td>
                        <div style={{ fontWeight: 800 }}>{debt.entityName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--dbt-text-secondary)' }}>{debt.entityType}</div>
                      </td>
                      <td>{debt.type === 'RECEIVABLE' ? 'لنا' : 'علينا'}</td>
                      <td style={{ fontWeight: 700 }}>{Number(debt.totalAmount).toLocaleString()}</td>
                      <td style={{ color: 'var(--dbt-accent-green)' }}>{Number(debt.paidAmount).toLocaleString()}</td>
                      <td style={{ color: '#f43f5e', fontWeight: 800 }}>{Number(debt.remainingAmount).toLocaleString()}</td>
                      <td>
                        <span className="dbt-type-badge" style={{ background: (statusMap[debt.status]?.color || '#94a3b8') + '15', color: statusMap[debt.status]?.color || '#94a3b8' }}>
                          {statusMap[debt.status]?.label || debt.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{debt.reason}</td>
                      <td>
                        <button className="dbt-action-btn" onClick={() => setSelectedDebt(selectedDebt?.id === debt.id ? null : debt)}>
                          <i className={`fas ${selectedDebt?.id === debt.id ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                        </button>
                      </td>
                    </tr>
                    {selectedDebt?.id === debt.id && (
                      <tr>
                        <td colSpan="8" style={{ padding: '0', background: 'rgba(99, 102, 241, 0.02)' }}>
                          <div style={{ padding: '20px 40px' }}>
                            <table className="dbt-table" style={{ background: 'transparent' }}>
                              <thead>
                                <tr style={{ background: 'transparent' }}>
                                  <th>تاريخ الاستحقاق</th>
                                  <th>قيمة القسط</th>
                                  <th>المسدد</th>
                                  <th>تاريخ السداد</th>
                                  <th>الحالة</th>
                                  <th>إجراء</th>
                                </tr>
                              </thead>
                              <tbody>
                                {debt.installments?.map(inst => (
                                  <tr key={inst.id}>
                                    <td>{inst.dueDate}</td>
                                    <td style={{ fontWeight: 700 }}>{Number(inst.amount).toLocaleString()}</td>
                                    <td style={{ color: 'var(--dbt-accent-green)' }}>{Number(inst.paidAmount).toLocaleString()}</td>
                                    <td>{inst.paymentDate || '—'}</td>
                                    <td>
                                      <span className="dbt-type-badge" style={{ background: (statusMap[inst.status]?.color || '#94a3b8') + '15', color: statusMap[inst.status]?.color || '#94a3b8' }}>
                                        {statusMap[inst.status]?.label || inst.status}
                                      </span>
                                    </td>
                                    <td>
                                      {inst.status !== 'PAID' && (
                                        <button className="dbt-btn-premium dbt-btn-blue" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => { setSelectedInstallment(inst); setPayAmount(inst.amount - (inst.paidAmount || 0)); setShowPayModal(true); }}>
                                          سداد قسط
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAddModal && (
        <ModalContainer>
          <div className="dbt-modal-overlay" onClick={(e) => { if (e.target.classList.contains('dbt-modal-overlay')) setShowAddModal(false); }}>
            <div className="dbt-modal" style={{ maxWidth: '800px' }}>
              <div className="dbt-modal-header">
                <h3>إضافة دين يدوي جديد ({activeTab === 'RECEIVABLE' ? 'لنا' : 'علينا'})</h3>
                <button className="dbt-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
              </div>
              <div className="dbt-modal-body">
                <form id="debtForm" onSubmit={handleSaveDebt}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="dbt-form-group">
                      <label>نوع الجهة</label>
                      <select className="dbt-input" value={newDebt.entityType} onChange={(e) => { const type = e.target.value; setNewDebt({ ...newDebt, entityType: type, entityId: null, entityName: '' }); if (type === 'CUSTOMER' || type === 'SUPPLIER') loadEntities(type); }}>
                        <option value="CUSTOMER">عميل مسجل</option>
                        <option value="SUPPLIER">مورد مسجل</option>
                        <option value="BANK">بنك / مؤسسة</option>
                        <option value="OTHER">أخرى (نص حر)</option>
                      </select>
                    </div>
                    <div className="dbt-form-group">
                      <label>اختيار الجهة / الاسم</label>
                      {(newDebt.entityType === 'CUSTOMER' || newDebt.entityType === 'SUPPLIER') ? (
                        <select className="dbt-input" required onChange={(e) => { const ent = entities.find(x => x.id === Number(e.target.value)); setNewDebt({ ...newDebt, entityId: ent.id, entityName: ent.name }); }}>
                          <option value="">اختر من القائمة...</option>
                          {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                      ) : (
                        <input type="text" className="dbt-input" placeholder="اكتب اسم الجهة..." required value={newDebt.entityName} onChange={e => setNewDebt({ ...newDebt, entityName: e.target.value })} />
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="dbt-form-group">
                      <label>المبلغ الإجمالي *</label>
                      <input type="number" className="dbt-input" required value={newDebt.totalAmount} onChange={e => setNewDebt({ ...newDebt, totalAmount: e.target.value })} />
                    </div>
                    <div className="dbt-form-group">
                      <label>السبب / ملاحظات</label>
                      <input type="text" className="dbt-input" value={newDebt.reason} onChange={e => setNewDebt({ ...newDebt, reason: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h4 style={{ margin: 0 }}>جدولة الأقساط</h4>
                      <button type="button" className="dbt-btn-premium dbt-btn-ghost" style={{ padding: '4px 10px' }} onClick={() => setNewDebt({...newDebt, installments: [...newDebt.installments, { amount: '', dueDate: '' }]})}>+ قسط إضافي</button>
                    </div>
                    {newDebt.installments.map((inst, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '15px', marginBottom: '10px', alignItems: 'flex-end' }}>
                        <div className="dbt-form-group" style={{ marginBottom: 0 }}>
                          <label>قيمة القسط {idx + 1}</label>
                          <input type="number" className="dbt-input" required value={inst.amount} onChange={e => { const list = [...newDebt.installments]; list[idx].amount = e.target.value; setNewDebt({...newDebt, installments: list}); }} />
                        </div>
                        <div className="dbt-form-group" style={{ marginBottom: 0 }}>
                          <label>تاريخ الاستحقاق</label>
                          <input type="date" className="dbt-input" required value={inst.dueDate} onChange={e => { const list = [...newDebt.installments]; list[idx].dueDate = e.target.value; setNewDebt({...newDebt, installments: list}); }} />
                        </div>
                        {newDebt.installments.length > 1 && (
                          <button type="button" className="dbt-action-btn" style={{ color: '#f43f5e' }} onClick={() => { const list = [...newDebt.installments]; list.splice(idx, 1); setNewDebt({...newDebt, installments: list}); }}><i className="fas fa-trash"></i></button>
                        )}
                      </div>
                    ))}
                  </div>
                </form>
              </div>
              <div className="dbt-modal-footer">
                <button type="button" className="dbt-btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" form="debtForm" className="dbt-btn-primary">حفظ وجدولة الأقساط</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {showPayModal && (
        <ModalContainer>
          <div className="dbt-modal-overlay" onClick={(e) => { if (e.target.classList.contains('dbt-modal-overlay')) setShowPayModal(false); }}>
            <div className="dbt-modal" style={{ maxWidth: '450px' }}>
              <div className="dbt-modal-header">
                <h3>تسجيل سداد قسط</h3>
                <button className="dbt-modal-close" onClick={() => setShowPayModal(false)}>✕</button>
              </div>
              <div className="dbt-modal-body">
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>الجهة: <b>{selectedDebt?.entityName}</b></div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '8px', color: 'var(--dbt-accent-green)' }}>{selectedInstallment?.amount.toLocaleString()} ج.م</div>
                </div>
                <form id="payForm" onSubmit={handlePayment}>
                  <div className="dbt-form-group">
                    <label>المبلغ المدفوع الآن</label>
                    <input type="number" className="dbt-input" required step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ fontSize: '1.5rem', fontWeight: 900, textAlign: 'center' }} />
                  </div>
                </form>
              </div>
              <div className="dbt-modal-footer">
                <button type="button" className="dbt-btn-ghost" onClick={() => setShowPayModal(false)}>إلغاء</button>
                <button type="submit" form="payForm" className="dbt-btn-primary">تأكيد السداد</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {showSettingsModal && (
        <ModalContainer>
          <div className="dbt-modal-overlay" onClick={(e) => { if (e.target.classList.contains('dbt-modal-overlay')) setShowSettingsModal(false); }}>
            <div className="dbt-modal" style={{ maxWidth: '500px' }}>
              <div className="dbt-modal-header">
                <h3>⚙️ إعدادات تذكير الأقساط</h3>
                <button className="dbt-modal-close" onClick={() => setShowSettingsModal(false)}>✕</button>
              </div>
              <div className="dbt-modal-body">
                <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>إرسال تنبيهات فورية</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--dbt-text-secondary)', marginBottom: '15px' }}>سيقوم النظام بفحص الأقساط المتأخرة وإرسال إشعارات لجميع المشرفين الآن.</p>
                  <button className="dbt-btn-premium dbt-btn-amber" onClick={async () => { try { await Api.triggerDebtReminders(); toast('تم إرسال الإشعارات', 'success'); } catch(e){ toast(e.message, 'error'); } }}>
                    <i className="fas fa-paper-plane"></i> تشغيل الفحص الآن
                  </button>
                </div>
                <div className="dbt-form-group">
                  <label>موعد تشغيل المجدول اليومي</label>
                  <input type="time" className="dbt-input" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                </div>
              </div>
              <div className="dbt-modal-footer">
                <button type="button" className="dbt-btn-ghost" onClick={() => setShowSettingsModal(false)}>إلغاء</button>
                <button className="dbt-btn-primary" onClick={async () => { const [h, m] = scheduleTime.split(':'); try { await Api.scheduleDebtReminders(parseInt(h), parseInt(m)); toast('تم التحديث', 'success'); setShowSettingsModal(false); } catch(e){ toast(e.message, 'error'); } }}>حفظ الموعد</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default DebtManagement;
