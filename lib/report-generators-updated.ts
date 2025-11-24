import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { stringify } from 'csv-stringify/sync';
import { format as dateFormat, isValid } from 'date-fns';
import { Report, ReportFormat } from '@/app/actions/reports';
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable';

// Helper function to safely format date
export function safeFormatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return '';
    return dateFormat(date, 'MM/dd/yyyy');
  } catch (error) {
    return '';
  }
}

// Helper function to safely format time
export function safeFormatTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return '';
    return dateFormat(date, 'h:mm a');
  } catch (error) {
    return '';
  }
}

// Helper function to preserve string or return empty string
export function preserveString(str: string | null | undefined): string {
  if (str === null || str === undefined || str.trim() === '') {
    return '';
  }
  return str;
}

// Common function to prepare data for reports
export function prepareReportData(data: any, reportType: string): any[] {
  if (!data) return [];

  switch (reportType) {
    case 'income':
    case 'income-sources':
      // Handle income data with the specific fields requested
      const incomeData = Array.isArray(data) ? data : data.income || [];
      return incomeData.map(item => ({
        name: preserveString(item.name),
        frequency: preserveString(item.frequency),
        amount: item.amount || 0,
        category: preserveString(item.category),
        start_date: item.start_date || '',
        formatted_amount: item.formatted_amount || new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount || 0),
        formatted_date: item.formatted_date || safeFormatDate(item.start_date),
        recurring_entry: item.frequency !== 'none' ? 'Yes' : 'No',
        recurring_percentage: item.frequency !== 'none' ? '100%' : '0%'
      }));

    case 'expenses':
      // Handle expense data with the specific fields requested
      const expenseData = Array.isArray(data) ? data : data.expenses || [];
      return expenseData.map(item => ({
        name: preserveString(item.name || item.merchant),
        expense_date: item.formatted_expense_date || safeFormatDate(item.expense_date),
        category: preserveString(item.category),
        frequency: preserveString(item.frequency || item.recurrence),
        warranty_expiry: item.formatted_warranty_expiry || safeFormatDate(item.warranty_expiration_date)
      }));
      
    case 'debts':
      // Handle debt data with the specific fields requested
      const debtData = Array.isArray(data) ? data : data.debts || [];
      return debtData.map(item => ({
        name: preserveString(item.name),
        type: preserveString(item.type || item.category),
        balance: item.formatted_balance || new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.current_balance || item.balance || 0),
        interest_rate: item.formatted_interest_rate || `${(item.interest_rate || 0).toFixed(2)}%`,
        minimum_payment: item.formatted_minimum_payment || new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.minimum_payment || 0)
      }));

    case 'subscriptions':
      // Handle subscription data with the specific fields requested
      const subscriptionData = Array.isArray(data) ? data : data.subscriptions || [];
      return subscriptionData.map(item => ({
        name: preserveString(item.name),
        amount: item.formatted_amount || new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount || 0),
        category: preserveString(item.category),
        frequency: preserveString(item.frequency || item.recurrence),
        auto_renew: typeof item.auto_renew === 'boolean' ? (item.auto_renew ? 'Yes' : 'No') : item.auto_renew || 'No',
        usage_rating: item.usage_rating_display || (item.usage_rating !== null && item.usage_rating !== undefined ? `${item.usage_rating}/10` : 'Not rated')
      }));

    case 'overview':
      // For overview report, combine all data types
      const allData = {
        income: prepareReportData(data.income, 'income'),
        expenses: prepareReportData(data.expenses, 'expenses'),
        debts: prepareReportData(data.debts, 'debts'),
        subscriptions: prepareReportData(data.subscriptions, 'subscriptions')
      };
      return [allData]; // Return as an array with a single object for the overview

    default:
      // If data is already an array, use it directly
      if (Array.isArray(data)) {
        return data;
      }
      // Otherwise, try to extract data from the object
      return data[reportType] || [];
  }
}

