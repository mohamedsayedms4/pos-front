import React from 'react';

const SingleProductPdf = React.forwardRef(({ product }, ref) => {
  if (!product) return null;

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const currentDate = new Date();
  const reportDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  // Theme Colors based on user's design
  const colors = {
    primaryDark: '#214e6b', // Dark blue for main headers
    primaryLight: '#2c84b4', // Lighter blue for section headers
    border: '#e0e0e0',
    text: '#333333',
    cardBlue: '#2c84b4',
    cardGreen: '#28a745',
    cardOrange: '#e67e22'
  };

  const styles = {
    container: {
      padding: '40px',
      fontFamily: '"Cairo", "Tajawal", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif', // Standard Arabic fonts
      direction: 'rtl',
      color: colors.text,
      backgroundColor: '#fff',
      width: '100%',
      boxSizing: 'border-box',
    },
    pageTitleBox: {
      backgroundColor: colors.primaryDark,
      color: '#fff',
      textAlign: 'center',
      padding: '20px',
      fontSize: '28px',
      fontWeight: 'bold',
      marginBottom: '10px'
    },
    dateText: {
      textAlign: 'left',
      fontSize: '12px',
      color: '#777',
      marginBottom: '30px'
    },
    sectionHeader: {
      backgroundColor: colors.primaryLight,
      color: '#fff',
      padding: '10px 15px',
      fontSize: '18px',
      fontWeight: 'bold',
      marginTop: '20px',
      marginBottom: '0px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '20px',
      border: `1px solid ${colors.border}`
    },
    th: {
      backgroundColor: colors.primaryDark,
      color: '#fff',
      padding: '12px',
      textAlign: 'center',
      border: `1px solid ${colors.border}`,
      fontSize: '14px'
    },
    td: {
      padding: '12px',
      textAlign: 'center',
      border: `1px solid ${colors.border}`,
      fontSize: '14px'
    },
    infoTableTdRight: { // Label column
      padding: '12px',
      textAlign: 'right',
      border: `1px solid ${colors.border}`,
      fontSize: '14px',
      width: '30%',
      fontWeight: 'bold',
      backgroundColor: '#f9f9f9'
    },
    infoTableTdLeft: { // Value column
      padding: '12px',
      textAlign: 'right',
      border: `1px solid ${colors.border}`,
      fontSize: '14px',
      width: '70%'
    },
    cardsTable: {
      width: '100%',
      borderCollapse: 'separate',
      borderSpacing: '15px 0',
      marginTop: '20px',
      marginBottom: '20px',
      pageBreakInside: 'avoid'
    },
    cardCell: {
      width: '33.33%',
      padding: '20px',
      textAlign: 'center',
      color: '#fff',
      borderRadius: '4px',
      boxSizing: 'border-box'
    },
    pageBreak: {
      pageBreakBefore: 'always'
    }
  };

  // Calculate totals for summary cards
  let totalStock = 0;
  if (product.branchInventories) {
    totalStock = product.branchInventories.reduce((sum, inv) => sum + (inv.stock || 0), 0);
  }

  return (
    <div ref={ref} style={styles.container}>
      {/* PAGE 1 */}
      <div>
        <div style={styles.pageTitleBox}>
          تقرير تفاصيل المنتج
        </div>
        <div style={styles.dateText}>
          تاريخ التقرير: {reportDate}
        </div>

        {/* Basic Info Section */}
        <div style={styles.sectionHeader}>المعلومات الأساسية</div>
        <table style={styles.table}>
          <tbody>
            <tr>
              <td style={styles.infoTableTdRight}>اسم المنتج</td>
              <td style={styles.infoTableTdLeft}>{product.name || '---'}</td>
            </tr>
            <tr>
              <td style={styles.infoTableTdRight}>كود المنتج</td>
              <td style={styles.infoTableTdLeft}>{product.productCode || '---'}</td>
            </tr>
            <tr>
              <td style={styles.infoTableTdRight}>وصف المنتج</td>
              <td style={styles.infoTableTdLeft}>{product.description || '---'}</td>
            </tr>
            <tr>
              <td style={styles.infoTableTdRight}>وحدة القياس</td>
              <td style={styles.infoTableTdLeft}>{product.unitName || '---'}</td>
            </tr>
            <tr>
              <td style={styles.infoTableTdRight}>الفئة</td>
              <td style={styles.infoTableTdLeft}>{product.categoryName || '---'}</td>
            </tr>
            <tr>
              <td style={styles.infoTableTdRight}>أنشئ بواسطة</td>
              <td style={styles.infoTableTdLeft}>{product.createdBy || '---'}</td>
            </tr>
            <tr>
              <td style={styles.infoTableTdRight}>تاريخ الإنشاء</td>
              <td style={styles.infoTableTdLeft}>{formatDate(product.createdAt) || '---'}</td>
            </tr>
          </tbody>
        </table>

        {/* Units Section */}
        {product.units && product.units.length > 0 && (
          <>
            <div style={styles.sectionHeader}>وحدات القياس</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>اسم الوحدة</th>
                  <th style={styles.th}>معامل التحويل</th>
                  <th style={styles.th}>سعر الشراء</th>
                  <th style={styles.th}>سعر البيع</th>
                </tr>
              </thead>
              <tbody>
                {product.units.map((unit, index) => (
                  <tr key={index}>
                    <td style={styles.td}>{unit.unitName}</td>
                    <td style={styles.td}>{unit.conversionFactor}</td>
                    <td style={styles.td}>{unit.purchasePrice} ج.م</td>
                    <td style={styles.td}>{unit.salePrice} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* PAGE 2 (Page Break) */}
      <div style={styles.pageBreak}></div>

      <div>
        {/* Branch Inventory Section */}
        <div style={styles.sectionHeader}>المخزون حسب الفرع</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>اسم الفرع</th>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>سعر الشراء</th>
              <th style={styles.th}>سعر البيع</th>
              <th style={styles.th}>المخزون</th>
              <th style={styles.th}>يظهر بالمتجر</th>
              <th style={styles.th}>المبيعات</th>
              <th style={styles.th}>الأرباح</th>
            </tr>
          </thead>
          <tbody>
            {product.branchInventories && product.branchInventories.map((inv, index) => (
              <tr key={index}>
                <td style={styles.td}>{inv.branchName}</td>
                <td style={styles.td}>{inv.branchId}</td>
                <td style={styles.td}>{inv.purchasePrice?.toFixed(2) || '0.00'}</td>
                <td style={styles.td}>{inv.salePrice?.toFixed(2) || '0.00'}</td>
                <td style={styles.td}>{inv.stock?.toFixed(1) || '0.0'}</td>
                <td style={styles.td}>{inv.showInStore ? 'نعم' : 'لا'}</td>
                <td style={styles.td}>0.0</td> {/* Placeholder for sales */}
                <td style={styles.td}>0.00</td> {/* Placeholder for profits */}
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
});

export default SingleProductPdf;
