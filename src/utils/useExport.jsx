import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useGlobalUI } from '../components/common/GlobalUI';
import Api, { API_BASE } from '../services/api';

/**
 * A custom hook to handle asynchronous exports.
 * Provides the export state and a trigger function, 
 * as well as a component to render the progress modal.
 */
export const useExport = () => {
    const { toast } = useGlobalUI();
    const [exportState, setExportState] = useState({
        isOpen: false,
        status: 'IDLE', // IDLE, REQUESTING, POLLING, DOWNLOADING, SUCCESS, ERROR
        progress: 0,
        stage: '',
        error: null,
        jobId: null
    });

    const pollIntervalRef = useRef(null);

    const cleanup = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    const closeExportModal = useCallback(() => {
        // Only allow closing if it's done or errored, or if user forces it
        setExportState(prev => ({ ...prev, isOpen: false }));
        cleanup();
    }, [cleanup]);

    const pollJobStatus = useCallback((jobId) => {
        setExportState(prev => ({ ...prev, status: 'POLLING', progress: 5, stage: 'في طابور الانتظار...' }));

        pollIntervalRef.current = setInterval(async () => {
            try {
                const response = await axios.get(`${API_BASE}/exports/${jobId}`, {
                    headers: {
                        'Authorization': `Bearer ${Api._getToken()}`
                    }
                });

                if (response.data && response.data.success) {
                    const job = response.data.data;
                    
                    setExportState(prev => ({
                        ...prev,
                        progress: job.progress,
                        stage: translateStage(job.stage)
                    }));

                    if (job.status === 'COMPLETED') {
                        cleanup();
                        setExportState(prev => ({ ...prev, status: 'DOWNLOADING', progress: 100, stage: 'جاري تحميل الملف...' }));
                        
                        // Trigger download
                        downloadFile(jobId);
                    } else if (job.status === 'FAILED') {
                        cleanup();
                        setExportState(prev => ({ ...prev, status: 'ERROR', error: job.errorMessage || 'حدث خطأ أثناء التصدير' }));
                        toast(job.errorMessage || 'حدث خطأ أثناء التصدير', 'error');
                    }
                }
            } catch (error) {
                console.error("Polling error:", error);
                // Optionally handle 404 (Expired) or network errors
                if (error.response && error.response.status === 404) {
                    cleanup();
                    setExportState(prev => ({ ...prev, status: 'ERROR', error: 'انتهت صلاحية الملف أو لم يتم العثور عليه' }));
                }
            }
        }, 2000); // Poll every 2 seconds
    }, [cleanup]);

    const downloadFile = async (jobId) => {
        try {
            const response = await axios.get(`${API_BASE}/exports/${jobId}/download`, {
                responseType: 'blob',
                headers: {
                    'Authorization': `Bearer ${Api._getToken()}`
                }
            });

            const contentDisposition = response.headers['content-disposition'];
            let filename = `export_${jobId}.xlsx`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch.length === 2) {
                    filename = filenameMatch[1];
                }
            } else if (response.data.type === 'application/pdf') {
                filename = `export_${jobId}.pdf`;
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            setExportState(prev => ({ ...prev, status: 'SUCCESS', isOpen: false }));
            toast("تم التصدير بنجاح!", 'success');
            
        } catch (error) {
            console.error("Download error:", error);
            setExportState(prev => ({ ...prev, status: 'ERROR', error: 'فشل في تحميل الملف النهائي' }));
            toast('فشل في تحميل الملف النهائي', 'error');
        }
    };

    const triggerExport = useCallback(async (exportType, params = {}) => {
        // Prevent overlapping requests
        if (exportState.status === 'REQUESTING' || exportState.status === 'POLLING' || exportState.status === 'DOWNLOADING') {
            return;
        }

        setExportState({
            isOpen: true,
            status: 'REQUESTING',
            progress: 0,
            stage: 'جاري طلب التصدير...',
            error: null,
            jobId: null
        });

        try {
            const response = await axios.post(`${API_BASE}/exports/request`, {
                type: exportType,
                params: params
            }, {
                headers: {
                    'Authorization': `Bearer ${Api._getToken()}`
                }
            });

            if (response.data && response.data.success) {
                const job = response.data.data;
                setExportState(prev => ({ ...prev, jobId: job.jobId }));

                if (job.status === 'COMPLETED') {
                    // Fast path: already completed
                    setExportState(prev => ({ ...prev, status: 'DOWNLOADING', progress: 100, stage: 'جاري تحميل الملف...' }));
                    downloadFile(job.jobId);
                } else if (job.status === 'FAILED') {
                    setExportState(prev => ({ ...prev, status: 'ERROR', error: job.errorMessage || 'حدث خطأ أثناء التصدير' }));
                } else {
                    // PENDING or PROCESSING -> Start polling
                    pollJobStatus(job.jobId);
                }
            } else {
                setExportState(prev => ({ ...prev, status: 'ERROR', error: 'فشل في طلب التصدير' }));
            }
        } catch (error) {
            console.error("Export request error:", error);
            const errMsg = error.response?.data?.message || error.message || 'حدث خطأ أثناء التصدير';
            setExportState(prev => ({
                ...prev,
                status: 'ERROR',
                error: errMsg
            }));
            
            // If the modal isn't open for some reason, notify via toast
            if (!exportState.isOpen) {
                toast(errMsg, 'error');
            }
        }
    }, [exportState.status, pollJobStatus]);

    return {
        exportState,
        triggerExport,
        closeExportModal
    };
};

// Simple helper to translate stage codes to Arabic
function translateStage(stage) {
    if (!stage) return 'جاري المعالجة...';
    switch (stage) {
        case 'QUEUED': return 'في طابور الانتظار...';
        case 'FETCHING_DATA': return 'جاري تجميع البيانات...';
        case 'BUILDING_FILE': return 'جاري إنشاء الملف...';
        default: return 'جاري المعالجة...';
    }
}
