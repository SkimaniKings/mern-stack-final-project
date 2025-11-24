"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser } from "@/lib/auth"
import { format } from "date-fns"
import { revalidatePath } from "next/cache"
import { fetchIncomeData, fetchExpenseData, fetchDebtData, fetchSubscriptionData, fetchReportData as fetchReportDataFields } from "./report-data-provider"
import { PostgrestError } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"
import { generateReportByFormat } from "@/lib/report-generators-updated"

// Types for report data
export type ReportType = 
  | 'overview' 
  | 'income-expense' 
  | 'net-worth' 
  | 'investments' 
  | 'budget-analysis' 
  | 'spending-categories' 
  | 'income-sources' 
  | 'expense-trends' 
  | 'savings-goals' 
  | 'debt-analysis' 
  | 'investment-performance' 
  | 'custom'
export type ReportFormat = 'pdf' | 'csv' | 'excel'
export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'ytd' | 'all' | 'custom'

export type ReportRequest = {
  type: ReportType
  format: ReportFormat
  timeRange: TimeRange
  title?: string
  description?: string
  customDateRange?: {
    startDate: string
    endDate: string
  }
  comparisonType?: 'previous-period' | 'year-over-year' | 'custom' | 'none'
  comparisonTimeRange?: TimeRange
  comparisonCustomDateRange?: {
    startDate: string
    endDate: string
  }
  dataFilters?: {
    categories?: string[]
    accounts?: string[]
    tags?: string[]
    minAmount?: number
    maxAmount?: number
  }
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'category' | 'account' | 'tag'
  sortBy?: 'date' | 'amount' | 'name' | 'category'
  sortDirection?: 'asc' | 'desc'
  includeCharts?: boolean
  chartTypes?: ('bar' | 'line' | 'pie' | 'area' | 'scatter')[] 
  customFields?: Record<string, any>
}

export type Report = {
  id: string
  user_id: string
  title: string
  description: string | null
  type: ReportType
  format: ReportFormat
  time_range: TimeRange
  file_url: string | null
  created_at: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
}

// Ensure reports table exists
async function ensureReportsTableExists() {
  const supabase = await createServerSupabaseClient()
  
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }
  
  try {
    // Check if reports table exists
    const { error: tableCheckError } = await supabase
      .from('reports')
      .select('id')
      .limit(1)
      .throwOnError()
    
    if (!tableCheckError) {
      // Table exists, no need to create it
      return true
    }
  } catch (error: unknown) {
    const pgError = error as PostgrestError
    if (pgError.code !== '42P01') {
      // If it's not a "table doesn't exist" error, rethrow
      throw error
    }
    
    // Table doesn't exist, inform about the migration script
//     console.warn(`
// ==========================================================================
// REPORTS TABLE MISSING
// ==========================================================================
// The reports table does not exist in your database. Please run the migration
// script to create it:

// Option 1: Using the Supabase Dashboard (Recommended)
// 1. Log in to your Supabase dashboard
// 2. Navigate to the SQL Editor
// 3. Create a new query
// 4. Copy and paste the contents of 'migrations/create_reports_table.sql'
// 5. Run the query

// Option 2: Using the Migration Script
// Run: node scripts/run-reports-migration.js

// For more information, see README-REPORTS.md
// ==========================================================================
//     `)
    
    // Create a temporary table in memory to handle operations until the real table is created
    global._tempReportsTable = global._tempReportsTable || []
    
    return true
  }
  
  return true
}

// Get all reports for the current user
export async function getReports() {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }
    
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    // Ensure reports table exists
    await ensureReportsTableExists()

    // Check if we're using a temporary in-memory table
    if (global._tempReportsTable) {
      return global._tempReportsTable.filter(report => report.user_id === user.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching reports:", error)
      return []
    }

    return data as Report[]
  } catch (error: unknown) {
    console.error("Unexpected error in getReports:", error)
    return []
  }
}

// Get a specific report by ID
export async function getReportById(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }
    
    const user = await getAuthenticatedUser()

    if (!user) {
      return null
    }

    // Ensure reports table exists
    await ensureReportsTableExists()

    // Check if we're using a temporary in-memory table
    if (global._tempReportsTable) {
      return global._tempReportsTable.find(report => report.id === id && report.user_id === user.id) || null;
    }

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error("Error fetching report:", error)
      return null
    }

    return data as Report
  } catch (error: unknown) {
    console.error("Unexpected error in getReportById:", error)
    return null
  }
}

