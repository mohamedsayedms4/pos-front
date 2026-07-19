import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import ThermalReceipt from '../components/common/ThermalReceipt';
import { useGlobalUI } from '../components/common/GlobalUI';
import '../styles/pages/ReturnsPremium.css'; // Reusing styles

const CreditNotes = () => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeNote, setActiveNote] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showPrint, setShowPrint] = useState(false);
    const [printData, setPrintData] = useState(null);
    const { toast } = useGlobalUI();
    const isAdmin = Api.isAdminOrBranchManager();

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const pageSize = 10;

    useEffect(() => {
        loadNotes(currentPage, pageSize, searchTerm);
    }, [currentPage, searchTerm]);

    const loadNotes = async (page = 0, size = 10, query = '') => {
        setLoading(true);
        try {
            const res = await Api.getReturns(page, size, query); // Credit Notes are conceptually Sales Returns
            setNotes(res.items || res.content || []);
            setTotalPages(res.totalPages || 0);
            setTotalElements(res.totalItems || res.totalElements || 0);
            setCurrentPage(res.currentPage ?? res.number ?? 0);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const openDetails = (note) => {
        setActiveNote(note);
        setShowDetails(true);
    };

    const handlePrint = (note) => {
        const data = {
            ...note,
            invoiceNumber: note.returnNumber.replace('RET', 'CN'),
            totalAmount: note.totalRefund,
            customerName: 'مرتجع مبيعات',
            items: note.items.map(i => ({
                ...i,
                productName: i.productName,
                quantity: i.quantity,
                unitPrice: i.unitPrice
            }))
        };
        setPrintData(data);
        setShowPrint(true);
        setTimeout(() => {
            window.print();
            setShowPrint(false);
        }, 500);
    };

    return (
        <div className="returns-container">
            <div className="ret-header-row">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="ret-breadcrumbs">
                        <Link to="/dashboard">الرئيسية</Link> / <span>إشعارات دائنة</span>
                    </div>
                    <h1>إشعارات دائنة (Credit Notes)</h1>
                </div>
                <div className="ret-header-actions">
                    <button className="ret-btn-premium ret-btn-outline" onClick={() => toast('قريباً', 'info')}>
                        <i className="fas fa-file-pdf"></i> تصدير الكل
                    </button>
                </div>
            </div>

            <div className="ret-toolbar-card">
                <div className="ret-search-box" style={{ width: '100%' }}>
                    <i className="fas fa-search"></i>
                    <input 
                        type="text" 
                        placeholder="بحث برقم الإشعار أو الفاتورة..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
            </div>

            <div className="ret-table-card">
                <div className="ret-table-container">
                    {loading && notes.length === 0 ? (
                        <div style={{ padding: '40px' }}><Loader message="جاري تحميل الإشعارات..." /></div>
                    ) : notes.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <h3>لا توجد إشعارات دائنة</h3>
                        </div>
                    ) : (
                        <table className="ret-table">
                            <thead>
                                <tr>
                                    <th>رقم الإشعار</th>
                                    <th>التاريخ</th>
                                    <th>رقم الفاتورة الأصلية</th>
                                    <th>المبلغ الدائن</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notes.map((n) => (
                                    <tr key={n.id}>
                                        <td>
                                            <div style={{ fontWeight: 800, color: '#6366f1' }}>{n.returnNumber.replace('RET', 'CN')}</div>
                                        </td>
                                        <td>{new Date(n.returnDate).toLocaleDateString('ar-EG')}</td>
                                        <td>{n.invoiceNumber}</td>
                                        <td>
                                            <div style={{ fontWeight: 800 }}>{Number(n.totalRefund).toLocaleString()} ج.م</div>
                                        </td>
                                        <td>
                                            <div className="ret-actions">
                                                <button className="ret-action-btn" onClick={() => openDetails(n)} title="تفاصيل"><i className="fas fa-eye"></i></button>
                                                <button className="ret-action-btn" onClick={() => handlePrint(n)} title="طباعة"><i className="fas fa-print"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showDetails && activeNote && (
                <ModalContainer>
                    <div className="ret-modal-overlay" onClick={() => setShowDetails(false)}>
                        <div className="ret-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                            <div className="ret-modal-header">
                                <h3>إشعار دائن رقم: {activeNote.returnNumber.replace('RET', 'CN')}</h3>
                                <button className="ret-modal-close" onClick={() => setShowDetails(false)}><i className="fa-solid fa-times"></i></button>
                            </div>
                            <div className="ret-modal-body">
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                                    <p><strong>الفاتورة المرجعية:</strong> {activeNote.invoiceNumber}</p>
                                    <p><strong>التاريخ:</strong> {new Date(activeNote.returnDate).toLocaleString('ar-EG')}</p>
                                    <p><strong>الملاحظات:</strong> {activeNote.notes || '---'}</p>
                                </div>
                                <table className="ret-table">
                                    <thead>
                                        <tr>
                                            <th>الصنف</th>
                                            <th>الكمية</th>
                                            <th>الإجمالي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeNote.items?.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.productName}</td>
                                                <td>{item.quantity} {item.unitName}</td>
                                                <td>{Number(item.totalPrice).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="ret-modal-footer">
                                <div style={{ marginLeft: 'auto' }}>
                                    <strong>الإجمالي: {Number(activeNote.totalRefund).toLocaleString()} ج.م</strong>
                                </div>
                                <button className="ret-btn-primary" style={{ background: '#6366f1' }} onClick={() => handlePrint(activeNote)}>
                                    طباعة الإشعار
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}

            {showPrint && printData && (
                <div style={{ display: 'none' }}>
                    <ThermalReceipt invoice={printData} />
                </div>
            )}
        </div>
    );
};

export default CreditNotes;
