import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import '../styles/pages/SuperAdminWhatsApp.css';

const SuperAdminWhatsApp = () => {
    const [status, setStatus] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast, confirm } = useGlobalUI();

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const data = await Api.getWhatsAppStatus();
            setStatus(data);
            
            // If instance exists but not connected, try fetching QR
            if (data?.instance?.state !== 'open') {
                fetchQrCode();
            }
        } catch (error) {
            toast('تعذر جلب حالة الاتصال: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchQrCode = async () => {
        try {
            const data = await Api.getWhatsAppQrCode();
            if (data?.qrcode?.base64) {
                setQrCode(data.qrcode.base64);
            } else if (data?.base64) {
                setQrCode(data.base64);
            }
        } catch (error) {
            console.error('QR fetch error', error);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleLogout = async () => {
        confirm('هل أنت متأكد من تسجيل الخروج من الواتساب؟ ستحتاج لمسح QR جديد لربطه مجدداً.', async () => {
            try {
                setLoading(true);
                await Api.logoutWhatsApp();
                toast('تم تسجيل الخروج بنجاح', 'success');
                setQrCode(null);
                setTimeout(fetchStatus, 2000);
            } catch (error) {
                toast('فشل في تسجيل الخروج: ' + error.message, 'error');
            } finally {
                setLoading(false);
            }
        });
    };

    const isConnected = status?.instance?.state === 'open';

    return (
        <div className="sa-whatsapp-page">
            <header className="sa-header">
                <div className="sa-title">
                    <h1>إدارة بوابة الواتساب</h1>
                    <p>ربط الواتساب الخاص بالمنصة لإرسال الـ OTP والإشعارات (Evolution API)</p>
                </div>
                <button className="btn btn-primary" onClick={fetchStatus} disabled={loading}>
                    <i className="fas fa-sync-alt"></i> تحديث الحالة
                </button>
            </header>

            <section className="sa-content">
                <div className="wa-card">
                    <div className="wa-card-header">
                        <h2>حالة الاتصال</h2>
                        {loading ? (
                            <span className="badge badge-warning">جاري التحميل...</span>
                        ) : isConnected ? (
                            <span className="badge badge-success">متصل</span>
                        ) : (
                            <span className="badge badge-danger">غير متصل</span>
                        )}
                    </div>

                    <div className="wa-card-body">
                        {loading ? (
                            <div className="loading-state">جاري التحميل...</div>
                        ) : isConnected ? (
                            <div className="connected-state">
                                <i className="fab fa-whatsapp success-icon"></i>
                                <h3>الواتساب متصل ويعمل بشكل صحيح!</h3>
                                <p>رقم الهاتف المربوط: {status?.instance?.owner || 'غير معروف'}</p>
                                <button className="btn btn-danger mt-3" onClick={handleLogout}>
                                    <i className="fas fa-sign-out-alt"></i> تسجيل الخروج
                                </button>
                            </div>
                        ) : (
                            <div className="qr-state">
                                <h3>امسح الـ QR Code التالي لربط الواتساب</h3>
                                <p>افتح تطبيق واتساب على هاتفك > الأجهزة المرتبطة > ربط جهاز جديد</p>
                                
                                {qrCode ? (
                                    <div className="qr-container">
                                        <img src={qrCode} alt="WhatsApp QR Code" />
                                    </div>
                                ) : (
                                    <div className="no-qr">
                                        <p>لا يوجد QR Code متاح حالياً. يرجى التأكد من عمل السيرفر.</p>
                                        <button className="btn btn-secondary mt-2" onClick={fetchQrCode}>
                                            <i className="fas fa-qrcode"></i> جلب QR Code
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default SuperAdminWhatsApp;
