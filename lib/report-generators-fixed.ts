import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { stringify } from 'csv-stringify/sync';
import { Report, ReportFormat } from '@/app/actions/reports';
import { saveAs } from 'file-saver';

// Helper function to safely format dates
function safeFormatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString();
  } catch (error) {
    return '';
  }
}

// Helper function to safely format times
function safeFormatTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString();
  } catch (error) {
    return '';
  }
}

// Helper function to preserve original string values
function preserveString(value: any, defaultValue: string = ''): string {
  if (value === null || value === undefined || value === '') return defaultValue;
  return String(value);
}

// Common function to prepare data for reports
export function prepareReportData(data: any[], reportType: string) {
  // Format and structure data based on report type
  switch (reportType) {
    case 'overview':
      return data.map(item => ({
        id: item.id || '',
        date: safeFormatDate(item.created_at),
        time: safeFormatTime(item.created_at),
        name: preserveString(item.name || item.title),
        description: preserveString(item.description),
        amount: item.amount || 0,
        formattedAmount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount || 0),
        category: preserveString(item.category),
        subcategory: preserveString(item.subcategory),
        type: preserveString(item.type),
        status: preserveString(item.status),
        account: preserveString(item.account_name || item.account),
        tags: Array.isArray(item.tags) ? item.tags : [],
        notes: preserveString(item.notes),
        created_by: preserveString(item.created_by),
        updated_at: safeFormatDate(item.updated_at),
        payment_method: preserveString(item.payment_method),
        recurring: item.is_recurring,
        location: preserveString(item.location),
      }));
    
    case 'income-expense':
      return data.map(item => ({
        id: item.id || '',
        date: safeFormatDate(item.created_at),
        time: safeFormatTime(item.created_at),
        name: preserveString(item.name || item.title),
        description: preserveString(item.description),
        amount: item.amount || 0,
        formattedAmount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount || 0),
        category: preserveString(item.category),
        subcategory: preserveString(item.subcategory),
        type: preserveString(item.type),
        status: preserveString(item.status),
        account: preserveString(item.account_name || item.account),
        tags: Array.isArray(item.tags) ? item.tags : [],
        notes: preserveString(item.notes),
        payment_method: preserveString(item.payment_method),
        recurring: item.is_recurring,
        location: preserveString(item.location),
        frequency: preserveString(item.frequency),
        tax_deductible: item.tax_deductible,
      }));
    
    case 'net-worth':
      return data.map(item => {
        // Handle account number safely
        let accountNumber = '';
        if (item.account_number) {
          try {
            const accNum = String(item.account_number);
            accountNumber = accNum.length >= 4 ? `xxxx-${accNum.slice(-4)}` : '';
          } catch (error) {
            accountNumber = '';
          }
        }
        
        return {
          id: item.id || '',
          name: preserveString(item.name),
          description: preserveString(item.description),
          value: item.value || 0,
          formattedValue: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.value || 0),
          type: preserveString(item.type),
          category: preserveString(item.category),
          subcategory: preserveString(item.subcategory),
          institution: preserveString(item.institution),
          account_number: accountNumber,
          interest_rate: item.interest_rate ? `${item.interest_rate}%` : '',
          date_acquired: safeFormatDate(item.date_acquired),
          maturity_date: safeFormatDate(item.maturity_date),
          date: safeFormatDate(item.updated_at || item.created_at),
          notes: preserveString(item.notes),
          status: preserveString(item.status),
        };
      });
    
    case 'investments':
      return data.map(item => {
        // Calculate gain/loss
        const costBasis = item.cost_basis || 0;
        const currentValue = (item.price || 0) * (item.shares || 0);
        const gainLoss = currentValue - costBasis;
        const gainLossPercent = costBasis > 0 ? ((gainLoss / costBasis) * 100).toFixed(2) + '%' : '0%';
        
        return {
          id: item.id || '',
          name: preserveString(item.name),
          description: preserveString(item.description),
          symbol: preserveString(item.symbol),
          shares: item.shares || 0,
          price: item.price || 0,
          formattedPrice: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.price || 0),
          value: currentValue,
          formattedValue: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(currentValue),
          cost_basis: costBasis,
          formattedCostBasis: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(costBasis),
          gain_loss: gainLoss,
          gain_loss_percent: gainLossPercent,
          date_acquired: safeFormatDate(item.date_acquired),
          account: preserveString(item.account_name || item.account),
          institution: preserveString(item.institution),
          category: preserveString(item.category),
          type: preserveString(item.investment_type || item.type),
          sector: preserveString(item.sector),
          date: safeFormatDate(item.updated_at || item.created_at),
          notes: preserveString(item.notes),
        };
      });
      
    case 'budget-analysis':
      return data.map(item => {
        // Calculate budget metrics
        const budgeted = item.budgeted_amount || 0;
        const actual = item.actual_amount || 0;
        const difference = budgeted - actual;
        const percentUsed = budgeted > 0 ? ((actual / budgeted) * 100).toFixed(2) + '%' : '0%';
        
        return {
          id: item.id || '',
          category: preserveString(item.category),
          subcategory: preserveString(item.subcategory),
          budgeted: budgeted,
          formattedBudgeted: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(budgeted),
          actual: actual,
          formattedActual: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(actual),
          difference: difference,
          formattedDifference: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(difference),
          percent_used: percentUsed,
          month: preserveString(item.month),
          year: preserveString(item.year),
          period: item.month && item.year ? `${item.month}/${item.year}` : '',
          notes: preserveString(item.notes),
        };
      });
    
    case 'spending-categories':
      return data.map(item => {
        // Calculate spending metrics
        const amount = item.amount || 0;
        const totalSpending = data.reduce((sum, cat) => sum + (cat.amount || 0), 0);
        const percentOfTotal = totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(2) + '%' : '0%';
        const transactionCount = item.transaction_count || 0;
        const averageTransaction = transactionCount > 0 ? (amount / transactionCount) : 0;
        const formattedAverage = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(averageTransaction);
        
        return {
          id: item.id || '',
          category: preserveString(item.category),
          subcategory: preserveString(item.subcategory),
          amount: amount,
          formattedAmount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount),
          percent_of_total: percentOfTotal,
          transaction_count: transactionCount,
          average_transaction: averageTransaction,
          formattedAverage: formattedAverage,
          month: preserveString(item.month),
          year: preserveString(item.year),
          period: item.month && item.year ? `${item.month}/${item.year}` : '',
        };
      });
      
    default:
      return data;
  }
}