// Generate a new report
export async function generateReport(reportRequest: ReportRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }
    
    // Try to get the authenticated user from the session
    const { data: sessionData } = await supabase.auth.getSession()
    let user = sessionData?.session?.user || null
    
    // For development purposes, create a mock user if authentication fails
    if (!user && process.env.NODE_ENV === 'development') {
      console.log('Creating mock user for development testing')
      user = {
        id: 'dev-test-user-id',
        email: 'dev@example.com',
        role: 'authenticated',
        app_metadata: { provider: 'email' },
        user_metadata: { full_name: 'Development User' },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      }
    } else if (!user) {
      throw new Error("Authentication required")
    }

    const { type, format, timeRange, title, description } = reportRequest

    // Default title if not provided
    const reportTitle = title || `${formatReportType(type)} Report - ${format.toUpperCase()}`

    // Ensure reports table exists
    await ensureReportsTableExists()

    // Create a new report record
    const newReport: Report = {
      id: uuidv4(),
      user_id: user.id,
      title: reportTitle,
      description: description || null,
      type,
      format,
      time_range: timeRange,
      file_url: null,
      created_at: new Date().toISOString(),
      status: 'pending',
      error_message: null
    };

    // Check if we're using a temporary in-memory table
    if (global._tempReportsTable) {
      global._tempReportsTable.push(newReport);
      
      // Start the report generation process
      setTimeout(async () => {
        await processReport(newReport.id)
      }, 1000)
      
      return newReport;
    }

    const { data, error } = await supabase
      .from('reports')
      .insert([
        {
          user_id: user.id,
          title: reportTitle,
          description,
          type,
          format,
          time_range: timeRange,
          status: 'pending'
        }
      ])
      .select()

    if (error) {
      console.error("Error creating report:", error)
      throw new Error("Failed to create report")
    }

    const report = data[0] as Report
    
    // Start the report generation process
    // In a production environment, this would be handled by a background job
    setTimeout(async () => {
      await processReport(report.id)
    }, 1000)

    return report
  } catch (error: unknown) {
    console.error("Error in generateReport:", error)
    throw error
  }
}

