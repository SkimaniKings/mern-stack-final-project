"use server"

import { getAuthenticatedUser } from '@/lib/auth'
import { createServerSupabaseClient as createServerSupabaseClientHelper } from '@/lib/supabase/server'
import { ReportType, TimeRange } from "./reports"
import { formatCurrency } from '@/lib/utils'
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import { getBudgets } from './budgets';

// Create a type for our Supabase client
type SupabaseClient = ReturnType<typeof createClient<Database>>

// Define base types for our data
type BaseTransaction = {
  id: string;
  amount: string | number;
  date?: string;
  description?: string;
  user_id: string;
};

type Expense = BaseTransaction & {
  category_id?: string;
  category_name?: string;
  category_color?: string;
  expense_categories?: {
    id: string;
    name: string;
    color?: string;
  };
  name?: string;
};

type Income = BaseTransaction & {
  name: string;
  category_id?: string;
  category_name?: string;
  income_categories?: {
    id: string;
    name: string;
    color?: string;
  };
  start_date?: string;
};

// Define types for the structure returned by fetchIncomeSourcesData
interface IncomeReportTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
}

interface IncomeReportCategory {
  id: string;
  name: string;
  amount: number;
  color: string;
  percent: number;
  transactions: IncomeReportTransaction[];
}


// Define the structure for individual expense transactions within a category
interface ExpenseTransaction {
  id: string;
  expense_date: string;
  description: string;
  amount: number;
  category_name: string;
  name: string;
}

// Define the structure for each spending category's data
interface SpendingCategoryData {
  id: string;
  name: string;
  amount: number;
  color: string;
  transactions: ExpenseTransaction[];
  percent: number;
}

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  category?: string;
};

type MonthlyData = {
  month: string;
  income: number;
  expenses: number;
};

type CategoryData = {
  id: string;
  name: string;
  amount: number;
  color: string;
};

type ReportData = {
  totalExpenses: number;
  totalIncome: number;
  netIncome: number;
  monthlyData: MonthlyData[];
  categoryData: CategoryData[];
  recentTransactions: Transaction[];
};

// Helper function to get time range filter
function getTimeRangeFilter(timeRange: TimeRange): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  
  switch (timeRange) {
    case '7d':
      start.setDate(now.getDate() - 7)
      break
    case '30d':
      start.setDate(now.getDate() - 30)
      break
    case '90d':
      start.setDate(now.getDate() - 90)
      break
    case '1y':
      start.setFullYear(now.getFullYear() - 1)
      break
    case 'ytd':
      start.setMonth(0, 1) // January 1st of current year
      break
    case 'all':
    default:
      // Default to 1 year if no range is specified
      start.setFullYear(now.getFullYear() - 1)
  }
  
  return { start, end: now }
}

// Type definitions for report data - Using the ones defined at the top of the file





// Helper function to create a server-side Supabase client
async function createServerSupabaseClient() {
  return await createServerSupabaseClientHelper()
}

// Helper function to fetch overview data
async function fetchOverviewData(supabase: SupabaseClient, userId: string, timeFilter: { start: Date; end: Date }) {
  try {
    // Fetch expenses and income data in parallel
    const [expensesData, incomeData] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .gte('date', timeFilter.start.toISOString())
        .lte('date', timeFilter.end.toISOString()),
      supabase
        .from('incomes')
        .select('*')
        .eq('user_id', userId)
        .gte('date', timeFilter.start.toISOString())
        .lte('date', timeFilter.end.toISOString())
    ]);

    const expenses = expensesData.data || [];
    const incomes = incomeData.data || [];

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const totalIncome = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
    const netIncome = totalIncome - totalExpenses;

    // Get recent transactions (last 5)
    const recentTransactions: Transaction[] = [
      ...expenses.map(exp => ({
        id: exp.id,
        type: 'expense' as const,
        amount: Number(exp.amount) || 0,
        date: exp.date || new Date().toISOString(),
        description: exp.description || 'Expense',
        category: exp.category_id
      })),
      ...incomes.map(inc => ({
        id: inc.id,
        type: 'income' as const,
        amount: Number(inc.amount) || 0,
        date: inc.date || new Date().toISOString(),
        description: inc.description || 'Income',
        category: inc.category_id
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    // Generate monthly data
    const monthlyData = getMonthlyData(expenses, incomes, timeFilter);
    
    // Get category data
    const categoryData = getCategoryData(expenses);

    return {
      totalExpenses,
      totalIncome,
      netIncome,
      monthlyData,
      categoryData,
      recentTransactions
    };
  } catch (error) {
    console.error('Error in fetchOverviewData:', error);
    throw error;
  }
}



// Helper function to generate monthly data
function getMonthlyData(
  expenses: any[],
  incomes: any[],
  timeFilter: { start: Date; end: Date }
): MonthlyData[] {
  const monthlyData: Record<string, MonthlyData> = {};
  const currentDate = new Date(timeFilter.start);
  const endDate = new Date(timeFilter.end);

  // Initialize all months in the range
  while (currentDate <= endDate) {
    const monthKey = currentDate.toISOString().slice(0, 7);
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: `${monthName} ${year}`,
        income: 0,
        expenses: 0
      };
    }
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Process expenses
  expenses.forEach(exp => {
    if (!exp.date) return;
    const date = new Date(exp.date);
    const monthKey = date.toISOString().slice(0, 7);
    
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].expenses += Number(exp.amount) || 0;
    }
  });

  // Process incomes
  incomes.forEach(inc => {
    if (!inc.date) return;
    const date = new Date(inc.date);
    const monthKey = date.toISOString().slice(0, 7);
    
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].income += Number(inc.amount) || 0;
    }
  });

  return Object.values(monthlyData).sort((a, b) => {
    return new Date(a.month).getTime() - new Date(b.month).getTime();
  });
}

