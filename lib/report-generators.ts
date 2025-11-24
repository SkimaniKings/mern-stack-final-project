import * as XLSX from 'xlsx';
import { stringify } from 'csv-stringify/sync';
import { format as dateFormat, isValid } from 'date-fns';
import { Report, ReportFormat } from '@/app/actions/reports';
import { saveAs } from 'file-saver';

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
  // Fallback: if data is an object with array properties (e.g. overview), flatten them
  // Special flattening for expense-trends category-grouped data
  if (reportType === 'expense-trends' && data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.categories)) {
    // Flatten all transactions from all categories, attaching parent category name to each transaction
    let allTransactions: any[] = [];
    data.categories.forEach((cat: any) => {
      if (Array.isArray(cat.transactions)) {
        allTransactions = allTransactions.concat(cat.transactions.map((tx: any) => ({ ...tx, _parentCategory: cat.name })));
      }
    });
    data = allTransactions;
  } else if (data && !Array.isArray(data) && typeof data === 'object') {
    // Only flatten if at least one property is an array
    const arrays = Object.values(data).filter(v => Array.isArray(v));
    if (arrays.length > 0) {
      // Add a reportDataType property to each item if possible
      let result: any[] = [];
      Object.entries(data).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          result = result.concat(val.map(item => ({ ...item, reportDataType: key })));
        }
      });
      data = result;
    }
  }

  // If the report type is 'debt' and data is already an array,
  // we can assume it's in the correct format from fetchReportData.
  if (reportType === 'debt-analysis' && Array.isArray(data)) {
    return data.map((debt: any) => ({
      name: debt.name || '',
      type: debt.type || '',
      balance: typeof debt.balance === 'number' ? debt.balance : (parseFloat(String(debt.balance)) || 0),
      interest_rate: typeof debt.interest_rate === 'number' ? debt.interest_rate : (parseFloat(String(debt.interest_rate)) || 0),
      minimum_payment: typeof debt.minimum_payment === 'number' ? debt.minimum_payment : (parseFloat(String(debt.minimum_payment)) || 0),
    }));
  }

  // Fallback: if data is an object with array properties (e.g. overview), flatten them
  // Special flattening for expense-trends category-grouped data
  if (reportType === 'expense-trends' && data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.categories)) {
    // Flatten all transactions from all categories, attaching parent category name to each transaction
    let allTransactions: any[] = [];
    data.categories.forEach((cat: any) => {
      if (Array.isArray(cat.transactions)) {
        allTransactions = allTransactions.concat(cat.transactions.map((tx: any) => ({ ...tx, _parentCategory: cat.name })));
      }
    });
    data = allTransactions;
  } else if (data && !Array.isArray(data) && typeof data === 'object') {
    // Only flatten if at least one property is an array
    const arrays = Object.values(data).filter(v => Array.isArray(v));
    if (arrays.length > 0) {
      // Add a reportDataType property to each item if possible
      let result: any[] = [];
      Object.entries(data).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          result = result.concat(val.map(item => ({ ...item, reportDataType: key })));
        }
      });
      data = result;
    }
  }

  if (!data || (Array.isArray(data) && !data.length)) return [];
  // If data is not an array at this point (e.g. it was an object with no array properties),
  // and it's not 'debt' (which is handled above), then the default switch case will handle it.
  if (!Array.isArray(data) && reportType !== 'debt-analysis') {
     // If it's a single object that wasn't flattened, wrap it for the default case
     if (typeof data === 'object' && data !== null) {
        data = [data];
     } else {
        data = [{ value: data }]; // Final fallback for non-object, non-array data
     }
  }


  switch (reportType) {
    case 'transactions':
      return (data as any[]).map((item: Record<string, any>) => ({
        id: item.id || '',
        date: safeFormatDate(item.created_at),
        time: safeFormatTime(item.created_at),
        name: preserveString(item.name || item.title),
        category: preserveString(item.category),
        amount: item.amount || 0,
        formatted_amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount || 0),
        account: preserveString(item.account_name || item.account),
        type: preserveString(item.type),
        notes: preserveString(item.notes),
        recurring: item.is_recurring || false,
        tax_deductible: item.tax_deductible || false
      }));

    case 'income-expense':
      return (data as any[]).map((item: Record<string, any>) => ({
        id: item.id || '',
        date: safeFormatDate(item.created_at),
        name: preserveString(item.name || item.title),
        category: preserveString(item.category),
        type: preserveString(item.type),
        amount: item.amount || 0,
        formatted_amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount || 0),
        // Add comparison data if available
        comparison_amount: item.comparison_total || 0,
        comparison_formatted: item.comparison_formatted_total || '',
        difference: item.total_difference || 0,
        formatted_difference: item.formatted_difference || '',
        percent_change: item.percent_change || '',
        is_increase: item.is_increase || false
      }));
      
    case 'income-sources':
      // Handle income sources report data
      const dataObj = data as any;
      if (dataObj.sources && Array.isArray(dataObj.sources)) {
        // Return the sources array with formatted data
        return dataObj.sources.map((source: any) => ({
          id: source.id || '',
          source: preserveString(source.source),
          amount: source.amount || 0,
          formatted_amount: source.formatted_amount || new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(source.amount || 0),
          percent_of_total: source.percent_of_total || 0,
          formatted_percent: source.formatted_percent || `${(source.percent_of_total || 0).toFixed(1)}%`,
          count: source.count || 0,
          recurring_count: source.recurring_count || 0,
          recurring_percentage: source.recurring_percentage || 0
        }));
      } else if (Array.isArray(data)) {
        // If data is already an array (fallback)
        return data.map(source => ({
          id: source.id || '',
          source: preserveString(source.source || source.name || ''),
          amount: source.amount || 0,
          formatted_amount: source.formatted_amount || new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(source.amount || 0),
          percent_of_total: source.percent_of_total || 0,
          formatted_percent: source.formatted_percent || `${(source.percent_of_total || 0).toFixed(1)}%`,
          count: source.count || 0
        }));
      }
      return [];

    case 'overview':
      return (data as any[]).map((item: Record<string, any>) => ({
        id: item.id || '',
        date: safeFormatDate(item.created_at),
        name: preserveString(item.name || item.title),
        amount: item.amount || 0,
        formatted_amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount || 0),
        type: preserveString(item.type),
        // Include group data if available
        group_name: item.group_name || '',
        count: item.count || 1,
        total_amount: item.total_amount || item.amount || 0,
        average_amount: item.average_amount || item.amount || 0
      }));
      
    case 'expense-trends':
      console.log('Preparing expense trends data:', data);
      
      // Handle different data structures
      let items: any[] = [];
      
      if (Array.isArray(data)) {
        items = data;
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data)) {
        items = (data as any).data;
      } else if (data && typeof data === 'object') {
        // If it's a single expense object, put it in an array
        items = [data];
      }
      
      return items
        .filter((item: any) => {
          if (!item) return false;
          if (typeof item !== 'object') return false;
          if ((item.id && typeof item.id === 'string' && item.id.startsWith('cat-')) || (!item.expense_date && !item.date && !item.created_at)) return false;
          return true;
        })
        .map((item: any) => ({
          name: typeof item.name === 'string' ? item.name : '',
          expense_date: typeof item.expense_date === 'string' ? item.expense_date : (typeof item.date === 'string' ? item.date : ''),
          category: typeof item.category === 'string' ? item.category : '',
          frequency: typeof item.frequency === 'string' ? item.frequency : '',
          warranty_expiry: typeof item.warranty_expiry === 'string' ? item.warranty_expiry : ''
        }));

    case 'net-worth':
      // Data for net-worth is already prepared in app/actions/reports.ts
      // to be an array of Asset and Liability objects with a 'record_type' field.
      // We just need to ensure consistent field names for the report.
      return (data as any[]).map((item: Record<string, any>) => ({
        name: item.name || '',
        category: item.category || '', // This was 'type' from the accounts table
        record_type: item.record_type || (item.value !== undefined ? 'Asset' : 'Liability'),
        // Use 'value' for assets and 'amount' for liabilities, mapped to a common field 'current_value'
        current_value: item.value !== undefined ? (parseFloat(String(item.value)) || 0) : (parseFloat(String(item.amount)) || 0),
      }));

    default:
      return data;
  }
}