// Process a report
async function processReport(reportId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }
    
    // Check if we're using a temporary in-memory table
    if (global._tempReportsTable) {
      const reportIndex = global._tempReportsTable.findIndex(r => r.id === reportId);
      if (reportIndex >= 0) {
        // Update status to processing
        global._tempReportsTable[reportIndex].status = 'processing';
        
        // Get report details
        const report = global._tempReportsTable[reportIndex];
        
        // Generate the actual report based on type and format
        try {
          const fileUrl = await generateReportFile(report);
          
          // Update report with completed status and file URL
          global._tempReportsTable[reportIndex].status = 'completed';
          global._tempReportsTable[reportIndex].file_url = fileUrl;
        } catch (error) {
          global._tempReportsTable[reportIndex].status = 'failed';
          global._tempReportsTable[reportIndex].error_message = 
            `Error processing report: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
      return;
    }
    
    // Update status to processing
    await supabase
      .from('reports')
      .update({ status: 'processing' })
      .eq('id', reportId)
    
    // Get report details
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single()
    
    if (reportError || !report) {
      throw new Error(`Report not found: ${reportError?.message || 'Unknown error'}`)
    }
    
    // Generate the actual report based on type and format
    const fileUrl = await generateReportFile(report)
    
    // Update report with completed status and file URL
    await supabase
      .from('reports')
      .update({ 
        status: 'completed',
        file_url: fileUrl,
      })
      .eq('id', reportId)
  } catch (error: unknown) {
    console.error("Error processing report:", error)
    
    // Check if we're using a temporary in-memory table
    if (global._tempReportsTable) {
      const reportIndex = global._tempReportsTable.findIndex(r => r.id === reportId);
      if (reportIndex >= 0) {
        global._tempReportsTable[reportIndex].status = 'failed';
        global._tempReportsTable[reportIndex].error_message = 
          `Error processing report: ${error instanceof Error ? error.message : String(error)}`;
      }
      return;
    }
    
    // Update report with failed status
    const supabase = await createServerSupabaseClient()
    await supabase
      .from('reports')
      .update({ 
        status: 'failed',
        error_message: `Error processing report: ${error instanceof Error ? error.message : String(error)}`
      })
      .eq('id', reportId)
  }
}

// Ensure reports storage bucket exists with proper RLS policies
async function ensureReportsStorageBucket() {
  try {
    // Use admin client to bypass RLS policies
    const adminClient = await createAdminSupabaseClient()
    
    if (!adminClient) {
      console.warn('Warning: Failed to create admin client for storage setup')
      return false
    }
    
    // Check if the reports bucket already exists
    const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets()
    
    if (bucketsError) {
      console.warn('Warning: Error listing storage buckets:', bucketsError)
      return false
    }
    
    const reportsBucketExists = buckets.some(bucket => bucket.name === 'reports')
    
    if (!reportsBucketExists) {
      // Create the reports bucket with admin client
      const { error: createError } = await adminClient.storage.createBucket('reports', {
        public: false,
        fileSizeLimit: 20971520, // 20MB
        allowedMimeTypes: [
          'application/json',
          'application/pdf',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]
      })
      
      if (createError) {
        console.warn('Warning: Error creating reports bucket:', createError)
        return false
      }
      
      // Execute the SQL function to set up proper RLS policies
      // @ts-ignore - TypeScript error with rpc typing
      const { error: rpcError } = await adminClient.rpc('create_reports_bucket_with_policies')
      
      if (rpcError) {
        console.warn('Warning: Error setting up reports bucket policies:', rpcError)
      }
    }
    
    return true
  } catch (error) {
    console.warn('Warning: Error setting up reports storage bucket:', error)
    // Continue execution - we'll handle failures gracefully
    return false
  }
}

// Generate the actual report file
async function generateReportFile(report: Report): Promise<string> {
  const supabase = await createServerSupabaseClient()
  
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }
  
  // Ensure the reports storage bucket exists before attempting to upload
  await ensureReportsStorageBucket()
  
  // Get the authenticated user ID
  let userId = report.user_id
  
  // If no user ID is provided, try to get the authenticated user
  if (!userId || userId === 'default-user') {
    try {
      const user = await getAuthenticatedUser()
      if (user && user.id) {
        userId = user.id
      } else {
        throw new Error('User not authenticated')
      }
    } catch (error) {
      throw new Error('Authentication required to generate reports')
    }
  }
  
  try {
    // Fetch data based on report type and time range
    let data: any[] = []
    const timeFilter = getTimeRangeFilter(report.time_range)
    
    switch (report.type) {
      case 'income-sources':
        // Fetch income sources data
        try {
          // Use the fetchIncomeData function to get the data
          const incomeSourcesData = await fetchIncomeData(timeFilter);
          
          // Log what we received
          console.log('Raw income sources data:', incomeSourcesData);
          
          if (incomeSourcesData && Array.isArray(incomeSourcesData)) {
            // If the data is already an array, use it directly
            data = incomeSourcesData;
            console.log('Using income data array with length:', incomeSourcesData.length);
            
            console.log('Income sources data prepared for report:', { 
              dataLength: data.length,
              firstItem: data.length > 0 ? JSON.stringify(data[0]).substring(0, 100) + '...' : 'none'
            });
          } else {
            console.warn('Income sources data is not in expected format:', typeof incomeSourcesData);
            data = [];
          }
        } catch (error) {
          console.error('Error fetching income sources data:', error);
          console.log('Using empty data set for income sources');
          data = [];
        }
        break;
        
      case 'overview':
        // Fetch overview data (expenses, income, budgets)
        try {
          // Fetch expenses
          const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .gte('date', timeFilter.start.toISOString())
            .lte('date', timeFilter.end.toISOString())
            .order('date', { ascending: false })
            .limit(100)
          
          // Fetch income
          const { data: income, error: incomeError } = await supabase
            .from('incomes')
            .select('*')
            .eq('user_id', userId)
            .gte('start_date', timeFilter.start.toISOString())
            .lte('start_date', timeFilter.end.toISOString())
            .order('start_date', { ascending: false })
            .limit(100)
          
          // Fetch budgets
          const { data: budgets, error: budgetsError } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)
          
          if (expenses || income || budgets) {
            data = {
              expenses: expenses || [],
              income: income || [],
              budgets: budgets || [],
              summary: {
                totalExpenses: expenses ? expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0) : 0,
                totalIncome: income ? income.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0) : 0,
                budgetCount: budgets ? budgets.length : 0
              }
            }
          }
          
          console.log('Overview data fetched:', { 
            expensesCount: expenses?.length || 0,
            incomeCount: income?.length || 0,
            budgetsCount: budgets?.length || 0
          })
        } catch (error) {
          console.error('Error fetching overview data:', error)
          console.log('Using empty data set for overview')
        }
        break

      case 'income-expense':
        // Fetch income and expense data
        try {
          // Fetch expenses
          const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('*, expense_categories(name, color)')
            .eq('user_id', userId)
            .gte('date', timeFilter.start.toISOString())
            .lte('date', timeFilter.end.toISOString())
            .order('date', { ascending: false })
          
          // Fetch income
          const { data: income, error: incomeError } = await supabase
            .from('income')
            .select('*, income_categories(name, color)')
            .eq('user_id', userId)
            .gte('date', timeFilter.start.toISOString())
            .lte('date', timeFilter.end.toISOString())
            .order('date', { ascending: false })
          
          // Combine and process data
          if ((expenses && !expensesError) || (income && !incomeError)) {
            // Calculate monthly totals
            const monthlyData = {};
            
            // Process expenses by month
            expenses?.forEach(expense => {
              const date = new Date(expense.date);
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              
              if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { expenses: 0, income: 0 };
              }
              
              monthlyData[monthKey].expenses += parseFloat(expense.amount) || 0;
            });
            
            // Process income by month
            income?.forEach(inc => {
              const date = new Date(inc.date);
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              
              if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { expenses: 0, income: 0 };
              }
              
              monthlyData[monthKey].income += parseFloat(inc.amount) || 0;
            });
            
            data = {
              expenses: expenses || [],
              income: income || [],
              monthlyTotals: Object.entries(monthlyData).map(([month, values]) => ({
                month,
                ...values,
                net: (values.income - values.expenses)
              })).sort((a, b) => a.month.localeCompare(b.month)),
              summary: {
                totalExpenses: expenses ? expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0) : 0,
                totalIncome: income ? income.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0) : 0,
                netCashflow: (income ? income.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0) : 0) - 
                             (expenses ? expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0) : 0)
              }
            };
            
            console.log('Income/Expense data fetched:', { 
              expensesCount: expenses?.length || 0,
              incomeCount: income?.length || 0,
              monthsCount: Object.keys(monthlyData).length
            });
          }
        } catch (error) {
          console.error('Error fetching income/expense data:', error);
          console.log('Using empty data set for income/expense');
        }
        break
        
      case 'net-worth':
        // Fetch net worth data using accounts and their balances
        try {
          // Fetch accounts
          const { data: accounts, error: accountsError } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
          
          if (!accountsError && accounts && accounts.length > 0) {
            // Categorize accounts as assets or liabilities
            const assets = accounts.filter(account => 
              account.type === 'checking' || 
              account.type === 'savings' || 
              account.type === 'investment' || 
              account.type === 'cash' ||
              account.type === 'other_asset'
            );
            
            const liabilities = accounts.filter(account => 
              account.type === 'credit_card' || 
              account.type === 'loan' || 
              account.type === 'mortgage' ||
              account.type === 'other_liability'
            );
            
            // Calculate totals
            const totalAssets = assets.reduce((sum, asset) => sum + (parseFloat(asset.current_balance) || 0), 0);
            const totalLiabilities = liabilities.reduce((sum, liability) => sum + (parseFloat(liability.current_balance) || 0), 0);
            const netWorth = totalAssets - totalLiabilities;
            
            data = {
              assets,
              liabilities,
              summary: {
                totalAssets,
                totalLiabilities,
                netWorth
              }
            };
            
            console.log('Net worth data fetched:', { 
              assetsCount: assets.length, 
              liabilitiesCount: liabilities.length,
              netWorth
            });
          }
        } catch (error) {
          console.error('Error fetching net worth data:', error);
          console.log('Using empty data set for net worth');
        }
        break
        
      case 'investments':
        // Fetch investment data from accounts and investments tables
        try {
          // Fetch investment accounts
          const { data: investmentAccounts, error: accountsError } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', userId)
            .eq('type', 'investment')
            .order('created_at', { ascending: false })
          
          // Fetch subscriptions (as investments)
          const { data: subscriptions, error: subscriptionsError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
          
          if ((!accountsError && investmentAccounts) || (!subscriptionsError && subscriptions)) {
            // Calculate total investment value
            const totalInvestments = investmentAccounts ? 
              investmentAccounts.reduce((sum, acct) => sum + (parseFloat(acct.current_balance) || 0), 0) : 0;
            
            // Calculate total subscription costs
            const totalSubscriptions = subscriptions ?
              subscriptions.reduce((sum, sub) => sum + (parseFloat(sub.amount) || 0), 0) : 0;
            
            data = {
              investmentAccounts: investmentAccounts || [],
              subscriptions: subscriptions || [],
              summary: {
                totalInvestments,
                totalSubscriptions,
                accountCount: investmentAccounts?.length || 0,
                subscriptionCount: subscriptions?.length || 0
              }
            };
            
            console.log('Investment data fetched:', { 
              accountsCount: investmentAccounts?.length || 0, 
              subscriptionsCount: subscriptions?.length || 0
            });
          }
        } catch (error) {
          console.error('Error fetching investment data:', error);
          console.log('Using empty data set for investments');
        }
        break
    }
    
    // Create a unique filename
    const filename = `${report.type}_${report.format}_${uuidv4()}.${getFileExtension(report.format)}`
    
    // Prepare file path for storage
    const filePath = `reports/${userId}/${filename}`
    
    // Generate the actual report file using the data we fetched
    console.log(`Generating ${report.format} report for ${report.type} with ${Array.isArray(data) ? data.length : 'object'} records`)
    
    // Use the report generator to create the actual report file
    let reportBlob: Blob
    try {
      // Map report type to the format expected by the report generator
      let reportType = report.type
      if (report.type === 'income-sources') reportType = 'income'
      else if (report.type === 'expense-trends') reportType = 'expenses'
      
      // Generate the report using the fetched data
      reportBlob = generateReportByFormat(data, {
        ...report,
        type: reportType as any // Cast to satisfy TypeScript
      })
      
      console.log(`Successfully generated ${report.format} report, size: ${reportBlob.size} bytes`)
    } catch (error) {
      console.error('Error generating report file:', error)
      throw new Error(`Failed to generate ${report.format} report: ${error.message}`)
    }
    
    // Create metadata for the report
    const metadata = {
      report_id: report.id,
      report_type: report.type,
      report_format: report.format,
      time_range: report.time_range,
      generated_at: new Date().toISOString(),
      record_count: Array.isArray(data) ? data.length : Object.keys(data || {}).length,
      user_id: userId,
      is_authenticated: report.user_id !== 'default-user',
      file_size: reportBlob.size
    }
    
    // Convert metadata to string for the metadata file
    const metadataStr = JSON.stringify(metadata, null, 2)
    const metadataFilePath = `reports/${userId}/${report.id}_metadata.json`
    
    // Try to use admin client first to bypass RLS policies
    const adminClient = createAdminSupabaseClient()
    
    if (adminClient) {
      try {
        console.log('Using admin client for report file upload')
        
        // Upload the actual report file using admin client
        const { error: reportUploadError } = await adminClient.storage
          .from('reports')
          .upload(filePath, reportBlob, {
            contentType: getContentType(report.format),
            cacheControl: '3600',
            upsert: true
          })
        
        if (reportUploadError) {
          console.error('Error uploading report file:', reportUploadError)
          throw new Error(`Failed to upload report file: ${reportUploadError.message}`)
        }
        
        // Upload metadata file using admin client to bypass RLS
        const { error: adminUploadError } = await adminClient.storage
          .from('reports')
          .upload(metadataFilePath, metadataStr, {
            contentType: 'application/json',
            cacheControl: '3600',
            upsert: true
          })
          
        if (!adminUploadError) {
          // Get public URL for the file using admin client
          const { data: urlData } = await adminClient.storage
            .from('reports')
            .getPublicUrl(filePath)
            
          if (urlData?.publicUrl) {
            return urlData.publicUrl
          }
        } else {
          console.error('Admin client upload error:', adminUploadError)
        }
      } catch (adminError) {
        console.error('Error using admin client:', adminError)
      }
    }
    
    // Fall back to regular client if admin client fails
    console.log('Falling back to regular client for upload')
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(filePath, metadataStr, {
        contentType: 'application/json',
        cacheControl: '3600',
        upsert: true
      })
    
    if (uploadError) {
      console.error('Error uploading report metadata:', uploadError)
      throw new Error('Failed to upload report file')
    }
    
    // Get public URL for the file
    // Try admin client first for consistent access (reuse existing or create new)
    let urlData = null
    
    if (adminClient) {
      const { data } = await adminClient.storage
        .from('reports')
        .getPublicUrl(filePath)
      
      urlData = data
    }
    
    // Fall back to regular client if needed
    if (!urlData) {
      const { data } = await supabase.storage
        .from('reports')
        .getPublicUrl(filePath)
      
      urlData = data
    }
    
    if (!urlData || !urlData.publicUrl) {
      // If we can't get a public URL, use a placeholder
      return `https://storage.example.com/reports/${filename}?records=${data.length}`
    }
    
    return urlData.publicUrl
  } catch (error) {
    console.error("Error generating report file:", error)
    throw new Error("Failed to generate report file")
  }
}

