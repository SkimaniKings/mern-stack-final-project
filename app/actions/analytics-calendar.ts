"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { PostgrestError } from "@supabase/supabase-js"
import { Report } from "./reports"
import { getExpenses } from "./expenses"

// Types for analytics calendar data
export type AnalyticsEventType = "income" | "expense" | "report" | "transaction"

export interface AnalyticsEvent {
  id: string
  title: string
  amount: number
  type: AnalyticsEventType
  date: string
  category?: string
  format?: string
  status?: string
  isRecurring?: boolean
  recurrenceType?: string
}

export interface AnalyticsDayData {
  date: string
  income?: number
  expenses?: number
  reports?: Report[]
  events: AnalyticsEvent[]
}

// Get analytics calendar data for a specific month
export async function getAnalyticsCalendarData(year: number, month: number): Promise<AnalyticsDayData[]> {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user || !supabase) {
      return []
    }

    // Calculate start and end dates for the requested month
    const targetDate = new Date(year, month - 1) // JavaScript months are 0-indexed
    const startDate = startOfMonth(targetDate)
    const endDate = endOfMonth(targetDate)
    
    // Format dates for database queries
    const startDateStr = format(startDate, "yyyy-MM-dd")
    const endDateStr = format(endDate, "yyyy-MM-dd")

    // Initialize the calendar data object
    const calendarData: Record<string, AnalyticsDayData> = {}

    // 1. Fetch transactions data
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }
      
      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select(`
          id, 
          description, 
          amount, 
          date, 
          type,
          category_id,
          categories:categories(id, name, color, icon)
        `)
        .eq("user_id", user.id)
        .gte("date", startDateStr)
        .lte("date", endDateStr)
        .order("date", { ascending: true })

      if (!transactionsError && transactions) {
        // Process transactions
        transactions.forEach(transaction => {
          const dateKey = new Date(transaction.date).toISOString().split('T')[0]
          
          // Initialize the date entry if it doesn't exist
          if (!calendarData[dateKey]) {
            calendarData[dateKey] = {
              date: dateKey,
              income: 0,
              expenses: 0,
              events: []
            }
          }
          
          // Add transaction to the appropriate category
          if (transaction.type === 'income') {
            calendarData[dateKey].income = (calendarData[dateKey].income || 0) + transaction.amount
          } else {
            calendarData[dateKey].expenses = (calendarData[dateKey].expenses || 0) + transaction.amount
          }
          
          // Get category name if available
          let categoryName: string | undefined = undefined;
          if (transaction.categories && Array.isArray(transaction.categories) && transaction.categories.length > 0) {
            categoryName = transaction.categories[0]?.name;
          }
          
          // Add event details
          calendarData[dateKey].events.push({
            id: transaction.id,
            title: transaction.description,
            amount: transaction.amount,
            type: transaction.type as AnalyticsEventType,
            date: dateKey,
            category: categoryName
          })
        })
      }
    } catch (error) {
      console.log("Error fetching transactions:", error)
      // Continue execution even if this fails
    }

    // 2. Fetch reports data
    try {
      // Check if reports table exists
      try {
        if (!supabase) {
          throw new Error("Supabase client not initialized");
        }
        
        const { data: reports, error: reportsError } = await supabase
          .from("reports")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .order("created_at", { ascending: true })
        
        if (!reportsError && reports) {
          // Process reports
          reports.forEach(report => {
            const reportDate = new Date(report.created_at)
            const dateKey = reportDate.toISOString().split('T')[0]
            
            // Initialize the date entry if it doesn't exist
            if (!calendarData[dateKey]) {
              calendarData[dateKey] = {
                date: dateKey,
                income: 0,
                expenses: 0,
                reports: [],
                events: []
              }
            }
            
            // Add report to the day's reports
            calendarData[dateKey].reports = [...(calendarData[dateKey].reports || []), report]
            
            // Add report as an event
            calendarData[dateKey].events.push({
              id: report.id,
              title: report.title,
              amount: 0, // Reports don't have amounts
              type: "report",
              date: dateKey,
              format: report.format,
              status: report.status
            })
          })
        }
      } catch (error: unknown) {
        // If reports table doesn't exist, use in-memory data
        if (global._tempReportsTable) {
          const reports = global._tempReportsTable.filter(report => {
            const reportDate = new Date(report.created_at)
            return reportDate >= startDate && reportDate <= endDate
          })
          
          reports.forEach(report => {
            const reportDate = new Date(report.created_at)
            const dateKey = reportDate.toISOString().split('T')[0]
            
            // Initialize the date entry if it doesn't exist
            if (!calendarData[dateKey]) {
              calendarData[dateKey] = {
                date: dateKey,
                income: 0,
                expenses: 0,
                reports: [],
                events: []
              }
            }
            
            // Add report to the day's reports
            calendarData[dateKey].reports = [...(calendarData[dateKey].reports || []), report]
            
            // Add report as an event
            calendarData[dateKey].events.push({
              id: report.id,
              title: report.title,
              amount: 0,
              type: "report",
              date: dateKey,
              format: report.format,
              status: report.status
            })
          })
        }
      }
    } catch (error) {
      console.log("Error fetching reports:", error)
      // Continue execution even if this fails
    }
    
    // 3. Fetch expenses data directly from expense list
    try {
      // Get all expenses
      const expensesData = await getExpenses();
      
      // Ensure we have an array of expenses
      const expenses = Array.isArray(expensesData) ? expensesData : 
                      (expensesData && 'data' in expensesData && Array.isArray(expensesData.data)) ? 
                      expensesData.data : [];
      
      // Filter expenses for the current month
      const currentMonthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
      
      // Process regular expenses
      currentMonthExpenses.forEach(expense => {
        const expenseDate = new Date(expense.expense_date);
        const dateKey = expenseDate.toISOString().split('T')[0];
        
        // Initialize the date entry if it doesn't exist
        if (!calendarData[dateKey]) {
          calendarData[dateKey] = {
            date: dateKey,
            income: 0,
            expenses: 0,
            events: []
          }
        }
        
        // Add expense amount
        calendarData[dateKey].expenses = (calendarData[dateKey].expenses || 0) + expense.amount;
        
        // Get category name if available
        let categoryName: string | undefined = undefined;
        if (expense.categories && Array.isArray(expense.categories) && expense.categories.length > 0) {
          categoryName = expense.categories[0]?.name;
        }
        
        // Add event details
        calendarData[dateKey].events.push({
          id: expense.id,
          title: expense.merchant || 'Expense',
          amount: expense.amount,
          type: "expense" as AnalyticsEventType,
          date: dateKey,
          category: categoryName,
          isRecurring: expense.recurrence !== 'none',
          recurrenceType: expense.recurrence
        });
      });
      
      // Process recurring expenses separately
      const recurringExpenses = currentMonthExpenses.filter(expense => expense.recurrence && expense.recurrence !== 'none');
      
      if (recurringExpenses.length > 0) {
        // Process recurring expenses
        recurringExpenses.forEach(expense => {
          // Get the base date of the recurring expense
          const baseDate = new Date(expense.expense_date)
          
          // Calculate recurring dates that fall within this month
          const recurringDates = getRecurringDatesInMonth(baseDate, expense.recurrence, startDate, endDate)
          
          // Add each recurring instance to the calendar
          recurringDates.forEach(date => {
            // Skip the original date as it's already added
            if (date.getTime() === baseDate.getTime()) return;
            
            const dateKey = date.toISOString().split('T')[0]
            
            // Initialize the date entry if it doesn't exist
            if (!calendarData[dateKey]) {
              calendarData[dateKey] = {
                date: dateKey,
                income: 0,
                expenses: 0,
                events: []
              }
            }
            
            // Add expense amount
            calendarData[dateKey].expenses = (calendarData[dateKey].expenses || 0) + expense.amount
            
            // Get category name if available
            let categoryName: string | undefined = undefined;
            if (expense.categories && Array.isArray(expense.categories) && expense.categories.length > 0) {
              categoryName = expense.categories[0]?.name;
            }
            
            // Add event details with recurring flag
            calendarData[dateKey].events.push({
              id: `${expense.id}-${dateKey}`, // Create unique ID for each recurring instance
              title: `${expense.merchant} (Recurring - ${formatRecurrenceText(expense.recurrence)})`,
              amount: expense.amount,
              type: "expense" as AnalyticsEventType,
              date: dateKey,
              category: categoryName,
              isRecurring: true,
              recurrenceType: expense.recurrence
            })
          })
        })
      }
    } catch (error) {
      console.log("Error fetching recurring expenses:", error)
      // Continue execution even if this fails
    }

    // If no data was found for the month, add some sample data for demonstration
    if (Object.keys(calendarData).length === 0) {
      // Add sample data for the current month
      const today = new Date()
      const todayStr = format(today, "yyyy-MM-dd")
      
      // Sample income
      calendarData[todayStr] = {
        date: todayStr,
        income: 2500,
        expenses: 1200,
        events: [
          {
            id: "sample-income-1",
            title: "Salary",
            amount: 2500,
            type: "income",
            date: todayStr,
            category: "Income"
          },
          {
            id: "sample-expense-1",
            title: "Rent",
            amount: 1200,
            type: "expense",
            date: todayStr,
            category: "Housing"
          }
        ]
      }
      
      // Sample report
      const reportDate = new Date(today)
      reportDate.setDate(today.getDate() - 2)
      const reportDateStr = format(reportDate, "yyyy-MM-dd")
      
      if (!calendarData[reportDateStr]) {
        calendarData[reportDateStr] = {
          date: reportDateStr,
          income: 0,
          expenses: 0,
          events: []
        }
      }
      
      calendarData[reportDateStr].events.push({
        id: "sample-report-1",
        title: "Monthly Financial Report",
        amount: 0,
        type: "report",
        date: reportDateStr,
        format: "pdf",
        status: "completed"
      })
    }

    // Convert to array and sort by date
    return Object.values(calendarData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  } catch (error) {
    console.error("Error in getAnalyticsCalendarData:", error)
    return []
  }
}

