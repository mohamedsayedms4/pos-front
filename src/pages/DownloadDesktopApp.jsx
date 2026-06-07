import React, { useState, useEffect } from 'react';
import Api from '../services/api';

const DownloadDesktopApp = () => {
    const [latestApp, setLatestApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLatestApp = async () => {
            try {
                setLoading(true);
                const appData = await Api.getLatestDesktopApp();
                setLatestApp(appData);
            } catch (err) {
                setError('فشل في جلب أحدث إصدار لتطبيق الديسكتوب');
            } finally {
                setLoading(false);
            }
        };
        fetchLatestApp();
    }, []);

    if (loading) {
        return <div className="loading-container">جاري التحميل...</div>;
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'غير محدد';
        try {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? 'غير محدد' : date.toLocaleDateString('ar-EG');
        } catch {
            return 'غير محدد';
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>برنامج الديسكتوب (أوفلاين)</h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem' }}>قم بتحميل أحدث إصدار من برنامج الكاشير للعمل بدون إنترنت</p>
            </header>

            <section>
                <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '4rem', color: '#10b981', marginBottom: '1rem' }}>
                        <i className="fas fa-desktop"></i>
                    </div>
                    {latestApp ? (
                        <>
                            <h2 style={{ color: '#0f172a', marginBottom: '1rem' }}>الإصدار {latestApp.version} متاح الآن</h2>
                            {latestApp.releaseNotes && (
                                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155', marginBottom: '2rem', textAlign: 'right' }}>
                                    <h4 style={{ color: '#0f172a', marginBottom: '0.5rem', fontWeight: 'bold' }}>ملاحظات الإصدار:</h4>
                                    <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.6' }}>{latestApp.releaseNotes}</p>
                                </div>
                            )}
                            <a 
                                href={latestApp.downloadUrl} 
                                download 
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '1rem 2.5rem', fontSize: '1.2rem', borderRadius: '8px', background: '#10b981', color: '#fff', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                            >
                                تحميل التطبيق <i className="fas fa-download"></i>
                            </a>
                            <p style={{ marginTop: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                                تاريخ الإصدار: {formatDate(latestApp.uploadDate || latestApp.createdAt)}
                            </p>
                        </>
                    ) : (
                        <div>
                            <h2 style={{ color: '#0f172a', marginBottom: '1rem' }}>لا يوجد إصدار متاح حالياً</h2>
                            <p style={{ color: '#64748b' }}>يرجى العودة لاحقاً أو التواصل مع الدعم الفني.</p>
                        </div>
                    )}
                    {error && <div style={{ marginTop: '1rem', color: '#ef4444', background: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>{error}</div>}
                </div>
            </section>
        </div>
    );
};

export default DownloadDesktopApp;