// Helper function to get category data from expenses
function getCategoryData(expenses: any[]): CategoryData[] {
  const categoryMap: Record<string, CategoryData> = {};

  expenses.forEach(exp => {
    try {
      // Handle both direct category properties and nested expense_categories object
      const categoryId = exp.category_id || exp.expense_categories?.id || 'uncategorized';
      const categoryName = exp.category_name || exp.expense_categories?.name || 'Uncategorized';
      const categoryColor = exp.category_color || exp.expense_categories?.color || getDefaultColorForCategory(categoryId);
      const amount = parseFloat(exp.amount) || 0;

      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = {
          id: categoryId,
          name: categoryName,
          amount: 0,
          color: categoryColor
        };
      }

      categoryMap[categoryId].amount += amount;
    } catch (error) {
      console.error('Error processing expense category:', exp, error);
    }
  });

  return Object.values(categoryMap).sort((a, b) => b.amount - a.amount);
}

// Generate a consistent color based on a string input
function getDefaultColorForCategory(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

// Main function to fetch report data
export async function fetchReportData(reportType: ReportType, timeRange: TimeRange) {
  try {
    // Create a server-side Supabase client
    const supabase = await createServerSupabaseClient();
    
    if (!supabase) {
      throw new Error('Failed to create Supabase client');
    }
    
    // Get the authenticated user using the centralized auth function
    const user = await getAuthenticatedUser();
    
    if (!user) {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }
    
    const userId = user.id;
    
    // Get the time range filter
    const timeFilter = getTimeRangeFilter(timeRange);
    
    // Route to the appropriate fetch function based on report type
    switch (reportType) {
      case 'overview':
        return await fetchOverviewData(supabase, userId, timeFilter);
      case 'income-expense':
        try {
          console.log('Fetching report data for period:', {
            reportType,
            start: timeFilter.start.toISOString(),
            end: timeFilter.end.toISOString(),
            userId
          });
          
          console.log(`[fetchReportData] income-expense: Fetching via income-sources and expense-trends logic. User: ${userId}, Time: ${JSON.stringify(timeFilter)}`);

          // Fetch income data using fetchIncomeSourcesData logic
          const incomeSourcesFullData = await fetchIncomeSourcesData(supabase, userId, timeFilter);
          let processedIncomes: { id: string; name: string; amount: number; date: string; category: string; type: 'income'; original_description?: string; }[] = [];
          if (incomeSourcesFullData && incomeSourcesFullData.categories) {
            console.log(`[fetchReportData] income-expense: Processing ${incomeSourcesFullData.categories.length} income categories from incomeSourcesFullData.`);
            incomeSourcesFullData.categories.forEach((category: IncomeReportCategory, catIndex: number) => {
              // Log the structure of the first category and its transactions for inspection
              if (catIndex === 0) {
                console.log(`[fetchReportData] income-expense: Inspecting first income category [${catIndex}]: ${JSON.stringify(category, (key, value) => key === 'transactions' ? `Array(${value.length})` : value).substring(0,500)}`);
                if (category.transactions && category.transactions.length > 0) {
                   console.log(`[fetchReportData] income-expense: Inspecting first transaction of first income category: ${JSON.stringify(category.transactions[0]).substring(0,300)}`);
                }
              }
              if (category.transactions && Array.isArray(category.transactions)) {
                category.transactions.forEach((tx: IncomeReportTransaction) => { // tx should be { id, date, description, amount }
                  processedIncomes.push({
                    id: tx.id,
                    name: tx.description || 'N/A', // Assuming tx.description has the name/detail
                    amount: tx.amount,
                    date: tx.date,
                    category: category.name || 'Uncategorized',
                    type: 'income' as const,
                    original_description: tx.description
                  });
                });
              } else {
                console.log(`[fetchReportData] income-expense: Category '${category.name}' has no transactions array or it's not an array.`);
              }
            });
          }
          console.log(`[fetchReportData] income-expense: Processed ${processedIncomes.length} income items from incomeSourcesFullData.`);

          // Fetch expense data using fetchSpendingCategoriesData logic
          const spendingData = await fetchSpendingCategoriesData(supabase, userId, timeFilter);
          let processedExpenses: { id: string; name: string; amount: number; date: string; category: string; type: 'expense'; }[] = [];
          if (spendingData && spendingData.categories) {
            spendingData.categories.forEach((category: SpendingCategoryData) => { // category: SpendingCategoryData
              if (category.transactions) {
                category.transactions.forEach((tx: ExpenseTransaction) => { // tx: ExpenseTransaction { id, expense_date, description, amount, category_name }
                  if (!tx.description) {
                    console.log('[fetchReportData] Raw expense transaction from spendingData leading to N/A name:', JSON.stringify(tx).substring(0, 300));
                  }
                  processedExpenses.push({
                    id: tx.id,
                    name: tx.name || 'N/A', // Corrected: tx.name from fetchSpendingCategoriesData's transaction mapping
                    amount: tx.amount,
                    date: tx.expense_date,
                    category: category.name || tx.category_name || 'Uncategorized',
                    type: 'expense' as const
                  });
                });
              }
            });
          }
          console.log(`[fetchReportData] income-expense: Processed ${processedExpenses.length} expense items from spendingData.`);

          // If no data found from new sources, return an empty structure consistent with the expected output
          if (processedIncomes.length === 0 && processedExpenses.length === 0) {
            console.log('[fetchReportData] income-expense: No income or expense data found from new sources for the selected period');
            const emptyTimeRange = { start: timeFilter.start.toISOString(), end: timeFilter.end.toISOString() };
            const formattedZero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(0);
            return {
              totalIncome: 0,
              totalExpenses: 0,
              netIncome: 0,
              monthlyData: getMonthlyData([], [], timeFilter),
              categoryData: getCategoryData([]),
              recentTransactions: [],
              incomeData: [],
              expenseData: [],
              incomeByCategory: groupByCategory([]),
              expensesByCategory: groupByCategory([]),
              transactions: [],
              timeRange: emptyTimeRange,
              formattedTotalIncome: formattedZero,
              formattedTotalExpenses: formattedZero,
              formattedNet: formattedZero
            };
          }

          // Calculate totals
          const totalIncome = processedIncomes.reduce((sum, inc) => sum + inc.amount, 0);
          const totalExpenses = processedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
          const net = totalIncome - totalExpenses;

          // Group by category for charts
          const incomeByCategory = groupByCategory(processedIncomes);
          const expensesByCategory = groupByCategory(processedExpenses);

          // Combine all transactions and sort by date
          const allTransactions = [...processedIncomes, ...processedExpenses]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(t => ({
              ...t,
              formattedAmount: new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(t.amount)
            }));

          // Format the response to match the expected structure
          return {
            totalIncome,
            totalExpenses,
            netIncome: net,
            monthlyData: getMonthlyData(processedExpenses, processedIncomes, timeFilter),
            categoryData: getCategoryData(processedExpenses),
            recentTransactions: allTransactions.slice(0, 10),
            incomeData: processedIncomes,
            expenseData: processedExpenses,
            incomeByCategory,
            expensesByCategory,
            transactions: allTransactions,
            timeRange: {
              start: timeFilter.start.toISOString(),
              end: timeFilter.end.toISOString()
            },
            // Add formatted values for display
            formattedTotalIncome: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(totalIncome),
            formattedTotalExpenses: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(totalExpenses),
            formattedNet: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(net)
          };
        } catch (error) {
          console.error('Error processing income-expense data:', error);
          throw error;
        }
      case 'expense-trends':
        try {
          console.log('Fetching expense trends data for period:', {
            start: timeFilter.start.toISOString(),
            end: timeFilter.end.toISOString(),
            userId
          });

          // Fetch expense data with date range filtering
          const { data: expensesData, error: expensesError } = await supabase
            .from('expenses')
            .select('*, expense_categories(name)')
            .eq('user_id', userId)
            .gte('expense_date', timeFilter.start.toISOString())
            .lte('expense_date', timeFilter.end.toISOString())
            .order('expense_date', { ascending: false });

          if (expensesError) {
            console.error('Error fetching expenses data:', expensesError);
            throw expensesError;
          }
          console.log(`Fetched ${expensesData?.length || 0} expense records`);

          if (!expensesData || expensesData.length === 0) {
            console.log('No expense data found for the selected period');
            return [];
          }


          // Process expense data for the report
          const processedExpenses = expensesData.map((expense: any) => {
            const amount = parseFloat(expense.amount) || 0;
            const formattedAmount = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(amount);
            
            return {
              id: expense.id || `exp-${Math.random().toString(36).substr(2, 9)}`,
              name: (typeof expense.name === 'string' && expense.name.trim() !== '' && expense.name !== 'Unnamed Expense')
                ? expense.name
                : (typeof expense.merchant === 'string' && expense.merchant.trim() !== '' ? expense.merchant : 'Unnamed Expense'),
              amount: amount,
              formatted_amount: formattedAmount,
              expense_date: expense.expense_date,
              formatted_expense_date: new Date(expense.expense_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              category: expense.expense_categories?.name || 'Uncategorized',
              frequency: expense.recurrence || 'none',
              warranty_expiry: expense.warranty_expiration_date || ''
            }
          });

          // Group expenses by category with warranty information
          const categoryMap = new Map();
          let totalAmount = 0;
          let totalTransactions = 0;
          const allTransactions: any[] = [];

          // First, process each expense and add to categories
          processedExpenses.forEach((expense: any) => {
            const categories = expense.all_categories || [expense.category || 'Uncategorized'];
            const amount = parseFloat(expense.amount) || 0;
            totalAmount += amount; // Increment totalAmount
            totalTransactions += 1; // Increment totalTransactions
            
            // Add to each category this expense belongs to
            categories.forEach((categoryName: string) => {
              if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, {
                  id: `cat-${categoryName.toLowerCase().replace(/\s+/g, '-')}`,
                  name: categoryName,
                  total: 0,
                  count: 0,
                  color: getDefaultColorForCategory(categoryName),
                  transactions: []
                });
              }
              
              const category = categoryMap.get(categoryName);
              category.total += amount;
              category.count += 1;
              
              // Only add the transaction to the first category to avoid duplicates
              if (categories[0] === categoryName) {
                category.transactions.push({
                  id: expense.id,
                  name: (typeof expense.name === 'string' && expense.name.trim() !== '' && expense.name !== 'Unnamed Expense')
                    ? expense.name
                    : (typeof expense.merchant === 'string' && expense.merchant.trim() !== '' ? expense.merchant : 'Unnamed Expense'),
                  amount: expense.amount, // This should be the numeric amount
                  formatted_amount: expense.formatted_amount,
                  date: expense.expense_date, // Use expense_date
                  formatted_date: expense.formatted_expense_date, // Use formatted_expense_date
                  frequency: expense.frequency,
                  warranty_expiry: expense.warranty_expiry,
                  formatted_warranty_expiry: expense.formatted_warranty_expiry
                });
              }
            });
            
            // Add to all transactions
            allTransactions.push({
              id: expense.id,
              name: expense.name,
              amount: expense.amount,
              formatted_amount: expense.formatted_amount,
              date: expense.date,
              formatted_date: expense.formatted_date,
              category: expense.category,
              all_categories: [...(expense.all_categories || [expense.category])],
              frequency: expense.frequency,
              warranty_expiry: expense.warranty_expiry,
              formatted_warranty_expiry: expense.formatted_warranty_expiry || 'N/A'
            });
            
            totalAmount += amount;
            totalTransactions += 1;
          });

          // Sort transactions within each category by date (newest first)
          categoryMap.forEach(category => {
            category.transactions.sort((a: any, b: any) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          });

          // Convert map to array and calculate percentages
          const categories = Array.from(categoryMap.values()).map((category: any) => ({
            ...category,
            formatted_total: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(category.total),
            percent_of_total: totalAmount > 0 ? (category.total / totalAmount) * 100 : 0,
            formatted_percent: totalAmount > 0 ? `${((category.total / totalAmount) * 100).toFixed(1)}%` : '0.0%',
            average_amount: category.count > 0 ? category.total / category.count : 0,
            formatted_average: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(category.count > 0 ? category.total / category.count : 0)
          }));

          // Sort categories by total amount (descending)
          categories.sort((a: any, b: any) => b.total - a.total);
          
          // Sort all transactions by date (newest first)
          const sortedTransactions = [...allTransactions].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          console.log('Processed expense trends data:', {
            totalCategories: categories.length,
            totalTransactions: sortedTransactions.length,
            totalAmount,
            sampleCategory: categories[0],
            sampleTransaction: sortedTransactions[0]
          });

          // Return the structured data for the report
          return {
            categories,
            transactions: sortedTransactions,
            total_amount: totalAmount,
            formatted_total: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(totalAmount),
            total_transactions: totalTransactions,
            time_range: {
              start: timeFilter.start.toISOString(),
              end: timeFilter.end.toISOString(),
              formatted_start: timeFilter.start.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              formatted_end: timeFilter.end.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            },
            generated_at: new Date().toISOString(),
            formatted_generated_at: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          };
        } catch (error) {
          console.error('Error processing expense trends data:', error);
          return [];
        }
case 'net-worth':
        console.log('Fetching net-worth report data for time range:', timeRange);
        const netWorthData = await fetchNetWorthData(supabase, userId);
        return {
          assets: netWorthData.assets.map(asset => ({
            name: asset.name,
            category: asset.type, // 'type' from accounts table (e.g., 'checking', 'savings')
            value: asset.amount    // 'amount' from fetchNetWorthData is the value of the asset
          })),
          liabilities: netWorthData.liabilities.map(liability => ({
            name: liability.name,
            category: liability.type, // 'type' from accounts table (e.g., 'credit_card', 'loan')
            amount: liability.amount  // 'amount' from fetchNetWorthData is the amount of the liability
          })),
          totalAssets: netWorthData.totalAssets,
          totalLiabilities: netWorthData.totalLiabilities,
          netWorth: netWorthData.netWorth,
          timeRange: {
             start: timeFilter.start.toISOString(),
             end: timeFilter.end.toISOString()
          }
        };
      case 'savings-goals': {
        console.log(`[fetchReportData] Fetching 'savings-goals' data for user ${userId}. Time range: ${timeRange}`);
        try {
          const { data: financialGoals, error: financialGoalsError } = await supabase
            .from('financial_goals') // Use the correct table name
            .select(`
              name,
              target_amount,
              current_amount,
              progress,
              start_date,
              end_date,
              priority,
              category_id,
              categories(name)
            `)
            .eq('user_id', userId);

          if (financialGoalsError) {
            console.error('[fetchReportData] Error fetching financial goals:', financialGoalsError);
            throw financialGoalsError;
          }

          if (!financialGoals) {
            console.log('[fetchReportData] No financial goals data found.');
            return [];
          }

          const processedGoals = financialGoals.map((goal: any) => {
            // The 'progress' field from financial_goals is expected to be a percentage (0-100)
            // We'll ensure it's a number and cap it at 100%.
            const progressPercent = Math.min(parseFloat(goal.progress) || 0, 100);

            return {
              goal_name: goal.name || 'Unnamed Goal',
              target_amount: parseFloat(goal.target_amount) || 0,
              current_amount: parseFloat(goal.current_amount) || 0,
              progress_percent: progressPercent,
              start_date: goal.start_date,
              target_end_date: goal.end_date, // Mapped from end_date column
              category: goal.goal_categories ? goal.goal_categories.name : 'Uncategorized',
              priority: goal.priority, // Assuming priority is a number as per Goal type, or handle text
            };
          });

          console.log(`[fetchReportData] Processed ${processedGoals.length} financial goals for report.`);
          return processedGoals;
        } catch (error) {
          console.error('[fetchReportData] Critical error in savings-goals report data fetching:', error);
          return []; // Return empty array on critical error to prevent report generation failure
        }
      }

      case 'budgets_list': {
      console.log("[fetchReportData] Fetching 'budgets_list' data.");
      const budgetsData = await getBudgets(); // getBudgets handles its own auth & supabase client
      
      if (!budgetsData) {
        console.log("[fetchReportData] No data returned from getBudgets for 'budgets_list'.");
        return [];
      }

      const reportResult = budgetsData.map((budget: any) => {
        const categoryNames = new Set<string>();
        // Ensure categoriesWithSubs exists and is an array before iterating
        if (Array.isArray(budget.categoriesWithSubs)) {
          budget.categoriesWithSubs.forEach((parentCat: any) => {
            if (parentCat && typeof parentCat.name === 'string') {
              categoryNames.add(parentCat.name);
            }
            // Ensure children exists and is an array before iterating
            if (Array.isArray(parentCat.children)) {
              parentCat.children.forEach((subCat: any) => {
                if (subCat && typeof subCat.name === 'string') {
                  categoryNames.add(subCat.name);
                }
              });
            }
          });
        }

        return {
          name: budget.name || 'Unnamed Budget',
          amount: typeof budget.totalAllocated === 'number' ? budget.totalAllocated : 0,
          start_date: budget.start_date || '',
          end_date: budget.end_date || '',
          categories: Array.from(categoryNames),
          allocated: typeof budget.totalAllocated === 'number' ? budget.totalAllocated : 0,
        };
      });
      console.log(`[fetchReportData] Processed ${reportResult.length} budgets for 'budgets_list'.`);
      return reportResult;
    }
      case 'budget-analysis': {
        return await fetchBudgetAnalysisData(supabase, userId, timeFilter);
      }
      case 'spending-categories':
        return await fetchSpendingCategoriesData(supabase, userId, timeFilter);
      case 'debt-analysis': { 
        // Fetch all debts for the authenticated user
        try {
          let query = supabase
            .from('debts')
            .select('*')
            .eq('user_id', userId);

          if (timeFilter && timeFilter.start && timeFilter.end) {
            const startDateISO = new Date(timeFilter.start).toISOString();
            const endDateISO = new Date(timeFilter.end).toISOString();
            console.log(`Applying time filter to debt-analysis query (ISO): ${startDateISO} to ${endDateISO}`);
            query = query.gte('created_at', startDateISO)
                         .lte('created_at', endDateISO);
          }
          
          const { data: debts, error } = await query.order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching debts:', error);
            return [];
          }

          if (!debts) {
            console.log('No debt data returned for user:', userId);
            return [];
          }

          const mappedDebts = debts.map((debt: any) => ({
            name: debt.name || '',
            type: debt.type || '', // This is the debt 'type' or 'category'
            balance: typeof debt.current_balance === 'number' 
              ? debt.current_balance 
              : (parseFloat(String(debt.current_balance)) || 0),
            interest_rate: typeof debt.interest_rate === 'number' 
              ? debt.interest_rate 
              : (parseFloat(String(debt.interest_rate)) || 0),
            minimum_payment: typeof debt.minimum_payment === 'number' 
              ? debt.minimum_payment 
              : (parseFloat(String(debt.minimum_payment)) || 0),
          }));
          console.log(`Mapped ${mappedDebts.length} debts for report.`);
          return mappedDebts;
        } catch (e) {
          console.error('Exception processing debt data for report:', e);
          return [];
        }
      } // Closes case 'debt-analysis': {

      case 'income-sources': {
        try {
          const { data: incomeData, error } = await supabase
            .from('incomes')
            .select('*, income_categories!inner(*)')
            .eq('user_id', userId)
            .order('start_date', { ascending: false });

          if (error) {
            console.error('Error fetching income sources:', error);
            return []; // Return empty array to trigger "no data" message
          }

          if (!incomeData || incomeData.length === 0) {
            console.log('No income data found for user:', userId);
            return [];
          }


          // Process income data for the report
          const processedIncomes = incomeData.map(income => ({
            id: income.id,
            source: income.source_name || 'Unnamed Source',
            amount: parseFloat(income.amount) || 0,
            category: income.income_categories?.name || 'Uncategorized',
            frequency: income.recurrence || 'one_time',
            start_date: income.start_date,
            formatted_date: income.start_date ? new Date(income.start_date).toLocaleDateString() : 'N/A',
            formatted_amount: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(parseFloat(income.amount) || 0)
          }));
          
          // Calculate total for percentage calculations
          const totalIncome = processedIncomes.reduce((sum: number, item: any) => sum + item.amount, 0);
          
          // Group by source to combine duplicates and calculate counts
          const sourceMap = new Map();
          
          processedIncomes.forEach((income: any) => {
            if (!sourceMap.has(income.source)) {
              sourceMap.set(income.source, {
                ...income,
                count: 0,
                recurring_count: 0,
                total_amount: 0
              });
            }
            const source = sourceMap.get(income.source);
            source.count += 1;
            source.total_amount += income.amount;
            if (income.frequency !== 'one_time') {
              source.recurring_count += 1;
            }
          });

          // Convert map to array and calculate percentages
          const sources = Array.from(sourceMap.values()).map((source: any) => ({
            ...source,
            amount: source.total_amount,
            formatted_amount: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(source.total_amount),
            percent_of_total: totalIncome > 0 ? (source.total_amount / totalIncome) * 100 : 0,
            formatted_percent: totalIncome > 0 ? `${((source.total_amount / totalIncome) * 100).toFixed(1)}%` : '0.0%',
            recurring_percentage: source.count > 0 ? (source.recurring_count / source.count) * 100 : 0
          }));

          console.log('Processed income sources for report:', {
            totalSources: sources.length,
            totalIncome,
            sampleSource: sources[0]
          });

          // Return the array of income sources
          return sources;
        } catch (error) {
          console.error('Error processing income sources:', error);
          return [];
        }
      }
      default: {
        const errorMessage = `Unsupported report type: ${reportType}`;
        console.error(errorMessage);
        return {
          error: 'Unsupported report type',
          message: `The report type '${reportType}' is not supported.`,
          supportedTypes: ['overview', 'income-expense', 'expense-trends', 'income-sources', 'spending-categories', 'budget-analysis', 'net-worth']
        };
      }
    }
  } catch (e: any) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    console.error(`Error in fetchReportData (${reportType}):`, errorMessage);
    
    // Return a user-friendly error response
    return {
      error: `Failed to generate ${reportType} report`,
      details: errorMessage,
      timestamp: new Date().toISOString()
    };
  }
}

