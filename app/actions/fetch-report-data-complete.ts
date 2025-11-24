"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser } from "@/lib/auth"
import { ReportType, TimeRange, ReportRequest } from "./reports"
import { format, subDays, subMonths, subYears, startOfYear } from "date-fns"

// Fetch data for reports based on type and time range
export async function fetchReportData(reportType: ReportType, timeRange: TimeRange, options?: Partial<ReportRequest>) {
  // Try to use admin client first to bypass RLS policies
  let supabase = await createAdminSupabaseClient()
  
  // Fall back to regular client if admin client fails
  if (!supabase) {
    supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }
  }
  
  // Get authenticated user with fallback for non-authenticated users
  let user: any
  try {
    user = await getAuthenticatedUser()
    
    if (!user) {
      // Use a default UUID for non-authenticated users
      user = { id: '00000000-0000-0000-0000-000000000000' }
    }
  } catch (error) {
    // Fallback for authentication errors
    user = { id: '00000000-0000-0000-0000-000000000000' }
    console.warn("Using default user ID for report data")
  }
  
  // Get time range filter
  const timeFilter = getTimeRangeFilter(timeRange, options?.customDateRange)
  let data: any[] = []
  
  // Apply data filters from options if provided
  const filters = options?.dataFilters || {}
  
  try {
    switch (reportType) {
      case 'overview':
        // Fetch overview data (transactions, income, expenses, net worth)
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', timeFilter.start.toISOString())
          .lte('created_at', timeFilter.end.toISOString())
        
        // Apply filters if provided
        if (filters.categories && filters.categories.length > 0) {
          query = query.in('category', filters.categories)
        }
        
        if (filters.accounts && filters.accounts.length > 0) {
          query = query.in('account', filters.accounts)
        }
        
        if (filters.tags && filters.tags.length > 0) {
          query = query.contains('tags', filters.tags)
        }
        
        if (typeof filters.minAmount === 'number') {
          query = query.gte('amount', filters.minAmount)
        }
        
        if (typeof filters.maxAmount === 'number') {
          query = query.lte('amount', filters.maxAmount)
        }
        
        // Apply sorting
        const sortBy = options?.sortBy || 'date'
        const sortDirection = options?.sortDirection || 'desc'
        
        if (sortBy === 'date') {
          query = query.order('created_at', { ascending: sortDirection === 'asc' })
        } else if (sortBy === 'amount') {
          query = query.order('amount', { ascending: sortDirection === 'asc' })
        } else if (sortBy === 'name') {
          query = query.order('name', { ascending: sortDirection === 'asc' })
        } else if (sortBy === 'category') {
          query = query.order('category', { ascending: sortDirection === 'asc' })
        }
        
        const { data: transactions, error: transactionsError } = await query
        
        if (!transactionsError && transactions) {
          // Process and enrich the data
          data = transactions.map((transaction: any) => {
            // Get account and payment information - use actual data without placeholders
            const accountName = transaction.account_name || transaction.account || '';
            const paymentMethod = transaction.payment_method || '';
            
            // Format date and time with validation
            let formattedDate = '';
            let formattedTime = '';
            try {
              if (transaction.created_at && !isNaN(new Date(transaction.created_at).getTime())) {
                const createdDate = new Date(transaction.created_at);
                formattedDate = createdDate.toLocaleDateString();
                formattedTime = createdDate.toLocaleTimeString();
              }
            } catch (error) {
              // Leave empty if there's an error
            }
            
            // Format amount with currency
            const formattedAmount = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(transaction.amount || 0);
            
            return {
              ...transaction,
              formatted_date: formattedDate,
              formatted_time: formattedTime,
              formatted_amount: formattedAmount,
              account_name: accountName,
              payment_method: paymentMethod,
              name: transaction.name || transaction.title || '',
              location: transaction.location || '',
              recurring: transaction.is_recurring || false,
              notes: transaction.notes || '',
              status: transaction.status || ''
            };
          });
          
          // Apply grouping if specified
          if (options?.groupBy) {
            data = groupDataBy(data, options.groupBy);
          }
          
          // If comparison is requested, fetch comparison data
          if (options?.comparisonType && options.comparisonType !== 'none') {
            const comparisonData = await fetchComparisonData('overview', options, user.id, supabase);
            if (comparisonData.length > 0) {
              // Add comparison data to the result
              data = addComparisonData(data, comparisonData, options.comparisonType || 'previous-period');
            }
          }
        } else if (transactionsError) {
          console.error("Error fetching transactions:", transactionsError);
        }
        break;
        
      case 'income-expense':
        // Fetch income and expense data with advanced filtering
        let incomeExpenseQuery = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .in('type', ['income', 'expense'])
          .gte('created_at', timeFilter.start.toISOString())
          .lte('created_at', timeFilter.end.toISOString())
        
        // Apply filters if provided
        if (filters.categories && filters.categories.length > 0) {
          incomeExpenseQuery = incomeExpenseQuery.in('category', filters.categories)
        }
        
        if (filters.accounts && filters.accounts.length > 0) {
          incomeExpenseQuery = incomeExpenseQuery.in('account', filters.accounts)
        }
        
        if (filters.tags && filters.tags.length > 0) {
          incomeExpenseQuery = incomeExpenseQuery.contains('tags', filters.tags)
        }
        
        if (typeof filters.minAmount === 'number') {
          incomeExpenseQuery = incomeExpenseQuery.gte('amount', filters.minAmount)
        }
        
        if (typeof filters.maxAmount === 'number') {
          incomeExpenseQuery = incomeExpenseQuery.lte('amount', filters.maxAmount)
        }
        
        // Apply sorting
        const ieSortBy = options?.sortBy || 'date'
        const ieSortDirection = options?.sortDirection || 'desc'
        
        if (ieSortBy === 'date') {
          incomeExpenseQuery = incomeExpenseQuery.order('created_at', { ascending: ieSortDirection === 'asc' })
        } else if (ieSortBy === 'amount') {
          incomeExpenseQuery = incomeExpenseQuery.order('amount', { ascending: ieSortDirection === 'asc' })
        } else if (ieSortBy === 'name') {
          incomeExpenseQuery = incomeExpenseQuery.order('name', { ascending: ieSortDirection === 'asc' })
        } else if (ieSortBy === 'category') {
          incomeExpenseQuery = incomeExpenseQuery.order('category', { ascending: ieSortDirection === 'asc' })
        }
        
        const { data: incomeExpense, error: incomeExpenseError } = await incomeExpenseQuery
        
        if (!incomeExpenseError && incomeExpense) {
          // Process and enrich the data
          data = incomeExpense.map((item: any) => {
            // Get account and payment information with validation
            const accountName = item.account_name || item.account || '';
            const paymentMethod = item.payment_method || '';
            
            // Format date and time with validation
            let formattedDate = '';
            let formattedTime = '';
            try {
              if (item.created_at && !isNaN(new Date(item.created_at).getTime())) {
                const createdDate = new Date(item.created_at);
                formattedDate = createdDate.toLocaleDateString();
                formattedTime = createdDate.toLocaleTimeString();
              }
            } catch (error) {
              // Leave empty if there's an error
            }
            
            // Format amount with currency
            const formattedAmount = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(item.amount || 0);
            
            return {
              ...item,
              formatted_date: formattedDate,
              formatted_time: formattedTime,
              formatted_amount: formattedAmount,
              account_name: accountName,
              payment_method: paymentMethod,
              name: item.name || item.title || '',
              location: item.location || '',
              recurring: item.is_recurring || false,
              frequency: item.frequency || '',
              tax_deductible: item.tax_deductible || false,
              notes: item.notes || '',
              status: item.status || ''
            };
          });
          
          // Apply grouping if specified
          if (options?.groupBy) {
            data = groupDataBy(data, options.groupBy);
          }
          
          // If comparison is requested, fetch comparison data
          if (options?.comparisonType && options.comparisonType !== 'none') {
            const comparisonData = await fetchComparisonData('income-expense', options, user.id, supabase);
            if (comparisonData.length > 0) {
              // Add comparison data to the result
              data = addComparisonData(data, comparisonData, options.comparisonType || 'previous-period');
            }
          }
        } else if (incomeExpenseError) {
          console.error("Error fetching income/expense data:", incomeExpenseError);
        }
        break;
        
      // Add other report types with similar enhancements
      // ...
    }
    
    return data
  } catch (error) {
    console.error(`Error fetching data for ${reportType} report:`, error)
    return []
  }
}

