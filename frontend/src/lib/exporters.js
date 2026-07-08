// jspdf and xlsx are heavyweight, so they are dynamically imported inside the
// export functions — the browser only downloads them when a user actually exports.

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };

// jsPDF's built-in Helvetica cannot render ₹ / € glyphs, so PDF output
// uses plain-text prefixes instead of symbols.
const PDF_CURRENCY_PREFIX = { USD: '$', EUR: 'EUR ', GBP: 'GBP ', INR: 'Rs. ' };

const BRAND_COLOR = [99, 102, 241]; // indigo-500, matches the app's primary color

const todayStamp = () => new Date().toISOString().split('T')[0];

function summarize(expenses) {
  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const byCategory = {};
  expenses.forEach(e => {
    const cat = e.category || 'Others';
    byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0);
  });
  const categoryRows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  return { total, categoryRows };
}

export function exportExpensesCSV(expenses, currency = 'INR') {
  const headers = ['Date', 'Item Name', 'Category', `Amount (${currency})`, 'Description'];
  const csvRows = [
    headers.join(','),
    ...expenses.map(exp => {
      const dateVal = exp.date || '';
      const itemVal = `"${(exp.item || '').replace(/"/g, '""')}"`;
      const categoryVal = `"${(exp.category || '').replace(/"/g, '""')}"`;
      const amountVal = exp.amount || 0;
      const descVal = `"${(exp.description || '').replace(/"/g, '""')}"`;
      return [dateVal, itemVal, categoryVal, amountVal, descVal].join(',');
    })
  ];

  // ﻿ is the UTF-8 BOM so Excel opens the file with correct encoding
  const csvContent = '﻿' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `finvoice-expenses-${todayStamp()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportExpensesExcel(expenses, currency = 'INR') {
  const XLSX = await import('xlsx');
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const { total, categoryRows } = summarize(expenses);

  const wb = XLSX.utils.book_new();

  // Sheet 1: all transactions
  const rows = expenses.map(exp => ({
    Date: exp.date || '',
    Item: exp.item || '',
    Category: exp.category || '',
    [`Amount (${currency})`]: exp.amount || 0,
    Description: exp.description || ''
  }));
  const wsTx = XLSX.utils.json_to_sheet(rows);
  wsTx['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');

  // Sheet 2: summary + category breakdown
  const summaryRows = [
    ['FinVoice Expense Report'],
    ['Generated on', todayStamp()],
    [],
    ['Total Spend', `${symbol}${total.toLocaleString()}`],
    ['Transactions', expenses.length],
    [],
    ['Category', `Total (${currency})`],
    ...categoryRows
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 24 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  XLSX.writeFile(wb, `finvoice-expenses-${todayStamp()}.xlsx`);
}

export async function exportExpensesPDF(expenses, currency = 'INR', { title = 'Expense Report', subtitle = '' } = {}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const prefix = PDF_CURRENCY_PREFIX[currency] || `${currency} `;
  const fmt = (n) => `${prefix}${(n || 0).toLocaleString('en-IN')}`;
  const { total, categoryRows } = summarize(expenses);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FinVoice', 14, 13);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 22);
  doc.setFontSize(9);
  doc.text(`Generated: ${todayStamp()}`, pageWidth - 14, 13, { align: 'right' });
  if (subtitle) {
    doc.text(subtitle, pageWidth - 14, 22, { align: 'right' });
  }

  // Key figures
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Spend: ${fmt(total)}`, 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Transactions: ${expenses.length}`, 14, 49);

  // Category breakdown
  autoTable(doc, {
    startY: 56,
    head: [['Category', `Total (${currency})`, 'Share']],
    body: categoryRows.map(([cat, catTotal]) => [
      cat,
      fmt(catTotal),
      total > 0 ? `${Math.round((catTotal / total) * 100)}%` : '0%'
    ]),
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  // Full transaction table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Date', 'Item', 'Category', `Amount (${currency})`, 'Description']],
    body: expenses.map(exp => [
      exp.date || '',
      exp.item || '',
      exp.category || '',
      fmt(exp.amount),
      exp.description || ''
    ]),
    theme: 'grid',
    headStyles: { fillColor: BRAND_COLOR, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 4: { cellWidth: 55 } },
    margin: { left: 14, right: 14 }
  });

  // Page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  doc.save(`finvoice-report-${todayStamp()}.pdf`);
}