// Delete a report
export async function deleteReport(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }
    
    // Try to get the authenticated user from the session
    const { data: sessionData } = await supabase.auth.getSession()
    let user = sessionData?.session?.user || null
    
    // For development purposes, create a mock user if authentication fails
    if (!user && process.env.NODE_ENV === 'development') {
      console.log('Creating mock user for development testing')
      user = {
        id: 'dev-test-user-id',
        email: 'dev@example.com',
        role: 'authenticated',
        app_metadata: { provider: 'email' },
        user_metadata: { full_name: 'Development User' },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      }
    } else if (!user) {
      throw new Error("Authentication required")
    }

    // Ensure reports table exists
    await ensureReportsTableExists()

    // Check if we're using a temporary in-memory table
    if (global._tempReportsTable) {
      const initialLength = global._tempReportsTable.length;
      global._tempReportsTable = global._tempReportsTable.filter(
        report => !(report.id === id && report.user_id === user.id)
      );
      
      return { success: global._tempReportsTable.length < initialLength };
    }

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error("Error deleting report:", error)
      throw new Error("Failed to delete report")
    }

    return { success: true }
  } catch (error: unknown) {
    console.error("Error in deleteReport:", error)
    throw error
  }
}

// Helper functions

// Get the content type for a report format
function getContentType(format: ReportFormat): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf'
    case 'csv':
      return 'text/csv'
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    default:
      return 'application/octet-stream'
  }
}