// Generate PDF report
export function generatePDFReport(data: any, reportType: string, title: string): Blob {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Prepare data based on report type
  const preparedData = prepareReportData(data, reportType);
  
  // If no data, show message
  if (!preparedData.length) {
    doc.setFontSize(12);
    doc.text('No data available for this report.', 14, 50);
    return doc.output('blob');
  }

  // Special handling for overview report which contains multiple sections
  if (reportType === 'overview' && preparedData[0] && typeof preparedData[0] === 'object' && !Array.isArray(preparedData[0])) {
    const overview = preparedData[0];
    let yPosition = 40;
    
    // Add each section
    for (const [section, sectionData] of Object.entries(overview)) {
      if (Array.isArray(sectionData) && sectionData.length > 0) {
        // Add section title
        doc.setFontSize(14);
        doc.text(section.charAt(0).toUpperCase() + section.slice(1), 14, yPosition);
        yPosition += 10;
        
        // Get headers for this section
        const headers = getReportHeaders(section);
        
        // Add table for this section
        autoTable(doc, {
          startY: yPosition,
          head: [headers.map(h => h.label)],
          body: sectionData.map(item => headers.map(h => item[h.key] || '')),
          margin: { top: 10 },
          styles: { overflow: 'linebreak', cellWidth: 'wrap' },
          columnStyles: { 
            0: { cellWidth: 40 }, // Name column
            1: { cellWidth: 25 }, // Amount/Date column
            2: { cellWidth: 25 }, // Category column
            3: { cellWidth: 25 }, // Frequency column
            4: { cellWidth: 25 }  // Last column
          }
        });
        
        // Update y position for next section
        yPosition = (doc as any).lastAutoTable.finalY + 20;
        
        // Add page break if needed
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
      }
    }
    
    return doc.output('blob');
  }
  
  // For regular reports with a single data type
  const headers = getReportHeaders(reportType);
  
  // Create table
  autoTable(doc, {
    startY: 40,
    head: [headers.map(h => h.label)],
    body: preparedData.map(item => headers.map(h => item[h.key] || '')),
    margin: { top: 10 },
    styles: { overflow: 'linebreak', cellWidth: 'wrap' },
    columnStyles: { 
      0: { cellWidth: 40 }, // Name column
      1: { cellWidth: 30 }, // Second column
      2: { cellWidth: 30 }, // Third column
      3: { cellWidth: 30 }, // Fourth column
      4: { cellWidth: 30 }  // Fifth column
    }
  });
  
  return doc.output('blob');
}

// Generate CSV report
export function generateCSVReport(data: any, reportType: string): Blob {
  // Prepare data based on report type
  const preparedData = prepareReportData(data, reportType);
  
  // If no data, return empty CSV
  if (!preparedData.length) {
    return new Blob(['No data available'], { type: 'text/csv;charset=utf-8' });
  }
  
  // Special handling for overview report
  if (reportType === 'overview' && preparedData[0] && typeof preparedData[0] === 'object' && !Array.isArray(preparedData[0])) {
    const overview = preparedData[0];
    let csvContent = '';
    
    // Add each section
    for (const [section, sectionData] of Object.entries(overview)) {
      if (Array.isArray(sectionData) && sectionData.length > 0) {
        // Add section title
        csvContent += `\n${section.toUpperCase()}\n`;
        
        // Get headers for this section
        const headers = getReportHeaders(section);
        
        // Add headers
        csvContent += headers.map(h => h.label).join(',') + '\n';
        
        // Add data rows
        csvContent += stringify(sectionData.map(item => {
          const row: Record<string, any> = {};
          headers.forEach(h => {
            row[h.label] = item[h.key] || '';
          });
          return row;
        }));
        
        csvContent += '\n';
      }
    }
    
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  }
  
  // For regular reports
  const headers = getReportHeaders(reportType);
  
  // Create CSV content
  const csvData = preparedData.map(item => {
    const row: Record<string, any> = {};
    headers.forEach(h => {
      row[h.label] = item[h.key] || '';
    });
    return row;
  });
  
  const csvContent = headers.map(h => h.label).join(',') + '\n' + stringify(csvData);
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
}