// Get analytics summary for dashboard
export async function getAnalyticsSummary() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return {
        totalReports: 0,
        recentReports: [],
        monthlyReportCount: []
      }
    }

    // Initialize summary data
    let totalReports = 0
    let recentReports: Report[] = []
    let monthlyReportCount: { month: string, count: number }[] = []

    // Get report count and recent reports
    try {
      // Check if reports table exists
      const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)
      
      if (!reportsError && reports) {
        totalReports = reports.length
        recentReports = reports as Report[]
        
        // Get monthly report counts for the last 6 months
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = subMonths(new Date(), i)
          return {
            month: format(date, "MMM yyyy"),
            startDate: startOfMonth(date),
            endDate: endOfMonth(date),
            count: 0
          }
        })
        
        // Count reports for each month
        const { data: monthlyData, error: monthlyError } = await supabase
          .from("reports")
          .select("created_at")
          .eq("user_id", user.id)
          .gte("created_at", last6Months[5].startDate.toISOString())
          .lte("created_at", last6Months[0].endDate.toISOString())
        
        if (!monthlyError && monthlyData) {
          monthlyData.forEach(report => {
            const reportDate = new Date(report.created_at)
            const monthIndex = last6Months.findIndex(month => 
              reportDate >= month.startDate && reportDate <= month.endDate
            )
            
            if (monthIndex !== -1) {
              last6Months[monthIndex].count++
            }
          })
          
          monthlyReportCount = last6Months.map(month => ({
            month: month.month,
            count: month.count
          })).reverse() // Show oldest to newest
        }
      } else if (global._tempReportsTable) {
        // Use in-memory data if table doesn't exist
        totalReports = global._tempReportsTable.length
        recentReports = global._tempReportsTable
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
        
        // Get monthly report counts for the last 6 months
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = subMonths(new Date(), i)
          return {
            month: format(date, "MMM yyyy"),
            startDate: startOfMonth(date),
            endDate: endOfMonth(date),
            count: 0
          }
        })
        
        // Count reports for each month
        global._tempReportsTable.forEach(report => {
          const reportDate = new Date(report.created_at)
          const monthIndex = last6Months.findIndex(month => 
            reportDate >= month.startDate && reportDate <= month.endDate
          )
          
          if (monthIndex !== -1) {
            last6Months[monthIndex].count++
          }
        })
        
        monthlyReportCount = last6Months.map(month => ({
          month: month.month,
          count: month.count
        })).reverse() // Show oldest to newest
      }
    } catch (error) {
      console.log("Error fetching reports summary:", error)
      // Continue with default values
    }

    return {
      totalReports,
      recentReports,
      monthlyReportCount
    }
  } catch (error) {
    console.error("Error in getAnalyticsSummary:", error)
    return {
      totalReports: 0,
      recentReports: [],
      monthlyReportCount: []
    }
  }
}