// Helper function to get date range from time range
function getTimeRangeFilter(timeRange: TimeRange, customDateRange?: { startDate: string, endDate: string }): { start: Date, end: Date } {
  // If custom date range is provided and timeRange is 'custom', use it
  if (timeRange === 'custom' && customDateRange) {
    try {
      const start = new Date(customDateRange.startDate)
      const end = new Date(customDateRange.endDate)
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return { start, end }
      }
    } catch (error) {
      console.error('Error parsing custom date range:', error)
    }
  }
  
  const end = new Date()
  let start = new Date()
  
  switch (timeRange) {
    case '7d':
      start = subDays(end, 7)
      break
    case '30d':
      start = subDays(end, 30)
      break
    case '90d':
      start = subDays(end, 90)
      break
    case '1y':
      start = subYears(end, 1)
      break
    case 'ytd':
      start = startOfYear(end)
      break
    case 'all':
      start = new Date(2000, 0, 1) // Far in the past
      break
    default:
      start = subDays(end, 30) // Default to 30 days
  }
  
  return { start, end }
}

// Group data by specified field
function groupDataBy(data: any[], groupBy: string): any[] {
  if (!groupBy || !data.length) return data
  
  const groupedData: Record<string, any[]> = {}
  
  data.forEach(item => {
    let groupKey = ''
    
    switch (groupBy) {
      case 'day':
        if (item.created_at) {
          groupKey = format(new Date(item.created_at), 'yyyy-MM-dd')
        }
        break
      case 'week':
        if (item.created_at) {
          const date = new Date(item.created_at)
          const year = date.getFullYear()
          const weekNum = Math.ceil((((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7)
          groupKey = `${year}-W${weekNum}`
        }
        break
      case 'month':
        if (item.created_at) {
          groupKey = format(new Date(item.created_at), 'yyyy-MM')
        }
        break
      case 'quarter':
        if (item.created_at) {
          const date = new Date(item.created_at)
          const year = date.getFullYear()
          const quarter = Math.floor(date.getMonth() / 3) + 1
          groupKey = `${year}-Q${quarter}`
        }
        break
      case 'year':
        if (item.created_at) {
          groupKey = format(new Date(item.created_at), 'yyyy')
        }
        break
      case 'category':
        groupKey = item.category || ''
        break
      case 'account':
        groupKey = item.account_name || item.account || ''
        break
      case 'tag':
        if (Array.isArray(item.tags) && item.tags.length) {
          // Create a group for each tag
          item.tags.forEach((tag: string) => {
            if (!groupedData[tag]) {
              groupedData[tag] = []
            }
            groupedData[tag].push(item)
          })
          return // Skip the default grouping below
        } else {
          groupKey = 'No Tags'
        }
        break
      default:
        groupKey = 'All'
    }
    
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = []
    }
    
    groupedData[groupKey].push(item)
  })
  
  // Convert the grouped data to an array of groups
  return Object.entries(groupedData).map(([key, items]) => {
    // Calculate summary metrics for the group
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)
    const avgAmount = items.length ? totalAmount / items.length : 0
    
    return {
      group_key: key,
      group_name: formatGroupName(key, groupBy),
      items: items,
      count: items.length,
      total_amount: totalAmount,
      average_amount: avgAmount,
      formatted_total: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount),
      formatted_average: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(avgAmount)
    }
  })
}