// Helper function to group transactions by category
function groupByCategory(transactions: any[]) {
  return transactions.reduce((acc, curr) => {
    const category = curr.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += curr.amount;
    return acc;
  }, {} as Record<string, number>);
}

// This function is kept for backward compatibility but the logic is now in fetchReportData
async function fetchIncomeExpenseData(supabase: any, userId: string, timeFilter: any) {
  try {
    const result = await fetchReportData('income-expense', timeFilter);
    return result || {
      income: 0,
      expenses: 0,
      net: 0,
      incomeData: [],
      expenseData: [],
      incomeByCategory: {},
      expensesByCategory: {},
      transactions: [],
      timeRange: {
        start: timeFilter.start.toISOString(),
        end: timeFilter.end.toISOString()
      }
    };
  } catch (error) {
    console.error('Error in fetchIncomeExpenseData:', error);
    throw error;
  }
}

// Fetch net worth data
async function fetchNetWorthData(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assets: Array<{ name: string; amount: number; type: string }>; // 'type' is category
  liabilities: Array<{ name: string; amount: number; type: string }>; // 'type' is category
}> {
  try {
    // Fetch assets
    const { data: fetchedAssets, error: assetsError } = await supabase
      .from('assets')
      .select('*') // Select all to get name, asset_type, value, etc.
      .eq('user_id', userId);

    if (assetsError) {
      console.error('Error fetching assets for net worth report:', assetsError);
      // Continue processing, report might be partial or empty for assets
    }

    // Fetch liabilities
    const { data: fetchedLiabilities, error: liabilitiesError } = await supabase
      .from('liabilities')
      .select('*') // Select all to get name, liability_type, amount_due, etc.
      .eq('user_id', userId);

    if (liabilitiesError) {
      console.error('Error fetching liabilities for net worth report:', liabilitiesError);
      // Continue processing, report might be partial or empty for liabilities
    }

    const assetsArray = fetchedAssets || [];
    const liabilitiesArray = fetchedLiabilities || [];

    // Process assets
    const processedAssets = assetsArray.map((asset: any) => {
      return {
        name: asset.name || asset.asset_type || 'Unnamed Asset',
        amount: parseFloat(asset.value) || 0,
        type: asset.asset_type || 'other_asset' // Use asset_type for category
      };
    });

    // Process liabilities
    const processedLiabilities = liabilitiesArray.map((liability: any) => {
      return {
        name: liability.name || liability.liability_type || 'Unnamed Liability',
        amount: parseFloat(liability.amount_due) || 0, // Use amount_due for liabilities
        type: liability.liability_type || 'other_liability' // Use liability_type for category
      };
    });

    // Calculate totals
    const totalAssetsValue = processedAssets.reduce((sum: number, asset) => sum + asset.amount, 0);
    const totalLiabilitiesValue = processedLiabilities.reduce((sum: number, liability) => sum + liability.amount, 0);
    const netWorthValue = totalAssetsValue - totalLiabilitiesValue;

    console.log(`Net worth report data: ${processedAssets.length} assets, ${processedLiabilities.length} liabilities processed from dedicated tables.`);

    return {
      assets: processedAssets,
      liabilities: processedLiabilities,
      totalAssets: totalAssetsValue,
      totalLiabilities: totalLiabilitiesValue,
      netWorth: netWorthValue
    };

  } catch (error) {
    console.error('Critical error in fetchNetWorthData:', error);
    // Return default structure in case of unexpected errors during processing
    return {
      assets: [],
      liabilities: [],
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0
    };
  }
}

