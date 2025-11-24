"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { ReportType, TimeRange, ReportRequest } from "./reports"
import { format, subDays, subMonths, subYears, startOfYear } from "date-fns"

// Fetch data for reports based on type and time range
export async function fetchReportData(reportType: ReportType, timeRange: TimeRange, options?: Partial<ReportRequest>) {
  const supabase = await createServerSupabaseClient()
  
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }
  
  const user = await getAuthenticatedUser()
  
  if (!user) {
    throw new Error("Authentication required")
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
              // No else clause - leave empty if invalid date
            } catch (error) {
              // Leave empty if there's an error
              formattedDate = '';
              formattedTime = '';
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
              // Leave empty if invalid date
            } catch (error) {
              // Leave empty if there's an error
              formattedDate = '';
              formattedTime = '';
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
