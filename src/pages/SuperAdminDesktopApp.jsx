import React, { useState } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import '../styles/pages/SuperAdminDashboard.css';

const SuperAdminDesktopApp = () => {
    const { toast: showToast } = useGlobalUI();
    const [appVersion, setAppVersion] = useState('');
    const [appNotes, setAppNotes] = useState('');
    const [appFile, setAppFile] = useState(null);
    const [uploadingApp, setUploadingApp] = useState(false);

    const handleUploadApp = async (e) => {
        e.preventDefault();
        if (!appVersion || !appFile) return;
        try {
            setUploadingApp(true);
            await Api.uploadDesktopApp(appVersion, appNotes, appFile);
            showToast('تم رفع نسخة البرنامج بنجاح', 'success');
            setAppVersion('');
            setAppNotes('');
            setAppFile(null);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setUploadingApp(false);
        }
    };

    return (
        <div className="super-admin-dashboard" style={{ padding: '24px' }}>
            <header className="sa-header">
                <div className="sa-title">
                    <h1>إصدارات برنامج الديسكتوب</h1>
                    <p>إدارة ورفع تحديثات برنامج الكاشير المحلي (Offline)</p>
                </div>
            </header>

            <section className="sa-content">
                <div className="sa-section-container" style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', direction: 'rtl' }}>
                    <h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '20px', fontFamily: 'Cairo, sans-serif' }}>
                        <i className="fas fa-laptop-code" style={{ marginLeft: '10px', color: '#4f46e5' }}></i>
                        إضافة إصدار جديد
                    </h2>
                    <form onSubmit={handleUploadApp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>رقم الإصدار (Version):</label>
                            <input 
                                type="text" 
                                value={appVersion}
                                onChange={(e) => setAppVersion(e.target.value)}
                                placeholder="مثال: v1.0.0" 
                                required
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>ملاحظات الإصدار (اختياري):</label>
                            <input 
                                type="text" 
                                value={appNotes}
                                onChange={(e) => setAppNotes(e.target.value)}
                                placeholder="ما الجديد في هذا الإصدار؟" 
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>ملف البرنامج (.exe أو .zip):</label>
                            <input 
                                type="file" 
                                onChange={(e) => setAppFile(e.target.files[0])}
                                required
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                        <div>
                            <button 
                                type="submit" 
                                disabled={uploadingApp || !appFile || !appVersion}
                                style={{ width: '100%', padding: '12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '10px' }}
                            >
                                {uploadingApp ? 'جاري الرفع...' : 'رفع الإصدار'}
                                <i className="fas fa-upload"></i>
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
};

export default SuperAdminDesktopApp;