// Generate Excel report
export function generateExcelReport(data: any, reportType: string, title: string): Blob {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Prepare data based on report type
  const preparedData = prepareReportData(data, reportType);
  
  // If no data, create empty sheet
  if (!preparedData.length) {
    const ws = XLSX.utils.aoa_to_sheet([['No data available']]);
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  
  // Special handling for overview report
  if (reportType === 'overview' && preparedData[0] && typeof preparedData[0] === 'object' && !Array.isArray(preparedData[0])) {
    const overview = preparedData[0];
    
    // Add each section as a separate sheet
    for (const [section, sectionData] of Object.entries(overview)) {
      if (Array.isArray(sectionData) && sectionData.length > 0) {
        // Get headers for this section
        const headers = getReportHeaders(section);
        
        // Prepare data for Excel
        const excelData = sectionData.map(item => {
          const row: Record<string, any> = {};
          headers.forEach(h => {
            row[h.label] = item[h.key] || '';
          });
          return row;
        });
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData, {
          header: headers.map(h => h.label)
        });
        
        // Add to workbook
        XLSX.utils.book_append_sheet(wb, ws, section.charAt(0).toUpperCase() + section.slice(1));
      }
    }
  } else {
    // For regular reports
    const headers = getReportHeaders(reportType);
    
    // Prepare data for Excel
    const excelData = preparedData.map(item => {
      const row: Record<string, any> = {};
      headers.forEach(h => {
        row[h.label] = item[h.key] || '';
      });
      return row;
    });
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData, {
      header: headers.map(h => h.label)
    });
    
    // Truncate title to 31 characters for Excel sheet name
    const sheetTitle = title.substring(0, 31);
    // Add to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
  }
  
  // Generate blob
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Generate report based on format
export function generateReportByFormat(data: any, report: Report): Blob {
  switch (report.format) {
    case 'pdf':
      return generatePDFReport(data, report.type, report.title);
    case 'csv':
      return generateCSVReport(data, report.type);
    case 'excel':
      return generateExcelReport(data, report.type, report.title);
    default:
      throw new Error(`Unsupported format: ${report.format}`);
  }
}

// Download the generated report
export function downloadReport(blob: Blob, filename: string) {
  saveAs(blob, filename);
}

// Get headers for each report type
function getReportHeaders(reportType: string): Array<{ key: string, label: string }> {
  switch (reportType) {
    case 'income':
      return [
        { key: 'name', label: 'Name' },
        { key: 'frequency', label: 'Frequency' },
        { key: 'formatted_amount', label: 'Amount' },
        { key: 'category', label: 'Category' },
        { key: 'formatted_date', label: 'Start Date' }
      ];
      
    case 'income-sources':
      return [
        { key: 'name', label: 'Income Source' },
        { key: 'formatted_amount', label: 'Amount' },
        { key: 'category', label: 'Category' },
        { key: 'frequency', label: 'Frequency' },
        { key: 'recurring_entry', label: 'Recurring Entry' },
        { key: 'recurring_percentage', label: 'Recurring %' }
      ];

    case 'expenses':
      return [
        { key: 'name', label: 'Name' },
        { key: 'expense_date', label: 'Expense Date' },
        { key: 'category', label: 'Category' },
        { key: 'frequency', label: 'Frequency' },
        { key: 'warranty_expiry', label: 'Warranty Expiry' }
      ];
      
    case 'debts':
      return [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type/Category' },
        { key: 'balance', label: 'Balance' },
        { key: 'interest_rate', label: 'Interest Rate' },
        { key: 'minimum_payment', label: 'Minimum Payment' }
      ];

    case 'subscriptions':
      return [
        { key: 'name', label: 'Name' },
        { key: 'amount', label: 'Amount' },
        { key: 'category', label: 'Category' },
        { key: 'frequency', label: 'Frequency' },
        { key: 'auto_renew', label: 'Auto Renew' },
        { key: 'usage_rating', label: 'Usage Rating' }
      ];

    case 'overview':
      // For overview, this should never be called directly
      return [
        { key: 'name', label: 'Name' },
        { key: 'amount', label: 'Amount' },
        { key: 'category', label: 'Category' },
        { key: 'date', label: 'Date' }
      ];

    default:
      // Default headers for unknown report types
      return [
        { key: 'name', label: 'Name' },
        { key: 'amount', label: 'Amount' },
        { key: 'category', label: 'Category' },
        { key: 'date', label: 'Date' }
      ];
  }
}

// Format time range for display
export function formatTimeRange(timeRange: string): string {
  switch (timeRange) {
    case '7d':
      return 'Last 7 Days';
    case '30d':
      return 'Last 30 Days';
    case '90d':
      return 'Last 90 Days';
    case '1y':
      return 'Last Year';
    case 'ytd':
      return 'Year to Date';
    case 'all':
      return 'All Time';
    default:
      return timeRange;
  }
}