// Generate CSV report
export function generateCSVReport(data: any[], reportType: string): Blob {
  const preparedData = prepareReportData(data, reportType);
  
  let csvContent: string;
  
  if (preparedData.length === 0) {
    csvContent = 'No data available for this report.';
  } else {
    // Convert to CSV
    csvContent = stringify(preparedData, {
      header: true,
      columns: getReportHeaders(reportType, data).map(h => ({ key: h.key, header: h.label }))
    });
    
    // Add summary data for grouped reports
    if (data[0]?.group_key) {
      csvContent += '\n\nSUMMARY\n';
      
      const summaryHeaders = ['Group', 'Count', 'Total', 'Average'];
      
      // Add comparison headers if available
      if (data[0]?.comparison_total !== undefined) {
        summaryHeaders.push('Previous Period', 'Difference', 'Change %');
      }
      
      csvContent += summaryHeaders.join(',') + '\n';
      
      // Add summary rows
      data.forEach(group => {
        let row = [
          `"${group.group_name || ''}"`,
          group.count || 0,
          `"${group.formatted_total || ''}"`,
          `"${group.formatted_average || ''}"`
        ];
        
        if (group.comparison_total !== undefined) {
          row.push(
            `"${group.comparison_formatted_total || ''}"`,
            `"${group.formatted_difference || ''}"`,
            `"${group.percent_change || ''}"`
          );
        }
        
        csvContent += row.join(',') + '\n';
      });
    }
  }
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

// Generate Excel report
export function generateExcelReport(data: any[], reportType: string, title: string): Blob {
  const preparedData = prepareReportData(data, reportType);
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  if (preparedData.length === 0) {
    // Create empty worksheet with message
    const ws = XLSX.utils.aoa_to_sheet([['No data available for this report.']]);
    const sheetTitleForEmpty = title.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetTitleForEmpty);
  } else {
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(preparedData);
    
    // Add to workbook
    const sheetTitle = title.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
    
    // Add summary sheet for grouped data
    if (data[0]?.group_key) {
      const summaryData = data.map(group => ({
        Group: group.group_name || '',
        Count: group.count || 0,
        Total: group.formatted_total || '',
        Average: group.formatted_average || '',
        ...(group.comparison_total !== undefined ? {
          'Previous Period': group.comparison_formatted_total || '',
          'Difference': group.formatted_difference || '',
          'Change %': group.percent_change || ''
        } : {})
      }));
      
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    }
  }
  
  // Generate blob
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Generate report based on format
export function generateReportByFormat(data: any[], report: Report): Blob {
  switch (report.format) {

    case 'csv':
      return generateCSVReport(data, report.type);
    case 'excel':
      return generateExcelReport(data, report.type, report.title);
    default:
      throw new Error(`Unsupported format: ${report.format}`);
  }
}

export function downloadReport(blob: Blob, filename: string) {
  saveAs(blob, filename);
}

// Define the allowed report types and their corresponding headers
const REPORT_HEADERS: Record<string, Array<{ key: string, label: string }>> = {
  'income-sources': [
    { key: 'source', label: 'Source' },
    { key: 'amount', label: 'Amount' },
    { key: 'percentage', label: 'Percentage' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'average', label: 'Average' },
  ],
  'expense-trends': [
    { key: 'date', label: 'Date' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'description', label: 'Description' },
    { key: 'account', label: 'Account' },
    { key: 'payment_method', label: 'Payment Method' },
  ],
  'net-worth': [
    { key: 'date', label: 'Date' },
    { key: 'assets', label: 'Assets' },
    { key: 'liabilities', label: 'Liabilities' },
    { key: 'net_worth', label: 'Net Worth' },
    { key: 'change', label: 'Change' },
  ],
  'savings-goals': [
    { key: 'name', label: 'Goal' },
    { key: 'target_amount', label: 'Target Amount' },
    { key: 'current_amount', label: 'Current Amount' },
    { key: 'progress', label: 'Progress' },
    { key: 'target_date', label: 'Target Date' },
    { key: 'status', label: 'Status' },
  ],
  'debt': [
    { key: 'name', label: 'Debt Name' },
    { key: 'type', label: 'Type' },
    { key: 'balance', label: 'Balance' },
    { key: 'interest_rate', label: 'Interest Rate' },
    { key: 'minimum_payment', label: 'Minimum Payment' },
    { key: 'due_date', label: 'Due Date' },
  ]
};

// Get headers for each report type
function getReportHeaders(reportType: string, data?: any[]): Array<{ key: string, label: string }> {
  // If the report type is in our allowed list, return its headers
  if (Object.prototype.hasOwnProperty.call(REPORT_HEADERS, reportType)) {
    return REPORT_HEADERS[reportType as keyof typeof REPORT_HEADERS];
  }
  
  // For unknown report types, try to infer headers from the data
  if (data && data.length > 0 && typeof data[0] === 'object') {
    return Object.keys(data[0]).map(key => ({
      key,
      label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }));
  }
  
  // Default fallback
  return [
    { key: 'name', label: 'Name' },
    { key: 'value', label: 'Value' },
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description' },
  ];
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