// Helper function to format recurrence text
function formatRecurrenceText(recurrence: string): string {
  const recurrenceMap: Record<string, string> = {
    'none': 'One-time',
    'weekly': 'Weekly',
    'bi_weekly': 'Bi-weekly',
    'monthly': 'Monthly',
    'quarterly': 'Quarterly',
    'semi_annual': 'Semi-annually',
    'annual': 'Annually'
  };
  
  return recurrenceMap[recurrence] || recurrence;
}

// Helper function to calculate recurring dates within a month
function getRecurringDatesInMonth(baseDate: Date, recurrenceType: string, startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(baseDate);
  
  // If the base date is after the end date, no occurrences in this month
  if (currentDate > endDate) return [];
  
  // If recurrence is none, only include the base date if it falls within the range
  if (recurrenceType === 'none') {
    if (currentDate >= startDate && currentDate <= endDate) {
      dates.push(new Date(currentDate));
    }
    return dates;
  }
  
  // Calculate interval in days based on recurrence type
  let intervalDays = 0;
  switch (recurrenceType) {
    case 'weekly':
      intervalDays = 7;
      break;
    case 'bi_weekly':
      intervalDays = 14;
      break;
    case 'monthly':
      // For monthly, we'll add a month each time
      break;
    case 'quarterly':
      // For quarterly, we'll add 3 months each time
      break;
    case 'semi_annual':
      // For semi-annual, we'll add 6 months each time
      break;
    case 'annual':
      // For annual, we'll add a year each time
      break;
    default:
      return dates; // Unknown recurrence type
  }
  
  // Add the base date if it falls within the range
  if (currentDate >= startDate && currentDate <= endDate) {
    dates.push(new Date(currentDate));
  }
  
  // Add recurring dates
  while (true) {
    let nextDate: Date;
    
    if (recurrenceType === 'weekly' || recurrenceType === 'bi_weekly') {
      // For weekly and bi-weekly, add days
      nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + intervalDays);
    } else if (recurrenceType === 'monthly') {
      // For monthly, add a month
      nextDate = new Date(currentDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (recurrenceType === 'quarterly') {
      // For quarterly, add 3 months
      nextDate = new Date(currentDate);
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (recurrenceType === 'semi_annual') {
      // For semi-annual, add 6 months
      nextDate = new Date(currentDate);
      nextDate.setMonth(nextDate.getMonth() + 6);
    } else if (recurrenceType === 'annual') {
      // For annual, add a year
      nextDate = new Date(currentDate);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      break; // Unknown recurrence type
    }
    
    // If the next date is after the end date, we're done
    if (nextDate > endDate) break;
    
    // If the next date is within the range, add it
    if (nextDate >= startDate) {
      dates.push(new Date(nextDate));
    }
    
    // Move to the next date
    currentDate = nextDate;
  }
  
  return dates;
}

// Add TypeScript declaration for global variable
declare global {
  var _tempReportsTable: Report[] | undefined;
}
