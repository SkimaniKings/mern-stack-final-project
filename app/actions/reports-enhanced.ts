"use server"

import { fetchReportData } from './fetch-report-data-complete';
import { generateReportByFormat, downloadReport } from '@/lib/report-generators';
import { ReportType, TimeRange, ReportRequest, Report } from './reports';

// Enhanced report generation with advanced features
export async function generateEnhancedReport(report: Report) {
  try {
    // Fetch data with advanced options
    const data = await fetchReportData(
      report.type, 
      report.timeRange, 
      {
        customDateRange: report.customDateRange,
        dataFilters: report.filters,
        groupBy: report.groupBy,
        sortBy: report.sortBy,
        sortDirection: report.sortDirection,
        comparisonType: report.comparisonType,
        comparisonTimeRange: report.comparisonTimeRange,
        comparisonCustomDateRange: report.comparisonCustomDateRange
      }
    );
    
    // Generate report in the requested format
    const blob = generateReportByFormat(data, report);
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${report.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${timestamp}.${getFileExtension(report.format)}`;
    
    return { blob, filename, success: true, data };
  } catch (error) {
    console.error('Error generating enhanced report:', error);
    return { success: false, error: 'Failed to generate report. Please try again.' };
  }
}

// Helper to get file extension based on format
function getFileExtension(format: string): string {
  switch (format) {
    case 'pdf':
      return 'pdf';
    case 'csv':
      return 'csv';
    case 'excel':
      return 'xlsx';
    default:
      return 'txt';
  }
}

// Function to download the report directly
export async function downloadEnhancedReport(report: Report) {
  try {
    const result = await generateEnhancedReport(report);
    
    if (result.success && result.blob && result.filename) {
      downloadReport(result.blob, result.filename);
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Failed to generate report' };
    }
  } catch (error) {
    console.error('Error downloading enhanced report:', error);
    return { success: false, error: 'Failed to download report. Please try again.' };
  }
}

// Function to get available report options
export function getReportOptions() {
  return {
    types: [
      { id: 'overview', label: 'Overview Report' },
      { id: 'income-expense', label: 'Income & Expense Report' },
      { id: 'transactions', label: 'Transactions Report' }
    ],
    timeRanges: [
      { id: '7d', label: 'Last 7 Days' },
      { id: '30d', label: 'Last 30 Days' },
      { id: '90d', label: 'Last 90 Days' },
      { id: '1y', label: 'Last Year' },
      { id: 'ytd', label: 'Year to Date' },
      { id: 'all', label: 'All Time' },
      { id: 'custom', label: 'Custom Date Range' }
    ],
    formats: [
      { id: 'pdf', label: 'PDF Document' },
      { id: 'excel', label: 'Excel Spreadsheet' },
      { id: 'csv', label: 'CSV File' }
    ],
    groupByOptions: [
      { id: 'none', label: 'No Grouping' },
      { id: 'day', label: 'Group by Day' },
      { id: 'week', label: 'Group by Week' },
      { id: 'month', label: 'Group by Month' },
      { id: 'quarter', label: 'Group by Quarter' },
      { id: 'year', label: 'Group by Year' },
      { id: 'category', label: 'Group by Category' },
      { id: 'account', label: 'Group by Account' },
      { id: 'tag', label: 'Group by Tag' }
    ],
    sortOptions: [
      { id: 'date', label: 'Sort by Date' },
      { id: 'amount', label: 'Sort by Amount' },
      { id: 'name', label: 'Sort by Name' },
      { id: 'category', label: 'Sort by Category' }
    ],
    sortDirections: [
      { id: 'desc', label: 'Descending' },
      { id: 'asc', label: 'Ascending' }
    ],
    comparisonTypes: [
      { id: 'none', label: 'No Comparison' },
      { id: 'previous-period', label: 'Previous Period' },
      { id: 'year-over-year', label: 'Year Over Year' },
      { id: 'custom', label: 'Custom Period' }
    ]
  };
}