// Fetch budget analysis data
async function fetchBudgetAnalysisData(
  supabase: SupabaseClient,
  userId: string,
  timeFilter: { start: Date; end: Date }
): Promise<{
  budgets: Array<{
    id: string;
    name: string;
    amount: number;
    spent: number;
    remaining: number;
    progress: number;
    category: string;
  }>;
  totalBudget: number;
  totalSpent: number;
}> {
  // Fetch budgets
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  // Fetch expenses for the time period
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('*, expense_categories(name, color)')
    .eq('user_id', userId)
    .gte('date', timeFilter.start.toISOString())
    .lte('date', timeFilter.end.toISOString())
  
  console.log(`Budget analysis data fetched: ${budgets?.length || 0} budgets, ${expenses?.length || 0} expenses`)
  
  if (!budgetsError && budgets && budgets.length > 0) {
    // Process budget data
    const budgetAnalysis = budgets.map((budget: any) => {
      // Find expenses for this budget's category
      const categoryExpenses = expenses?.filter((expense: any) => {
        return expense.category_id === budget.category_id
      }) || []
      
      // Calculate total spent
      const totalSpent = categoryExpenses.reduce((sum: number, expense: any) => {
        return sum + (parseFloat(expense.amount) || 0)
      }, 0)
      
      // Calculate percentage of budget used
      const budgetAmount = parseFloat(budget.amount) || 0
      const percentUsed = budgetAmount > 0 ? (totalSpent / budgetAmount * 100) : 0
      const remaining = budgetAmount - totalSpent
      
      return {
        id: budget.id,
        name: budget.name || 'Unnamed Budget',
        category: budget.category_name || 'Uncategorized',
        amount: budgetAmount,
        spent: totalSpent,
        remaining: remaining,
        progress: budgetAmount > 0 ? (totalSpent / budgetAmount) : 0, // Normalized progress (0-1)
      };
    });
    
    // Calculate overall budget metrics
    const totalBudgeted = budgets.reduce((sum: number, budget: any) => sum + (parseFloat(budget.amount) || 0), 0);
    const overallTotalSpent = expenses ? expenses.reduce((sum: number, expense: any) => sum + (parseFloat(expense.amount) || 0), 0) : 0;
    // overallPercentUsed is not part of the return type, so it can be removed or kept for logging if needed.
    
    return {
      budgets: budgetAnalysis,
      totalBudget: totalBudgeted,
      totalSpent: overallTotalSpent
    };
  } else {
    if (budgetsError) {
      console.error("Error fetching budgets for budget analysis:", budgetsError);
    }
    // Return default structure if no data or error
    return {
      budgets: [],
      totalBudget: 0,
      totalSpent: 0
    };
  }
}

