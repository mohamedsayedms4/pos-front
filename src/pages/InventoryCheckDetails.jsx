import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    getInventoryCheck, 
    updateInventoryCheckItems, 
    approveInventoryCheck,
    submitInventoryCheck,
    rejectInventoryCheck
} from '../services/inventoryCheckApi';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';

const InventoryCheckDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useGlobalUI();
    
    const [check, setCheck] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);    
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);    
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);    
    const [items, setItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const barcodeInputRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const res = await getInventoryCheck(id);
            const data = res.data;
            setCheck(data);
            setItems(data.items.map(i => ({
                ...i,
                physicalQuantity: i.physicalQuantity !== null ? i.physicalQuantity : ''
            })));
        } catch (error) {
            toast('فشل في جلب تفاصيل الجرد', 'error');
            navigate('/inventory-checks');
        } finally {
            setLoading(false);
        }
    };

    const handleQuantityChange = (identifier, val) => {
        setItems(items.map(item => {
            return item.id === identifier ? { ...item, physicalQuantity: val } : item;
        }));
    };

    const handleBarcodeScan = (e) => {
        if (e.key === 'Enter') {
            const code = searchQuery.trim();
            if (code) {
                const isTargetAsset = check?.target === 'FIXED_ASSET';
                const itemIdx = items.findIndex(i => isTargetAsset ? i.fixedAssetCode === code : i.productCode === code);
                if (itemIdx >= 0) {
                    const newItems = [...items];
                    let currentQty = parseFloat(newItems[itemIdx].physicalQuantity);
                    if (isNaN(currentQty)) currentQty = 0;
                    
                    newItems[itemIdx].physicalQuantity = currentQty + 1;
                    setItems(newItems);
                    const itemName = isTargetAsset ? newItems[itemIdx].fixedAssetName : newItems[itemIdx].productName;
                    toast(`تم تسجيل: ${itemName}`, 'success');
                } else {
                    toast('العنصر غير موجود في هذه القائمة', 'error');
                }
                setSearchQuery('');
            }
        }
    };

    const saveDraft = async () => {
        setSaving(true);
        try {
            const payload = {
                items: items.map(i => ({
                    productId: check?.target === 'FIXED_ASSET' ? i.fixedAssetId : i.productId, // Use fixedAssetId as generic itemId for backend
                    physicalQuantity: i.physicalQuantity === '' ? null : parseFloat(i.physicalQuantity),
                    reason: i.reason || ''
                })).filter(i => i.physicalQuantity !== null && !isNaN(i.physicalQuantity))
            };

            await updateInventoryCheckItems(id, payload);
            toast('تم حفظ المسودة بنجاح', 'success');
            fetchData();
        } catch (error) {
            toast(error?.response?.data?.message || 'خطأ أثناء الحفظ', 'error');
        } finally {
            setSaving(false);
        }
    };

    const submitCheck = async () => {
        setShowSubmitConfirm(false);
        setSaving(true);
        try {
            const payload = {
                items: items.map(i => ({
                    productId: check?.target === 'FIXED_ASSET' ? i.fixedAssetId : i.productId,
                    physicalQuantity: i.physicalQuantity === '' ? null : parseFloat(i.physicalQuantity),
                    reason: i.reason || ''
                })).filter(i => i.physicalQuantity !== null && !isNaN(i.physicalQuantity))
            };
            await updateInventoryCheckItems(id, payload);
            await submitInventoryCheck(id);
            toast('تم إرسال الجرد للاعتماد بنجاح', 'success');
            fetchData();
        } catch (error) {
            toast(error?.response?.data?.message || 'خطأ أثناء الإرسال للاعتماد', 'error');
        } finally {
            setSaving(false);
        }
    };

    const rejectCheck = async () => {
        setShowRejectConfirm(false);
        setSaving(true);
        try {
            await rejectInventoryCheck(id);
            toast('تم رفض الجرد وإعادته للمسودة', 'success');
            fetchData();
        } catch (error) {
            toast(error?.response?.data?.message || 'خطأ أثناء الرفض', 'error');
        } finally {
            setSaving(false);
        }
    };

    const approveCheck = async () => {
        setShowApproveConfirm(false);
        setSaving(true);
        try {
            const payload = {
                items: items.map(i => ({
                    productId: check?.target === 'FIXED_ASSET' ? i.fixedAssetId : i.productId,
                    physicalQuantity: i.physicalQuantity === '' ? null : parseFloat(i.physicalQuantity),
                    reason: i.reason || ''
                })).filter(i => i.physicalQuantity !== null && !isNaN(i.physicalQuantity))
            };
            await updateInventoryCheckItems(id, payload);
            await approveInventoryCheck(id);
            toast('تم اعتماد الجرد وتعديل المخزون بنجاح', 'success');
            fetchData();
        } catch (error) {
            toast(error?.response?.data?.message || 'خطأ أثناء الاعتماد', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="page-section"><Loader message="جاري التحميل..." /></div>;
    if (!check) return null;

    const isApprover = Api.can('INVENTORY_APPROVE');
    const canCreate = Api.can('INVENTORY_CREATE');
    const isDraft = check.status === 'DRAFT';
    const isPending = check.status === 'PENDING_APPROVAL';
    const isEditable = (isDraft && canCreate) || (isPending && isApprover);
    const isTargetAsset = check.target === 'FIXED_ASSET';
    const displayedItems = items.filter(i => {
        const name = isTargetAsset ? i.fixedAssetName : i.productName;
        const code = isTargetAsset ? i.fixedAssetCode : i.productCode;
        return (name && name.includes(searchQuery)) || (code && code.includes(searchQuery));
    });

    return (
        <div className="page-section" dir="rtl">
            <div className="card mb-4" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0 }}>جرد رقم: {check.checkNumber}</h2>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>
                            الموقع: {check.branchName || check.warehouseName} | 
                            تاريخ البدء: {new Date(check.startedAt).toLocaleString('ar-EG')}
                        </div>
                    </div>
                    <div>
                        <span className={`badge ${check.status === 'COMPLETED' ? 'badge-success' : check.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '1.1rem', padding: '10px 15px' }}>
                            {check.status}
                        </span>
                    </div>
                </div>
            </div>

            {isEditable && (
                <div className="card mb-4" style={{ padding: '20px', background: 'var(--bg-hover)' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <div className="search-input" style={{ position: 'relative', width: '100%' }}>
                                <input 
                                    ref={barcodeInputRef}
                                    type="text"
                                    className="form-control"
                                    style={{ paddingRight: '40px', fontSize: '1.1rem', height: '50px' }}
                                    placeholder="امسح الباركود أو ابحث باسم المنتج..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleBarcodeScan}
                                />
                                <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {isEditable && (
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={saveDraft} 
                                    disabled={saving}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', 
                                        padding: '12px 24px', fontSize: '1.05rem', 
                                        borderRadius: '8px', fontWeight: 'bold'
                                    }}
                                >
                                    💾 حفظ مسودة
                                </button>
                            )}

                            {isDraft && canCreate && (
                                <button 
                                    className="btn btn-primary" 
                                    onClick={() => setShowSubmitConfirm(true)} 
                                    disabled={saving} 
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '8px', 
                                        padding: '12px 24px', fontSize: '1.05rem', 
                                        borderRadius: '8px', fontWeight: 'bold'
                                    }}
                                >
                                    📩 إرسال للاعتماد
                                </button>
                            )}

                            {isPending && isApprover && (
                                <>
                                    <button 
                                        className="btn btn-danger" 
                                        onClick={() => setShowRejectConfirm(true)} 
                                        disabled={saving} 
                                        style={{ 
                                            background: 'var(--metro-red)', borderColor: 'var(--metro-red)',
                                            display: 'flex', alignItems: 'center', gap: '8px', 
                                            padding: '12px 24px', fontSize: '1.05rem', 
                                            borderRadius: '8px', fontWeight: 'bold', color: '#fff'
                                        }}
                                    >
                                        ❌ رفض للمسودة
                                    </button>
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={() => setShowApproveConfirm(true)} 
                                        disabled={saving} 
                                        style={{ 
                                            background: 'var(--metro-green)', borderColor: 'var(--metro-green)',
                                            display: 'flex', alignItems: 'center', gap: '8px', 
                                            padding: '12px 24px', fontSize: '1.05rem', 
                                            borderRadius: '8px', fontWeight: 'bold', color: '#fff'
                                        }}
                                    >
                                        ✅ اعتماد وإنهاء الجرد
                                    </button>
                                </>
                            )}
                            {isPending && !isApprover && (
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold', alignSelf: 'center' }}>
                                    ⏳ في انتظار الاعتماد
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>{isTargetAsset ? 'كود الأصل' : 'كود المنتج'}</th>
                                    <th>{isTargetAsset ? 'اسم الأصل الثابت' : 'اسم المنتج'}</th>
                                    <th style={{ width: '250px' }}>الكمية الفعلية (بالمخزن)</th>
                                    {check.status === 'COMPLETED' && (
                                        <>
                                            <th>الكمية بالنظام</th>
                                            <th>الفارق (العجز/الزيادة)</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {displayedItems.map((item) => {
                                    const id = isTargetAsset ? item.fixedAssetId : item.productId;
                                    const code = isTargetAsset ? item.fixedAssetCode : item.productCode;
                                    const name = isTargetAsset ? item.fixedAssetName : item.productName;
                                    return (
                                    <tr key={item.id} style={{ background: item.physicalQuantity !== '' && isEditable ? 'rgba(0,255,0,0.05)' : 'transparent' }}>
                                        <td><code>{code || '-'}</code></td>
                                        <td><strong>{name}</strong></td>
                                        <td>
                                            {isEditable ? (
                                                <input 
                                                    type="number"
                                                    step="any"
                                                    className="form-control"
                                                    value={item.physicalQuantity}
                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                    placeholder="أدخل الكمية..."
                                                    style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', height: '45px' }}
                                                />
                                            ) : (
                                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{item.physicalQuantity}</span>
                                            )}
                                        </td>
                                        {check.status === 'COMPLETED' && (
                                            <>
                                                <td>{item.systemQuantity}</td>
                                                <td style={{ 
                                                    color: item.variance < 0 ? 'var(--metro-red)' : item.variance > 0 ? 'var(--metro-blue)' : 'var(--metro-green)',
                                                    fontWeight: 'bold',
                                                    fontSize: '1.1rem'
                                                }}>
                                                    {item.variance > 0 ? '+' : ''}{item.variance}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                    );
                                })}
                                {displayedItems.length === 0 && (
                                    <tr>
                                        <td colSpan={check.status === 'COMPLETED' ? 5 : 3} style={{ textAlign: 'center', padding: '30px' }}>
                                            لا توجد منتجات تطابق البحث
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showApproveConfirm && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.className.includes('modal-overlay')) setShowApproveConfirm(false) }}>
                        <div className="modal" style={{ maxWidth: '450px', width: '90%' }}>
                            <div className="modal-header">
                                <h3>⚠️ تأكيد الاعتماد</h3>
                                <button className="modal-close" onClick={() => setShowApproveConfirm(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <p style={{ fontSize: '1.1rem', lineHeight: '1.8', margin: 0 }}>
                                    هل أنت متأكد من اعتماد الجرد؟<br/><br/>
                                    <strong>ملاحظة هامة:</strong> سيؤدي ذلك إلى تعديل المخزون الفعلي بالسيستم وتسجيل أي عجز أو زيادة في حسابات الأرباح والخسائر ولن يمكنك التعديل بعد الاعتماد.
                                </p>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button className="btn btn-secondary" onClick={() => setShowApproveConfirm(false)} style={{ padding: '10px 20px', borderRadius: '8px' }}>إلغاء</button>
                                <button className="btn btn-primary" onClick={approveCheck} style={{ background: 'var(--metro-green)', borderColor: 'var(--metro-green)', padding: '10px 20px', borderRadius: '8px', color: '#fff' }}>
                                    نعم، تأكيد الاعتماد
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}

            {showSubmitConfirm && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.className.includes('modal-overlay')) setShowSubmitConfirm(false) }}>
                        <div className="modal" style={{ maxWidth: '450px', width: '90%' }}>
                            <div className="modal-header">
                                <h3>📩 إرسال للاعتماد</h3>
                                <button className="modal-close" onClick={() => setShowSubmitConfirm(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <p style={{ fontSize: '1.1rem', lineHeight: '1.8', margin: 0 }}>
                                    هل أنت متأكد من إرسال الجرد للاعتماد؟<br/><br/>
                                    <strong>ملاحظة:</strong> لن تتمكن من تعديل الكميات بعد الإرسال، وسينتقل الجرد إلى الإدارة لمراجعته واعتماده.
                                </p>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button className="btn btn-secondary" onClick={() => setShowSubmitConfirm(false)} style={{ padding: '10px 20px', borderRadius: '8px' }}>إلغاء</button>
                                <button className="btn btn-primary" onClick={submitCheck} style={{ padding: '10px 20px', borderRadius: '8px' }}>
                                    نعم، إرسال الجرد
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}

            {showRejectConfirm && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.className.includes('modal-overlay')) setShowRejectConfirm(false) }}>
                        <div className="modal" style={{ maxWidth: '450px', width: '90%' }}>
                            <div className="modal-header">
                                <h3>❌ رفض الجرد</h3>
                                <button className="modal-close" onClick={() => setShowRejectConfirm(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <p style={{ fontSize: '1.1rem', lineHeight: '1.8', margin: 0 }}>
                                    هل أنت متأكد من رفض الجرد؟<br/><br/>
                                    <strong>ملاحظة:</strong> سيتم إعادة الجرد كمسودة ليتمكن الموظف من تعديل الكميات وتصحيحها قبل الإرسال مرة أخرى.
                                </p>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button className="btn btn-secondary" onClick={() => setShowRejectConfirm(false)} style={{ padding: '10px 20px', borderRadius: '8px' }}>إلغاء</button>
                                <button className="btn btn-danger" onClick={rejectCheck} style={{ background: 'var(--metro-red)', borderColor: 'var(--metro-red)', padding: '10px 20px', borderRadius: '8px', color: '#fff' }}>
                                    نعم، رفض الجرد
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default InventoryCheckDetails;
