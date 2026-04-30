import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';

const EmployeeCustody = () => {
    const { toast, confirm } = useGlobalUI();
    const [records, setRecords] = useState([]);
    const [users, setUsers] = useState([]);
    const [fixedAssets, setFixedAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        userId: '',
        assetName: '',
        referenceNumber: '',
        quantity: 1,
        estimatedValue: 0,
        conditionAtIssue: 'New',
        issueDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: '',
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (query = '') => {
        setLoading(true);
        try {
            const [custodyRes, usersRes, assetsRes] = await Promise.all([
                Api.getCustody(0, 100, query),
                Api.getUsers(0, 1000), // Get a large list of users
                Api.getFixedAssets()
            ]);
            setRecords(custodyRes.content || []);
            setUsers(usersRes.items || usersRes.content || []);
            setFixedAssets(Array.isArray(assetsRes) ? assetsRes : (assetsRes.items || assetsRes.content || []));
        } catch (err) {
            console.error(err);
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAssetSelect = (e) => {
        const assetId = e.target.value;
        if (!assetId) return;
        
        const asset = fixedAssets.find(a => a.id === parseInt(assetId));
        if (asset) {
            setFormData({
                ...formData,
                assetName: asset.name,
                referenceNumber: asset.code || '',
                estimatedValue: asset.purchasePrice || 0,
                notes: `أصل ثابت رقم: ${asset.id} | ${asset.description || ''}`
            });
            toast('تم تعبئة البيانات من سجلات الأصول الثابتة', 'info');
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        loadData(e.target.value);
    };

    const handleIssue = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                employee: { id: formData.userId }
            };
            await Api.issueCustody(data);
            toast('تم إسناد العهدة بنجاح', 'success');
            setShowForm(false);
            loadData();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleReturn = async (id) => {
        confirm('هل تم استرداد هذه العهدة بالفعل؟', async () => {
            try {
                await Api.returnCustody(id, 'تم الإرجاع عن طريق النظام');
                toast('تم تحديث الحالة', 'success');
                loadData();
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    };

    const handlePrint = (record) => {
        const printWindow = window.open('', '_blank');
        const content = `
            <html dir="rtl">
            <head>
                <title>إقرار استلام عهدة - ${record.employee.name}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: bold; margin: 10px 0; }
                    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .field { border-bottom: 1px dotted #ccc; padding: 10px 0; }
                    .label { font-weight: bold; color: #666; width: 120px; display: inline-block; }
                    .asset-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
                    .asset-table th, .asset-table td { border: 1px solid #ddd; padding: 12px; text-align: center; }
                    .asset-table th { background-color: #f9f9f9; }
                    .declaration { margin: 40px 0; line-height: 1.6; border: 1px solid #eee; padding: 20px; border-radius: 8px; }
                    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 100px; margin-top: 60px; }
                    .sig-box { text-align: center; }
                    .sig-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 10px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">نموذج إقرار استلام عهدة شخصية</div>
                    <div>${new Date().toLocaleDateString('ar-EG')}</div>
                </div>

                <div class="details-grid">
                    <div class="field"><span class="label">اسم الموظف:</span> ${record.employee.name}</div>
                    <div class="field"><span class="label">الرقم الوظيفي:</span> ${record.employee.id}</div>
                    <div class="field"><span class="label">البريد الإلكتروني:</span> ${record.employee.email}</div>
                    <div class="field"><span class="label">تاريخ الاستلام:</span> ${record.issueDate}</div>
                </div>

                <table class="asset-table">
                    <thead>
                        <tr>
                            <th>مبيان العهدة</th>
                            <th>العدد</th>
                            <th>القيمة التقديرية</th>
                            <th>الحالة</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${record.assetName}</td>
                            <td>${record.quantity}</td>
                            <td>${record.estimatedValue || '—'} EGP</td>
                            <td>${record.conditionAtIssue || '—'}</td>
                            <td>${record.referenceNumber ? 'رقم مرجعي: ' + record.referenceNumber : ''}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="declaration">
                    <strong>إقرار استلام:</strong><br/>
                    أقر أنا المسمى أعلاه بأنني قد استلمت العهدة الموضحة في الجدول أعلاه، وأتعهد بالمحافظة عليها واستخدامها في أغراض العمل المخصصة لها، كما أتعهد بإعادتها للشركة فور طلبها أو عند ترك العمل، وفي حالة فقدانها أو إتلافها بسبب سوء الاستخدام أتحمل كافة التبعات المالية المترتبة على ذلك.
                </div>

                <div class="signatures">
                    <div class="sig-box">
                        <div>توقيع المُستلم (الموظف)</div>
                        <div class="sig-line"></div>
                    </div>
                    <div class="sig-box">
                        <div>توقيع المُسلم (المسؤول)</div>
                        <div class="sig-line"></div>
                    </div>
                </div>

                <div class="no-print" style="margin-top: 50px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">تأكيد الطباعة</button>
                </div>
            </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const handleDelete = async (id) => {
        confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟', async () => {
            try {
                await Api.deleteCustody(id);
                toast('تم الحذف بنجاح', 'success');
                loadData();
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ISSUED': return <span className="badge badge-primary">قيد العهدة</span>;
            case 'RETURNED': return <span className="badge badge-success">تم الإرجاع</span>;
            case 'DAMAGED': return <span className="badge badge-danger">تالفة</span>;
            case 'LOST': return <span className="badge badge-neutral">مفقودة</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    return (
        <div className="page-section">
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3>🛡️ إدارة العهد الشخصية</h3>
                        <p className="text-muted">متابعة الممتلكات المسلمة للموظفين (أدوات، أجهزة، سيارات)</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="بحث عن موظف أو أصل..." 
                            value={searchTerm}
                            onChange={handleSearch}
                            style={{ width: '250px' }}
                        />
                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ إسناد عهدة جديدة</button>
                    </div>
                </div>
                <div className="card-body no-padding">
                    {loading ? <Loader /> : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>الموظف</th>
                                        <th>البيان (الأصل)</th>
                                        <th>الرقم المرجعي</th>
                                        <th>الكمية</th>
                                        <th>تاريخ الاستلام</th>
                                        <th>الحالة</th>
                                        <th>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map(r => (
                                        <tr key={r.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="avatar-sm">{r.employee.name.charAt(0)}</div>
                                                    <div>
                                                        <strong>{r.employee.name}</strong>
                                                        <br/><small>{r.employee.email}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><strong>{r.assetName}</strong></td>
                                            <td><code>{r.referenceNumber || '—'}</code></td>
                                            <td>{r.quantity}</td>
                                            <td>{r.issueDate}</td>
                                            <td>{getStatusBadge(r.status)}</td>
                                            <td>
                                                <div className="table-actions">
                                                    {r.status === 'ISSUED' && (
                                                        <button className="btn btn-sm btn-ghost" onClick={() => handleReturn(r.id)}>🔄 إرجاع</button>
                                                    )}
                                                    <button className="btn btn-sm btn-ghost" onClick={() => handlePrint(r)}>🖨️ طباعة</button>
                                                    <button className="btn btn-sm btn-ghost text-danger" onClick={() => handleDelete(r.id)}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {records.length === 0 && (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>لا توجد سجلات عهدة حالياً</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showForm && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowForm(false); }}>
                        <div className="modal" style={{ maxWidth: '600px' }}>
                            <div className="modal-header">
                                <h3>إسناد عهدة جديدة لموظف</h3>
                                <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <form id="custodyForm" onSubmit={handleIssue}>
                                    <div className="form-group" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ color: '#1e293b', fontWeight: 'bold' }}>🔗 ربط بأصل ثابت (اختياري)</label>
                                        <select className="form-control" onChange={handleAssetSelect} style={{ borderColor: '#cbd5e1' }}>
                                            <option value="">-- اختر من قائمة الأصول الثابتة --</option>
                                            {fixedAssets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.assetCode || a.serialNumber})</option>)}
                                        </select>
                                        <small className="text-muted">سيؤدي اختيار أصل إلى تعبئة البيانات أدناه تلقائياً</small>
                                    </div>
                                    <div style={{ margin: '30px 0 20px 0', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                                        <span style={{ position: 'absolute', top: '-10px', right: '15px', background: 'white', padding: '0 10px', fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>
                                            تفاصيل العهدة (قابلة للتعديل يدوياً ✍️)
                                        </span>
                                    </div>
                                    <div className="form-group">
                                        <label>الموظف المستلم</label>
                                        <select className="form-control" value={formData.userId} onChange={e => setFormData({ ...formData, userId: e.target.value })} required>
                                            <option value="">-- اختر الموظف --</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>البيان (اسم العهدة)</label>
                                        <input className="form-control" placeholder="مثال: لابتوب ديل، سيارة تويوتا..." value={formData.assetName} onChange={e => setFormData({ ...formData, assetName: e.target.value })} required />
                                    </div>
                                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label>الرقم التسلسلي / المرجعي</label>
                                            <input className="form-control" value={formData.referenceNumber} onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })} />
                                        </div>
                                        <div>
                                            <label>الكمية</label>
                                            <input type="number" className="form-control" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} required />
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label>الحالة عند الاستلام</label>
                                            <select className="form-control" value={formData.conditionAtIssue} onChange={e => setFormData({ ...formData, conditionAtIssue: e.target.value })}>
                                                <option value="New">جديد</option>
                                                <option value="Excellent">ممتاز</option>
                                                <option value="Good">جيد</option>
                                                <option value="Fair">مستعمل</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label>القيمة التقديرية (EGP)</label>
                                            <input type="number" className="form-control" value={formData.estimatedValue} onChange={e => setFormData({ ...formData, estimatedValue: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>ملاحظات إضافية</label>
                                        <textarea className="form-control" rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" form="custodyForm" className="btn btn-primary">حفظ وإصدار إقرار استلام</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default EmployeeCustody;