// Format group name for display
function formatGroupName(key: string, groupBy: string): string {
  if (!key) return ''
  
  switch (groupBy) {
    case 'day':
      try {
        return format(new Date(key), 'MMMM d, yyyy')
      } catch (e) {
        return key
      }
    case 'week':
      const [year, week] = key.split('-W')
      return `Week ${week}, ${year}`
    case 'month':
      try {
        return format(new Date(key + '-01'), 'MMMM yyyy')
      } catch (e) {
        return key
      }
    case 'quarter':
      const [qYear, quarter] = key.split('-Q')
      return `Q${quarter} ${qYear}`
    case 'year':
      return key
    default:
      return key
  }
}

// Fetch comparison data for a given report type
async function fetchComparisonData(reportType: ReportType, options: Partial<ReportRequest>, userId: string, supabase: any): Promise<any[]> {
  if (!options.comparisonType || options.comparisonType === 'none') {
    return []
  }
  
  let comparisonTimeRange: TimeRange = '30d'
  let customDateRange = undefined
  
  // Determine comparison time range
  if (options.comparisonType === 'previous-period') {
    comparisonTimeRange = options.timeRange || '30d'
    // The custom date range will be calculated in getComparisonTimeFilter
  } else if (options.comparisonType === 'year-over-year') {
    comparisonTimeRange = options.timeRange || '30d'
    // The year-over-year range will be calculated in getComparisonTimeFilter
  } else if (options.comparisonType === 'custom' && options.comparisonTimeRange) {
    comparisonTimeRange = options.comparisonTimeRange
    customDateRange = options.comparisonCustomDateRange
  }
  
  // Get comparison time filter
  const comparisonTimeFilter = getComparisonTimeFilter(
    options.timeRange || '30d',
    comparisonTimeRange,
    options.comparisonType || 'previous-period',
    options.customDateRange,
    customDateRange
  )
  
  try {
    // Fetch data for the comparison period using the same logic as the main fetch
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
    
    // Add type filter for income-expense report
    if (reportType === 'income-expense') {
      query = query.in('type', ['income', 'expense'])
    }
    
    // Add date range filter
    query = query
      .gte('created_at', comparisonTimeFilter.start.toISOString())
      .lte('created_at', comparisonTimeFilter.end.toISOString())
    
    // Apply the same filters as the main query
    const filters = options.dataFilters || {}
    
    if (filters.categories && filters.categories.length > 0) {
      query = query.in('category', filters.categories)
    }
    
    if (filters.accounts && filters.accounts.length > 0) {
      query = query.in('account', filters.accounts)
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }
    
    if (typeof filters.minAmount === 'number') {
      query = query.gte('amount', filters.minAmount)
    }
    
    if (typeof filters.maxAmount === 'number') {
      query = query.lte('amount', filters.maxAmount)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error(`Error fetching comparison data for ${reportType}:`, error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error(`Error in fetchComparisonData for ${reportType}:`, error)
    return []
  }
}

// Get time filter for comparison period
function getComparisonTimeFilter(
  mainTimeRange: TimeRange,
  comparisonTimeRange: TimeRange,
  comparisonType: string,
  mainCustomRange?: { startDate: string, endDate: string },
  comparisonCustomRange?: { startDate: string, endDate: string }
): { start: Date, end: Date } {
  // For custom comparison with its own date range
  if (comparisonType === 'custom' && comparisonTimeRange === 'custom' && comparisonCustomRange) {
    try {
      const start = new Date(comparisonCustomRange.startDate)
      const end = new Date(comparisonCustomRange.endDate)
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return { start, end }
      }
    } catch (error) {
      console.error('Error parsing custom comparison date range:', error)
    }
  }
  
  // Get the main time filter first
  const mainFilter = getTimeRangeFilter(mainTimeRange, mainCustomRange)
  
  // For previous period, shift the date range back by the same duration
  if (comparisonType === 'previous-period') {
    const mainDuration = mainFilter.end.getTime() - mainFilter.start.getTime()
    const comparisonEnd = new Date(mainFilter.start.getTime())
    const comparisonStart = new Date(comparisonEnd.getTime() - mainDuration)
    
    return { start: comparisonStart, end: comparisonEnd }
  }
  
  // For year-over-year, shift the date range back by exactly one year
  if (comparisonType === 'year-over-year') {
    const comparisonStart = new Date(mainFilter.start)
    comparisonStart.setFullYear(comparisonStart.getFullYear() - 1)
    
    const comparisonEnd = new Date(mainFilter.end)
    comparisonEnd.setFullYear(comparisonEnd.getFullYear() - 1)
    
    return { start: comparisonStart, end: comparisonEnd }
  }
  
  // For other cases, just use the comparison time range directly
  return getTimeRangeFilter(comparisonTimeRange)
}

// Add comparison data to the main data
function addComparisonData(mainData: any[], comparisonData: any[], comparisonType: string): any[] {
  // If either dataset is empty, return the main data unchanged
  if (!mainData.length || !comparisonData.length) {
    return mainData
  }
  
  // For grouped data, add comparison metrics to each group
  if (mainData[0].group_key) {
    return mainData.map(group => {
      // Find matching group in comparison data
      let matchingGroup
      
      if (comparisonType === 'year-over-year' && group.group_key.includes('-')) {
        // For year-over-year with date-based groups, match by month/day but different year
        const keyParts = group.group_key.split('-')
        if (keyParts.length >= 2) {
          const pattern = keyParts.slice(1).join('-') // Match everything after the year
          matchingGroup = comparisonData.find((cg: any) => cg.group_key?.endsWith(pattern))
        }
      } else {
        // For other comparison types, match by exact group key
        matchingGroup = comparisonData.find((cg: any) => cg.group_key === group.group_key)
      }
      
      if (matchingGroup) {
        const totalDiff = group.total_amount - matchingGroup.total_amount
        const percentChange = matchingGroup.total_amount !== 0 
          ? (totalDiff / Math.abs(matchingGroup.total_amount)) * 100 
          : (group.total_amount !== 0 ? 100 : 0)
        
        return {
          ...group,
          comparison_total: matchingGroup.total_amount,
          comparison_formatted_total: matchingGroup.formatted_total,
          total_difference: totalDiff,
          formatted_difference: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalDiff),
          percent_change: percentChange.toFixed(2) + '%',
          is_increase: totalDiff > 0
        }
      }
      
      return group
    })
  }
  
  // For ungrouped data, add overall comparison metrics
  const mainTotal = mainData.reduce((sum, item) => sum + (item.amount || 0), 0)
  const comparisonTotal = comparisonData.reduce((sum, item) => sum + (item.amount || 0), 0)
  const totalDiff = mainTotal - comparisonTotal
  const percentChange = comparisonTotal !== 0 
    ? (totalDiff / Math.abs(comparisonTotal)) * 100 
    : (mainTotal !== 0 ? 100 : 0)
  
  // Add comparison metrics to each item in the main data
  return mainData.map(item => ({
    ...item,
    comparison_total: comparisonTotal,
    comparison_formatted_total: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(comparisonTotal),
    total_difference: totalDiff,
    formatted_difference: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalDiff),
    percent_change: percentChange.toFixed(2) + '%',
    is_increase: totalDiff > 0
  }))
}
