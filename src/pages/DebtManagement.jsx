import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';

const DebtManagement = () => {
    const { toast, confirm } = useGlobalUI();
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('RECEIVABLE'); // RECEIVABLE or PAYABLE
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [pageSize] = useState(10);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [scheduleTime, setScheduleTime] = useState('06:00');
    const [selectedDebt, setSelectedDebt] = useState(null);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [payAmount, setPayAmount] = useState('');

    // New Debt Form
    const [newDebt, setNewDebt] = useState({
        type: 'RECEIVABLE',
        entityName: '',
        entityType: 'CUSTOMER',
        entityId: null,
        totalAmount: '',
        reason: '',
        installments: [{ amount: '', dueDate: new Date().toISOString().split('T')[0] }]
    });

    const [entities, setEntities] = useState([]); // For selection
    const [loadingEntities, setLoadingEntities] = useState(false);

    const loadDebts = useCallback(async (page = 0, type = activeTab) => {
        setLoading(true);
        try {
            const res = await Api.getDebts(page, pageSize, type, statusFilter, entityTypeFilter, query);
            setDebts(res.content || []);
            setTotalPages(res.totalPages || 0);
            setTotalElements(res.totalElements || 0);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [activeTab, statusFilter, entityTypeFilter, query, pageSize, toast]);

    useEffect(() => {
        loadDebts(currentPage);
    }, [loadDebts, currentPage]);

    const handleTabChange = (type) => {
        setActiveTab(type);
        setCurrentPage(0);
    };

    const loadEntities = async (type) => {
        setLoadingEntities(true);
        try {
            if (type === 'CUSTOMER') {
                const res = await Api.getCustomers(0, 1000, '');
                setEntities(res.items || res.content || []);
            } else if (type === 'SUPPLIER') {
                const res = await Api.getSuppliers(0, 1000, '');
                setEntities(res.items || res.content || []);
            } else {
                setEntities([]);
            }
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoadingEntities(false);
        }
    };

    const handleAddInstallment = () => {
        setNewDebt({
            ...newDebt,
            installments: [...newDebt.installments, { amount: '', dueDate: '' }]
        });
    };

    const handleRemoveInstallment = (index) => {
        const list = [...newDebt.installments];
        list.splice(index, 1);
        setNewDebt({ ...newDebt, installments: list });
    };

    const handleSaveDebt = async (e) => {
        e.preventDefault();
        // Validation: Sum of installments should match total amount
        const sum = newDebt.installments.reduce((acc, curr) => acc + Number(curr.amount), 0);
        if (Math.abs(sum - Number(newDebt.totalAmount)) > 0.01) {
            toast('مجموع الأقساط يجب أن يساوي المبلغ الإجمالي للدين', 'error');
            return;
        }

        try {
            await Api.createManualDebt(newDebt);
            toast('تم تسجيل الدين وجدولة الأقساط بنجاح', 'success');
            setShowAddModal(false);
            loadDebts(currentPage);
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const openPayModal = (debt, installment) => {
        setSelectedDebt(debt);
        setSelectedInstallment(installment);
        setPayAmount(installment.amount - (installment.paidAmount || 0));
        setShowPayModal(true);
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        try {
            await Api.payDebtInstallment(selectedInstallment.id, payAmount);
            toast('تم تسجيل عملية السداد بنجاح', 'success');
            setShowPayModal(false);
            loadDebts(currentPage);
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleTriggerReminders = async () => {
        try {
            const res = await Api.triggerDebtReminders();
            toast(res?.message || 'تم إرسال الإشعارات بنجاح', 'success');
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleSaveSchedule = async (e) => {
        e.preventDefault();
        const [hourStr, minStr] = scheduleTime.split(':');
        try {
            const res = await Api.scheduleDebtReminders(parseInt(hourStr), parseInt(minStr));
            toast(res?.message || 'تم تحديث الموعد بنجاح', 'success');
            setShowSettingsModal(false);
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'PAID': return <span className="badge badge-success">تم السداد</span>;
            case 'PARTIAL': return <span className="badge badge-info">سداد جزئي</span>;
            case 'PENDING': return <span className="badge badge-warning">انتظار</span>;
            case 'OVERDUE': return <span className="badge badge-danger">متأخر</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    return (
        <div className="page-section">
            <div className="debt-page-header">
                <div className="header-title">
                    <h1 style={{ fontWeight: 200, letterSpacing: '1px' }}>إدارة الآجل والديون</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>متابعة التحصيلات، المديونيات، وجدولة الأقساط</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-ghost" onClick={() => setShowSettingsModal(true)}>
                        ⚙️ إعدادات التذكير
                    </button>
                    <button className="btn btn-primary" onClick={() => {
                        setNewDebt({ ...newDebt, type: activeTab });
                        setShowAddModal(true);
                    }}>
                        + دين يدوي جديد
                    </button>
                </div>
            </div>

            <div className="stats-grid mb-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                <StatTile 
                  id="debt_receive"
                  label="سجلات لنا (مدين)"
                  value={activeTab === 'RECEIVABLE' ? totalElements : '-'}
                  icon=""
                  defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
                />
                <StatTile 
                  id="debt_pay"
                  label="سجلات علينا (دائن)"
                  value={activeTab === 'PAYABLE' ? totalElements : '-'}
                  icon="📤"
                  defaults={{ color: 'amber', size: 'tile-wd-sm', order: 2 }}
                />
                <StatTile 
                  id="debt_new"
                  label="أقساط سددت (اليوم)"
                  value="جديد"
                  icon="📅"
                  defaults={{ color: 'emerald', size: 'tile-sq-sm', order: 3 }}
                />
                <StatTile 
                  id="debt_overdue"
                  label="أقساط متأخرة"
                  value="⚠️"
                  icon="⏰"
                  defaults={{ color: 'crimson', size: 'tile-sq-sm', order: 4 }}
                />
            </div>

            <div className="debt-tabs-container mb-3">
                <button 
                  className={`btn ${activeTab === 'RECEIVABLE' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handleTabChange('RECEIVABLE')}
                >
                    💰 لنا (تحصيلات من عملاء وغيرهم)
                </button>
                <button 
                  className={`btn ${activeTab === 'PAYABLE' ? 'btn-amber' : 'btn-ghost'}`}
                  onClick={() => handleTabChange('PAYABLE')}
                >
                    💸 علينا (سداد لموردين وغيرهم)
                </button>
            </div>

            <div className="toolbar card mb-3" style={{ padding: '15px' }}>
                <div className="debt-toolbar">
                    <div className="search-input" style={{ flex: 2 }}>
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو السبب..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <select 
                      className="form-control" 
                      style={{ flex: 1 }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">كل الحالات</option>
                        <option value="PENDING">انتظار</option>
                        <option value="PARTIAL">سداد جزئي</option>
                        <option value="PAID">تم السداد</option>
                    </select>
                    <select 
                      className="form-control" 
                      style={{ flex: 1 }}
                      value={entityTypeFilter}
                      onChange={(e) => setEntityTypeFilter(e.target.value)}
                    >
                        <option value="">كل الجهات</option>
                        <option value="CUSTOMER">عملاء</option>
                        <option value="SUPPLIER">موردين</option>
                        <option value="BANK">بنوك</option>
                        <option value="OTHER">أخرى</option>
                    </select>
                </div>
            </div>

            <div className="card">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>الجهة</th>
                                <th>النوع</th>
                                <th>المبلغ الإجمالي</th>
                                <th>المسدد</th>
                                <th>المتبقي</th>
                                <th>الحالة</th>
                                <th>المصدر / السبب</th>
                                <th style={{ textAlign: 'center' }}>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8"><Loader message="جاري جلب سجلات الديون..." /></td></tr>
                            ) : debts.length === 0 ? (
                                <tr><td colSpan="8" className="text-center" style={{ padding: '50px', color: 'var(--text-dim)' }}>لا توجد سجلات مطابقة للبحث</td></tr>
                            ) : debts.map((debt, idx) => (
                                <React.Fragment key={debt.id}>
                                    <tr style={{ animationDelay: `${idx * 0.05}s`, background: 'rgba(255,255,255,0.02)' }}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{debt.entityName}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{debt.entityType}</div>
                                        </td>
                                        <td>{debt.type === 'RECEIVABLE' ? 'لنا' : 'علينا'}</td>
                                        <td style={{ fontWeight: 600 }}>{Number(debt.totalAmount).toFixed(2)}</td>
                                        <td className="text-success">{Number(debt.paidAmount).toFixed(2)}</td>
                                        <td className="text-danger" style={{ fontWeight: 700 }}>{Number(debt.remainingAmount).toFixed(2)}</td>
                                        <td>{getStatusBadge(debt.status)}</td>
                                        <td style={{ fontSize: '0.85rem' }}>{debt.reason}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDebt(selectedDebt?.id === debt.id ? null : debt)}>
                                                {selectedDebt?.id === debt.id ? 'إغلاق الأقساط ▲' : 'عرض الأقساط ▼'}
                                            </button>
                                        </td>
                                    </tr>
                                    {selectedDebt?.id === debt.id && (
                                        <tr>
                                            <td colSpan="8" style={{ padding: '0', background: 'rgba(0,0,0,0.1)' }}>
                                                <div style={{ padding: '15px 40px' }}>
                                                    <table className="data-table small">
                                                        <thead style={{ background: 'transparent' }}>
                                                            <tr>
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
                                                                    <td style={{ fontWeight: 700 }}>{Number(inst.amount).toFixed(2)}</td>
                                                                    <td className="text-success">{Number(inst.paidAmount).toFixed(2)}</td>
                                                                    <td>{inst.paymentDate || '—'}</td>
                                                                    <td>{getStatusBadge(inst.status)}</td>
                                                                    <td>
                                                                        {inst.status !== 'PAID' && (
                                                                            <button 
                                                                              className="btn btn-emerald btn-xs" 
                                                                              onClick={() => openPayModal(debt, inst)}
                                                                            >
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
                </div>
            </div>

            {/* Add Debt Modal */}
            {ReactDOM.createPortal(
                <div className={`modal-overlay ${showAddModal ? 'active' : ''}`}>
                    <div className="modal" style={{ maxWidth: '800px', width: '90%' }}>
                        <div className="modal-header">
                            <h3>إضافة دين يدوي جديد ({activeTab === 'RECEIVABLE' ? 'لنا' : 'علينا'})</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSaveDebt}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>نوع الجهة</label>
                                        <select 
                                          className="form-control"
                                          value={newDebt.entityType}
                                          onChange={(e) => {
                                              const type = e.target.value;
                                              setNewDebt({ ...newDebt, entityType: type, entityId: null, entityName: '' });
                                              if (type === 'CUSTOMER' || type === 'SUPPLIER') loadEntities(type);
                                          }}
                                        >
                                            <option value="CUSTOMER">عميل مسجل</option>
                                            <option value="SUPPLIER">مورد مسجل</option>
                                            <option value="BANK">بنك / مؤسسة</option>
                                            <option value="OTHER">أخرى (نص حر)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>اختيار الجهة / الاسم</label>
                                        {(newDebt.entityType === 'CUSTOMER' || newDebt.entityType === 'SUPPLIER') ? (
                                            <select 
                                              className="form-control"
                                              required
                                              onChange={(e) => {
                                                  const ent = entities.find(x => x.id === Number(e.target.value));
                                                  setNewDebt({ ...newDebt, entityId: ent.id, entityName: ent.name });
                                              }}
                                            >
                                                <option value="">اختر من القائمة...</option>
                                                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                            </select>
                                        ) : (
                                            <input 
                                              type="text" 
                                              className="form-control" 
                                              placeholder="اكتب اسم الجهة هنا..." 
                                              required
                                              value={newDebt.entityName}
                                              onChange={e => setNewDebt({ ...newDebt, entityName: e.target.value })}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>المبلغ الإجمالي *</label>
                                        <input 
                                          type="number" 
                                          className="form-control" 
                                          required 
                                          value={newDebt.totalAmount}
                                          onChange={e => setNewDebt({ ...newDebt, totalAmount: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>السبب / ملاحظات</label>
                                        <input 
                                          type="text" 
                                          className="form-control" 
                                          value={newDebt.reason}
                                          onChange={e => setNewDebt({ ...newDebt, reason: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="mt-3" style={{ borderTop: '1px solid var(--border-main)', paddingTop: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <h4 style={{ margin: 0 }}>جدولة الأقساط</h4>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddInstallment}>+ قسط إضافي</button>
                                    </div>
                                    {newDebt.installments.map((inst, idx) => (
                                        <div key={idx} className="form-row mb-2" style={{ alignItems: 'flex-end' }}>
                                            <div className="form-group">
                                                <label>القسط {idx + 1}</label>
                                                <input 
                                                  type="number" 
                                                  className="form-control" 
                                                  placeholder="المبلغ" 
                                                  required
                                                  value={inst.amount}
                                                  onChange={e => {
                                                      const list = [...newDebt.installments];
                                                      list[idx].amount = e.target.value;
                                                      setNewDebt({ ...newDebt, installments: list });
                                                  }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>تاريخ الاستحقاق</label>
                                                <input 
                                                  type="date" 
                                                  className="form-control" 
                                                  required
                                                  value={inst.dueDate}
                                                  onChange={e => {
                                                      const list = [...newDebt.installments];
                                                      list[idx].dueDate = e.target.value;
                                                      setNewDebt({ ...newDebt, installments: list });
                                                  }}
                                                />
                                            </div>
                                            <div style={{ paddingBottom: '5px' }}>
                                                {newDebt.installments.length > 1 && (
                                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveInstallment(idx)}>✕</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
                                <button type="submit" className="btn btn-primary">حفظ الدين وجدولة الأقساط</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Pay Installment Modal */}
            {ReactDOM.createPortal(
                <div className={`modal-overlay ${showPayModal ? 'active' : ''}`}>
                    <div className="modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>تسجيل سداد قسط</h3>
                            <button className="modal-close" onClick={() => setShowPayModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handlePayment}>
                            <div className="modal-body">
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                    <div><strong>الجهة:</strong> {selectedDebt?.entityName}</div>
                                    <div><strong>قيمة القسط:</strong> {selectedInstallment?.amount}</div>
                                    <div><strong>المتبقي من القسط:</strong> {selectedInstallment?.amount - (selectedInstallment?.paidAmount || 0)}</div>
                                </div>
                                <div className="form-group">
                                    <label>المبلغ المدفوع الآن *</label>
                                    <input 
                                      type="number" 
                                      className="form-control" 
                                      required 
                                      step="0.01"
                                      value={payAmount}
                                      onChange={e => setPayAmount(e.target.value)}
                                    />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '10px' }}>
                                    * سيتم خصم هذا المبلغ من الخزنة (إذا كان ديناً علينا) أو إضافته إليها (إذا كان لنا).
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowPayModal(false)}>إلغاء</button>
                                <button type="submit" className="btn btn-primary">تأكيد السداد وتحديث الخزنة</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Notification Settings Modal */}
            {ReactDOM.createPortal(
                <div className={`modal-overlay ${showSettingsModal ? 'active' : ''}`}>
                    <div className="modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>⚙️ إعدادات تذكير الأقساط</h3>
                            <button className="modal-close" onClick={() => setShowSettingsModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                <h4 style={{ marginTop: 0 }}>تشغيل فوري للإشعارات</h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '10px' }}>
                                    يقوم النظام بفحص الأقساط المتأخرة وإرسال التنبيهات الآن بشكل فوري لجميع المديرين.
                                </p>
                                <button type="button" className="btn btn-warning" onClick={handleTriggerReminders}>
                                    ▶ إرسال الإشعارات الآن
                                </button>
                            </div>

                            <form onSubmit={handleSaveSchedule}>
                                <div className="form-group">
                                    <label>موعد تشغيل المجدول التلقائي</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input 
                                          type="time" 
                                          className="form-control" 
                                          required 
                                          value={scheduleTime}
                                          onChange={e => setScheduleTime(e.target.value)}
                                        />
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                                        (الافتراضي هو 06:00 صباحاً)
                                    </p>
                                </div>
                                <div className="modal-footer" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border-subtle)' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowSettingsModal(false)}>إلغاء</button>
                                    <button type="submit" className="btn btn-primary">حفظ موعد المجدول</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DebtManagement;