// Fetch spending by category data
async function fetchSpendingCategoriesData(
  supabase: SupabaseClient,
  userId: string,
  timeFilter: { start: Date; end: Date }
): Promise<{
  categories: SpendingCategoryData[];
  summary: {
    total_spending: number;
    formatted_total: string;
    category_count: number;
    transaction_count: number;
    period: string;
  };
}> {
  // Fetch expenses with categories
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('*, expense_categories(id, name, color)')
    .eq('user_id', userId)
    .gte('expense_date', timeFilter.start.toISOString())
    .lte('expense_date', timeFilter.end.toISOString())
  
  console.log(`Spending categories data fetched: ${expenses?.length || 0} expenses`)
  
  if (!expensesError && expenses && expenses.length > 0) {
    // Calculate total spending
    const totalSpending = expenses.reduce((sum: number, expense: any) => {
      return sum + (parseFloat(expense.amount) || 0)
    }, 0)
    
    // Group expenses by category
    const categoryMap: Record<string, any> = {}
    
    expenses.forEach((expense: any) => {
      const categoryId = expense.category_id || 'uncategorized'
      const categoryName = expense.expense_categories?.name || 'Uncategorized'
      // Use a default color if color is not available
      const categoryColor = expense.expense_categories?.color || 
        (expense.expense_categories?.id ? getDefaultColorForCategory(expense.expense_categories.id) : '#888888')
      const amount = parseFloat(expense.amount) || 0
      
      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = {
          id: categoryId,
          category: categoryName,
          color: categoryColor,
          amount: 0,
          transaction_count: 0,
          transactions: []
        }
      }
      
      categoryMap[categoryId].amount += amount
      categoryMap[categoryId].transaction_count += 1
      categoryMap[categoryId].transactions.push({
        id: expense.id,
        date: expense.expense_date, // Corrected from expense.date
        name: expense.name,
        amount: amount,
        formatted_amount: new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(amount)
      })
    })
    
    // Format category data
    const categories = Object.values(categoryMap).map((category: any) => {
      const percentOfTotal = totalSpending > 0 ? (category.amount / totalSpending * 100) : 0
      
      return {
        ...category,
        formatted_amount: formatCurrency(category.amount),
        percent_of_total: percentOfTotal,
        formatted_percent: `${percentOfTotal.toFixed(1)}%`,
        average_transaction: category.transaction_count > 0 ? 
          (category.amount / category.transaction_count) : 0,
        formatted_average: formatCurrency(category.transaction_count > 0 ? 
          (category.amount / category.transaction_count) : 0)
      }
    }).sort((a: any, b: any) => b.amount - a.amount)
    
    return {
      categories,
      summary: {
        total_spending: totalSpending,
        formatted_total: formatCurrency(totalSpending),
        category_count: categories.length,
        transaction_count: expenses.length,
        period: `${timeFilter.start.toLocaleDateString()} - ${timeFilter.end.toLocaleDateString()}`
      }
    }
  } else {
    if (expensesError) console.error("Error fetching expenses for categories:", expensesError);
    return {
      categories: [],
      summary: {
        total_spending: 0,
        formatted_total: formatCurrency(0),
        category_count: 0,
        transaction_count: 0,
        period: `${timeFilter.start.toLocaleDateString()} - ${timeFilter.end.toLocaleDateString()}`
      }
    };
  }
}

