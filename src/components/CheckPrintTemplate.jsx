import React from 'react';

const CheckPrintTemplate = ({ check }) => {
    if (!check) return null;

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return {
            day: d.getDate().toString().padStart(2, '0'),
            month: (d.getMonth() + 1).toString().padStart(2, '0'),
            year: d.getFullYear().toString()
        };
    };

    const date = formatDate(check.dueDate);

    return (
        <div className="check-print-container" style={{
            width: '210mm',
            height: '95mm',
            padding: '20mm',
            position: 'relative',
            backgroundColor: 'white',
            color: 'black',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: '14px',
            direction: 'ltr',
            border: '1px dashed #ccc'
        }}>
            {/* Date - Top Right */}
            <div style={{ position: 'absolute', top: '15mm', right: '30mm', display: 'flex', gap: '5mm', fontSize: '18px', fontWeight: 'bold' }}>
                <span>{date.day}</span>
                <span>{date.month}</span>
                <span>{date.year}</span>
            </div>

            {/* Beneficiary */}
            <div style={{ position: 'absolute', top: '35mm', left: '45mm', fontSize: '18px', fontWeight: 'bold' }}>
                {check.beneficiary}
            </div>

            {/* Amount in Numbers */}
            <div style={{ position: 'absolute', top: '45mm', right: '25mm', fontSize: '20px', fontWeight: 'bold' }}>
                #{check.amount.toLocaleString()}#
            </div>

            {/* Amount in Words (Placeholder for now) */}
            <div style={{ position: 'absolute', top: '48mm', left: '45mm', fontSize: '14px', maxWidth: '120mm' }}>
                فقط وقدره {check.amount.toLocaleString()} جنيهاً مصرياً لا غير
            </div>

            {/* Check Number for Reference */}
            <div style={{ position: 'absolute', bottom: '10mm', left: '50mm', fontSize: '12px', color: '#666' }}>
                {check.checkNumber} | {check.bankName}
            </div>

            <style type="text/css" media="print">
                {`
                @page { size: landscape; margin: 0; }
                body { margin: 0; }
                .check-print-container { border: none !important; }
                `}
            </style>
        </div>
    );
};

export default CheckPrintTemplate;