// Generate PDF report
export function generatePdfReport(data: any[], report: Report): Blob {
  const formattedData = prepareReportData(data, report.type);
  
  // Create PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(report.title, 14, 10);
  
  // Add subtitle with time range
  doc.setFontSize(12);
  const timeRangeText = `Time Range: ${formatTimeRange(report.timeRange)}`;
  doc.text(timeRangeText, 14, 20);
  
  // Table headers
  const columns = getColumnsForReportType(report.type);
  const headers = columns.map(col => col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '));
  
  doc.setFontSize(10);
  let startY = 30;
  let xOffset = 14;
  
  headers.forEach(header => {
    doc.text(header, xOffset, startY);
    xOffset += 35;
  });
  
  // Table data
  startY += 10;
  formattedData.forEach((row, index) => {
    if (startY > 270) {
      // Add new page if we're near the bottom
      doc.addPage();
      startY = 20;
      
      // Redraw headers on new page
      xOffset = 14;
      headers.forEach(header => {
        doc.text(header, xOffset, startY);
        xOffset += 35;
      });
      startY += 10;
    }
    
    xOffset = 14;
    Object.values(row).slice(1).forEach((value: any) => {
      doc.text(String(value), xOffset, startY);
      xOffset += 35;
    });
    
    startY += 7;
  });
  
  return doc.output('blob');
}

// Generate CSV report
export function generateCsvReport(data: any[], report: Report): Blob {
  const formattedData = prepareReportData(data, report.type);
  
  // Convert data to CSV
  const csvContent = stringify(formattedData, {
    header: true,
    columns: getColumnsForReportType(report.type),
  });
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
}

// Generate Excel report
export function generateExcelReport(data: any[], report: Report): Blob {
  const formattedData = prepareReportData(data, report.type);
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(formattedData);
  
  // Add worksheet to workbook - limit sheet name to 31 characters (Excel limitation)
  const sheetName = report.title.length > 30 ? report.title.substring(0, 30) : report.title;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Generate report based on format
export function generateReportByFormat(data: any[], report: Report): Blob {
  switch (report.format) {
    case 'pdf':
      return generatePdfReport(data, report);
    case 'csv':
      return generateCsvReport(data, report);
    case 'excel':
      return generateExcelReport(data, report);
    default:
      throw new Error(`Unsupported format: ${report.format}`);
  }
}

// Download the generated report
export function downloadReport(blob: Blob, filename: string) {
  saveAs(blob, filename);
}

// Helper functions
function getColumnsForReportType(reportType: string) {
  switch (reportType) {
    case 'overview':
      return ['date', 'time', 'name', 'description', 'formattedAmount', 'category', 'subcategory', 'type', 'status', 'account', 'notes', 'payment_method', 'recurring', 'location'];
    case 'income-expense':
      return ['date', 'time', 'name', 'description', 'formattedAmount', 'category', 'subcategory', 'type', 'status', 'account', 'payment_method', 'recurring', 'frequency', 'tax_deductible', 'notes'];
    case 'net-worth':
      return ['name', 'description', 'formattedValue', 'type', 'category', 'subcategory', 'institution', 'account_number', 'interest_rate', 'date_acquired', 'maturity_date', 'date', 'status', 'notes'];
    case 'investments':
      return ['name', 'symbol', 'shares', 'formattedPrice', 'formattedValue', 'formattedCostBasis', 'gain_loss_percent', 'date_acquired', 'account', 'institution', 'category', 'type', 'sector', 'date', 'notes'];
    case 'budget-analysis':
      return ['category', 'subcategory', 'formattedBudgeted', 'formattedActual', 'formattedDifference', 'percent_used', 'month', 'year', 'notes'];
    case 'spending-categories':
      return ['category', 'subcategory', 'formattedAmount', 'percent_of_total', 'transaction_count', 'formattedAverage', 'month', 'year'];
    default:
      return [];
  }
}

function formatTimeRange(timeRange: string): string {
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