// Helper function to generate income occurrences within a time range
// TODO: Define a proper type for 'income' based on your Supabase table structure
function generateIncomeOccurrences(
  income: any, 
  timeFilter: { start: Date; end: Date }
): any[] { 
  const occurrences: any[] = [];
  const incomeStartDate = new Date(income.start_date);
  const reportStartDate = new Date(timeFilter.start);
  const reportEndDate = new Date(timeFilter.end);

  if (!income.is_recurring) {
    // For non-recurring income, check if its single date falls within the filter
    if (incomeStartDate >= reportStartDate && incomeStartDate <= reportEndDate) {
      occurrences.push({ ...income, date: incomeStartDate.toISOString() });
    }
    return occurrences;
  }

  // For recurring income
  let currentOccurrenceDate = new Date(income.start_date);

  // Loop to find all occurrences within the report's time window
  // Assumes no specific 'recurrence_end_date' field for now.
  while (currentOccurrenceDate <= reportEndDate) {
    if (currentOccurrenceDate >= reportStartDate) {
      // This occurrence is within the report's time window
      occurrences.push({
        ...income,
        date: currentOccurrenceDate.toISOString(), // This specific instance's date
      });
    }

    const nextDate = new Date(currentOccurrenceDate);
    switch (income.frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'bi-weekly': // Every 2 weeks
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'semi-annually': // Every 6 months
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'annually':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        // Unknown or 'one-time' (though 'one-time' should be handled by !is_recurring)
        // To prevent infinite loops for unhandled frequencies:
        console.warn(`Unsupported frequency: ${income.frequency} for income ID ${income.id}`);
        return occurrences; 
    }
    
    if (nextDate.getTime() === currentOccurrenceDate.getTime()) {
        console.warn(`Stagnant date advancement for income ID ${income.id}, frequency ${income.frequency}. Breaking recurrence.`);
        break;
    }
    currentOccurrenceDate = nextDate;
  }
  return occurrences;
}

