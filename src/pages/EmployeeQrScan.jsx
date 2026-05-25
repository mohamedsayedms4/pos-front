import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const EmployeeQrScan = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const tenantId = searchParams.get('tenantId');
    const { toast } = useGlobalUI();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, success, error
    const [message, setMessage] = useState('');

    const user = Api._getUser();

    useEffect(() => {
        if (!user) {
            toast('يجب تسجيل الدخول لتسجيل الحضور', 'warning');
            navigate('/login');
        }
    }, [user, navigate]);

    const getCurrentPosition = () =>
        new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('GPS غير مدعوم في هذا الجهاز'));
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                err => reject(new Error('تعذّر الحصول على الموقع. يرجى تفعيل الـ GPS والسماح للمتصفح بالوصول إليه.')),
                { timeout: 10000, enableHighAccuracy: true }
            );
        });

    const handleAction = async (actionType) => {
        if (!token) {
            setMessage('رابط غير صالح. يرجى مسح الـ QR مرة أخرى.');
            setStatus('error');
            return;
        }

        setLoading(true);
        setStatus('idle');
        
        try {
            // جلب الموقع
            setMessage('جاري تحديد موقعك...');
            const pos = await getCurrentPosition();

            setMessage(actionType === 'checkIn' ? 'جاري تسجيل الحضور...' : 'جاري تسجيل الانصراف...');
            
            if (actionType === 'checkIn') {
                await Api.checkInEmployee(user.id, token, pos.latitude, pos.longitude);
                setMessage('تم تسجيل الحضور بنجاح ✅');
                toast('تم تسجيل الحضور', 'success');
            } else {
                await Api.checkOutEmployee(user.id, token, pos.latitude, pos.longitude);
                setMessage('تم تسجيل الانصراف بنجاح ✅');
                toast('تم تسجيل الانصراف', 'success');
            }
            setStatus('success');
            
            // العودة للرئيسية بعد 3 ثواني
            setTimeout(() => navigate('/'), 3000);

        } catch (err) {
            setStatus('error');
            const msg = err.message || 'حدث خطأ غير متوقع';
            if (msg.includes('موقع')) {
                setMessage('📍 ' + msg);
            } else if (msg.includes('IP')) {
                setMessage('🌐 غير مسموح بتسجيل الحضور من هذه الشبكة (تأكد أنك متصل بواي فاي الفرع)');
            } else if (msg.includes('QR')) {
                setMessage('الرمز منتهي الصلاحية. يرجى مسح الـ QR الجديد من شاشة الفرع.');
            } else {
                setMessage(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <Loader />;

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', 
            background: 'var(--bg-main)', padding: '20px', direction: 'rtl'
        }}>
            <div className="card anim-scale-in" style={{
                maxWidth: '400px', width: '100%', padding: '40px 30px', 
                textAlign: 'center', borderRadius: '24px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
            }}>
                <div style={{
                    width: '80px', height: '80px', margin: '0 auto 20px',
                    background: 'var(--bg-elevated)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.5rem'
                }}>
                    📱
                </div>

                <h2 style={{ marginBottom: '8px', fontSize: '1.4rem' }}>أهلاً، {user.name}</h2>
                <p style={{ color: 'var(--text-dim)', marginBottom: '30px', fontSize: '0.9rem' }}>
                    يرجى السماح بالوصول للموقع (GPS) والتأكد من اتصالك بشبكة الفرع قبل المتابعة.
                </p>

                {status === 'success' ? (
                    <div style={{ padding: '20px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderRadius: '12px', fontWeight: 'bold' }}>
                        {message}
                    </div>
                ) : status === 'error' ? (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '12px', marginBottom: '16px', fontSize: '0.9rem' }}>
                            {message}
                        </div>
                        <button className="btn btn-outline" onClick={() => setStatus('idle')} style={{ width: '100%' }}>
                            إعادة المحاولة
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {loading ? (
                            <div style={{ padding: '20px' }}>
                                <Loader />
                                <p style={{ marginTop: '16px', color: 'var(--color-primary)' }}>{message}</p>
                            </div>
                        ) : (
                            <>
                                <button 
                                    className="btn btn-success" 
                                    style={{ height: '54px', fontSize: '1.1rem', borderRadius: '14px', gap: '8px' }}
                                    onClick={() => handleAction('checkIn')}
                                >
                                    📍 تسجيل الحضور
                                </button>
                                <button 
                                    className="btn btn-danger" 
                                    style={{ height: '54px', fontSize: '1.1rem', borderRadius: '14px', gap: '8px' }}
                                    onClick={() => handleAction('checkOut')}
                                >
                                    🏃 تسجيل الانصراف
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeQrScan;