function formatReportType(type: ReportType): string {
  switch (type) {
    case 'overview':
      return 'Financial Overview'
    case 'income-expense':
      return 'Income & Expenses'
    case 'net-worth':
      return 'Net Worth'
    case 'investments':
      return 'Investment Performance'
    default:
      return String(type).charAt(0).toUpperCase() + String(type).slice(1).replace(/-/g, ' ')
  }
}

function getFileExtension(format: ReportFormat): string {
  switch (format) {
    case 'pdf':
      return 'pdf'
    case 'csv':
      return 'csv'
    case 'excel':
      return 'xlsx'
    default:
      return 'txt'
  }
}

function getTimeRangeFilter(timeRange: TimeRange): { start: Date, end: Date } {
  const end = new Date()
  let start = new Date()
  
  switch (timeRange) {
    case '7d':
      start.setDate(end.getDate() - 7)
      break
    case '30d':
      start.setDate(end.getDate() - 30)
      break
    case '90d':
      start.setDate(end.getDate() - 90)
      break
    case '1y':
      start.setFullYear(end.getFullYear() - 1)
      break
    case 'ytd':
      start = new Date(end.getFullYear(), 0, 1) // January 1st of current year
      break
    case 'all':
      start = new Date(2000, 0, 1) // Far in the past
      break
    default:
      start.setDate(end.getDate() - 30) // Default to 30 days
  }
  
  return { start, end }
}

// Add TypeScript declaration for global variable
declare global {
  var _tempReportsTable: Report[] | undefined;
}