// Fetch income sources data
async function fetchIncomeSourcesData(
  supabase: SupabaseClient,
  userId: string,
  timeFilter: { start: Date; end: Date }
): Promise<{
  categories: Array<{
    id: string;
    name: string;
    amount: number;
    color: string;
    percent: number;
    transactions: Array<{
      id: string;
      date: string;
      description: string;
      amount: number;
    }>;
  }>;
  total: number;
}> {
  // Fetch all income data whose start_date is on or before the report's end date.
  // Further filtering for recurrence and specific dates will happen in code.
  const { data: potentialIncomes, error: incomesError } = await supabase
    .from('incomes')
    .select('*, income_categories(*)')
    .eq('user_id', userId)
    .lte('start_date', timeFilter.end.toISOString()) // Fetch broadly
    .order('start_date', { ascending: false });

  // Fetch all income categories (remains the same)
  const { data: allCategories, error: categoriesError } = await supabase
    .from('income_categories')
    .select('*')
    .eq('user_id', userId);

  if (incomesError) {
    console.error('Error fetching potential incomes:', incomesError);
    return { categories: [], total: 0 }; // Or throw
  }
  if (categoriesError) {
    console.error('Error fetching income categories:', categoriesError);
    return { categories: [], total: 0 }; // Or throw
  }

  console.log(`Potential income sources fetched: ${potentialIncomes?.length || 0} entries, ${allCategories?.length || 0} categories`);

  let reportableIncomeInstances: any[] = []; // TODO: Type this properly
  if (potentialIncomes) {
    potentialIncomes.forEach((income: any) => { // TODO: Type 'income' properly
      const occurrences = generateIncomeOccurrences(income, timeFilter);
      reportableIncomeInstances.push(...occurrences);
    });
  }
  
  console.log(`Reportable income instances after processing recurrence: ${reportableIncomeInstances.length}`);

  if (reportableIncomeInstances.length === 0) {
    return { categories: [], total: 0 };
  }

  // Calculate total income from reportable instances
  const totalIncome = reportableIncomeInstances.reduce((sum: number, incomeInstance: any) => {
    return sum + (parseFloat(incomeInstance.amount) || 0);
  }, 0);

  // Process all reportable income instances. 
  // The 'processedIncomes' variable is not directly used for final output structure, 
  // but the mapping logic is now applied within the sourceMap population.

  // Group income by source/category using reportableIncomeInstances
  const sourceMap: Record<string, any> = {};
  reportableIncomeInstances.forEach((incomeInstance: any) => {
      const categoryId = incomeInstance.category_id || 'uncategorized';
      const categoryName = incomeInstance.income_categories?.name || 'Uncategorized';
      const categoryColor = incomeInstance.income_categories?.color || '#4CAF50';
      const amount = parseFloat(incomeInstance.amount) || 0;
      const isRecurringSource = incomeInstance.is_recurring || false; // Property of the original source
      const sourceFrequency = incomeInstance.frequency || 'one-time'; // Property of the original source

      if (!sourceMap[categoryId]) {
        sourceMap[categoryId] = {
          id: categoryId,
          name: categoryName, // Use 'name' for consistency with output structure
          color: categoryColor,
          amount: 0,
          transaction_count: 0, // Counts actual occurrences in this category
          recurring_instance_count: 0, // Counts instances from a recurring source
          transactions: [], // Will hold individual transaction instances
          source_frequencies: {} // Tracks frequencies of original sources contributing
        };
      }

      sourceMap[categoryId].amount += amount;
      sourceMap[categoryId].transaction_count += 1;

      if (isRecurringSource) {
        sourceMap[categoryId].recurring_instance_count += 1;
      }

      if (!sourceMap[categoryId].source_frequencies[sourceFrequency]) {
        sourceMap[categoryId].source_frequencies[sourceFrequency] = 0;
      }
      sourceMap[categoryId].source_frequencies[sourceFrequency] += 1;

      // Add transaction details for this specific instance
      sourceMap[categoryId].transactions.push({
        id: incomeInstance.id, // ID of the original income source
        date: incomeInstance.date, // Actual date of this occurrence
        // formatted_date: new Date(incomeInstance.date).toLocaleDateString(), // Can be formatted later if needed
        description: incomeInstance.name || incomeInstance.description || '', // Name or description of source
        amount: amount,
        // formatted_amount: new Intl.NumberFormat('en-US', { 
        //   style: 'currency', 
        //   currency: 'USD' 
        // }).format(amount), // Formatting can be done at presentation layer
        // is_recurring_source: isRecurringSource, // Info about original source
        // source_frequency: sourceFrequency, // Info about original source
        // payment_method: incomeInstance.payment_method || ''
      });
    });

    // Format category data for the final output
    const categoriesOutput = Object.values(sourceMap).map((categoryData: any) => {
      const percentOfTotal = totalIncome > 0 ? (categoryData.amount / totalIncome * 100) : 0;
      // const recurringInstancePercentage = categoryData.transaction_count > 0 ? 
      //   (categoryData.recurring_instance_count / categoryData.transaction_count * 100) : 0;

      return {
        id: categoryData.id,
        name: categoryData.name,
        amount: categoryData.amount,
        color: categoryData.color,
        percent: parseFloat(percentOfTotal.toFixed(2)),
        transactions: categoryData.transactions, // Already shaped correctly
        // You could add more aggregated data here if the return type is extended:
        // transaction_count: categoryData.transaction_count,
        // recurring_instance_count: categoryData.recurring_instance_count,
        // recurring_instance_percentage: parseFloat(recurringInstancePercentage.toFixed(2)),
        // source_frequencies: categoryData.source_frequencies
      };
    });

    return {
      categories: categoriesOutput,
      total: totalIncome,
    };

  // Fallback for no incomes or errors handled before this point
  return { categories: [], total: 0 };
}

