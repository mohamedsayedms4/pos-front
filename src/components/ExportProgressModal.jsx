import React from 'react';
import ModalContainer from './common/ModalContainer';

const ExportProgressModal = ({ exportState, onClose }) => {
    const { isOpen, status, progress, stage, error } = exportState;

    if (!isOpen) return null;

    const isProcessing = status === 'REQUESTING' || status === 'POLLING' || status === 'DOWNLOADING';
    const isError = status === 'ERROR';
    const isSuccess = status === 'SUCCESS';

    return (
        <ModalContainer>
            <div className="modal-overlay active" style={{ zIndex: 1050 }}>
                <div className="modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
                    <div className="modal-header" style={{ justifyContent: 'center' }}>
                        <h4 style={{ margin: 0 }}>
                            {isProcessing && 'جاري تحضير التقرير...'}
                            {isError && 'خطأ في التصدير'}
                            {isSuccess && 'اكتمل التصدير'}
                        </h4>
                    </div>
                    <div className="modal-body" style={{ padding: '30px 20px' }}>
                        {isProcessing && (
                            <>
                                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '40px', color: 'var(--metro-blue)', marginBottom: '15px' }}></i>
                                <h5 className="mb-2">{stage || 'جاري المعالجة...'}</h5>
                                <div style={{ width: '100%', backgroundColor: '#e9ecef', borderRadius: '4px', height: '20px', marginTop: '15px', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ width: `${progress}%`, backgroundColor: 'var(--metro-blue)', height: '100%', transition: 'width 0.5s ease-in-out' }}></div>
                                    <span style={{ position: 'absolute', width: '100%', textAlign: 'center', left: 0, top: 0, color: progress > 50 ? '#fff' : '#000', fontSize: '12px', lineHeight: '20px' }}>{progress}%</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', marginTop: '15px', fontSize: '0.9rem', marginBottom: 0 }}>
                                    الرجاء الانتظار، قد تستغرق هذه العملية بعض الوقت حسب حجم البيانات.
                                </p>
                            </>
                        )}

                        {isError && (
                            <>
                                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '40px', color: 'var(--metro-red)', marginBottom: '15px' }}></i>
                                <h5 style={{ color: 'var(--metro-red)', margin: 0 }}>{error || 'حدث خطأ غير متوقع'}</h5>
                            </>
                        )}

                        {isSuccess && (
                            <>
                                <i className="fa-solid fa-circle-check" style={{ fontSize: '40px', color: 'var(--accent-emerald)', marginBottom: '15px' }}></i>
                                <h5 style={{ color: 'var(--accent-emerald)', margin: 0 }}>تم تحميل الملف بنجاح!</h5>
                            </>
                        )}
                    </div>
                    {(!isProcessing || isError || isSuccess) && (
                        <div className="modal-footer" style={{ justifyContent: 'center' }}>
                            <button className="btn btn-secondary" onClick={onClose}>
                                إغلاق
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ModalContainer>
    );
};

export default ExportProgressModal;
