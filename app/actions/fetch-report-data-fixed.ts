"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { ReportType, TimeRange } from "./reports"

// Fetch data for reports based on type and time range
export async function fetchReportData(reportType: ReportType, timeRange: TimeRange) {
  const supabase = await createServerSupabaseClient()
  
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }
  
  const user = await getAuthenticatedUser()
  
  if (!user) {
    throw new Error("Authentication required")
  }
  
  // Get time range filter
  const timeFilter = getTimeRangeFilter(timeRange)
  let data: any[] = []
  
  try {
    switch (reportType) {
      case 'overview':
        // Fetch overview data (transactions, income, expenses, net worth)
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', timeFilter.start.toISOString())
          .lte('created_at', timeFilter.end.toISOString())
          .order('created_at', { ascending: false })
        
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
              recurring: transaction.is_recurring ? true : false,
              notes: transaction.notes || '',
              status: transaction.status || ''
            };
          });
        } else if (transactionsError) {
          console.error("Error fetching transactions:", transactionsError);
        }
        break;
        
      case 'income-expense':
        // Fetch income and expense data
        const { data: incomeExpense, error: incomeExpenseError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .in('type', ['income', 'expense'])
          .gte('created_at', timeFilter.start.toISOString())
          .lte('created_at', timeFilter.end.toISOString())
          .order('created_at', { ascending: false })
        
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
              recurring: item.is_recurring ? true : false,
              frequency: item.frequency || '',
              tax_deductible: item.tax_deductible ? true : false,
              notes: item.notes || '',
              status: item.status || ''
            };
          });
        } else if (incomeExpenseError) {
          console.error("Error fetching income/expense data:", incomeExpenseError);
        }
        break;
        
      case 'net-worth':
        // Fetch net worth data (assets and liabilities)
        const { data: assets, error: assetsError } = await supabase
          .from('assets')
          .select('*')
          .eq('user_id', user.id)
        
        const { data: liabilities, error: liabilitiesError } = await supabase
          .from('liabilities')
          .select('*')
          .eq('user_id', user.id)
        
        if ((!assetsError || !liabilitiesError) && (assets || liabilities)) {
          // Process and combine assets and liabilities
          const processedAssets = (assets || []).map((asset: any) => {
            // Format value with currency
            const formattedValue = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(asset.value || 0);
            
            // Format dates with validation
            let dateAcquired = '';
            let maturityDate = '';
            let updatedDate = '';
            
            try {
              if (asset.date_acquired && !isNaN(new Date(asset.date_acquired).getTime())) {
                dateAcquired = new Date(asset.date_acquired).toLocaleDateString();
              }
              
              if (asset.maturity_date && !isNaN(new Date(asset.maturity_date).getTime())) {
                maturityDate = new Date(asset.maturity_date).toLocaleDateString();
              }
              
              const updateDate = asset.updated_at || asset.created_at;
              if (updateDate && !isNaN(new Date(updateDate).getTime())) {
                updatedDate = new Date(updateDate).toLocaleDateString();
              }
            } catch (error) {
              // Keep empty values if any date parsing fails
            }
            
            return {
              ...asset,
              type: 'asset',
              formatted_value: formattedValue,
              date_acquired: dateAcquired,
              maturity_date: maturityDate,
              last_updated: updatedDate,
              interest_rate: asset.interest_rate ? `${asset.interest_rate}%` : '',
              account_number: asset.account_number ? `xxxx-${asset.account_number.slice(-4)}` : '',
              notes: asset.notes || '',
              status: asset.status || ''
            };
          });
          
          const processedLiabilities = (liabilities || []).map((liability: any) => {
            // Format value with currency
            const formattedValue = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(liability.value || 0);
            
            // Format dates with validation
            let dateAcquired = '';
            let maturityDate = '';
            let updatedDate = '';
            
            try {
              if (liability.date_acquired && !isNaN(new Date(liability.date_acquired).getTime())) {
                dateAcquired = new Date(liability.date_acquired).toLocaleDateString();
              }
              
              if (liability.maturity_date && !isNaN(new Date(liability.maturity_date).getTime())) {
                maturityDate = new Date(liability.maturity_date).toLocaleDateString();
              }
              
              const updateDate = liability.updated_at || liability.created_at;
              if (updateDate && !isNaN(new Date(updateDate).getTime())) {
                updatedDate = new Date(updateDate).toLocaleDateString();
              }
            } catch (error) {
              // Keep empty values if any date parsing fails
            }
            
            return {
              ...liability,
              type: 'liability',
              formatted_value: formattedValue,
              date_acquired: dateAcquired,
              maturity_date: maturityDate,
              last_updated: updatedDate,
              interest_rate: liability.interest_rate ? `${liability.interest_rate}%` : '',
              account_number: liability.account_number ? `xxxx-${liability.account_number.slice(-4)}` : '',
              notes: liability.notes || '',
              status: liability.status || ''
            };
          });
          
          // Combine assets and liabilities
          data = [...processedAssets, ...processedLiabilities];
        } else {
          if (assetsError) console.error("Error fetching assets:", assetsError);
          if (liabilitiesError) console.error("Error fetching liabilities:", liabilitiesError);
        }
        break;
        
      case 'investments':
        // Fetch investment data
        const { data: investments, error: investmentsError } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
        
        if (!investmentsError && investments) {
          // Process and enrich the data
          data = investments.map((investment: any) => {
            // Calculate current value and gain/loss
            const shares = investment.shares || 0;
            const price = investment.price || 0;
            const currentValue = shares * price;
            const costBasis = investment.cost_basis || 0;
            const gainLoss = currentValue - costBasis;
            const gainLossPercent = costBasis > 0 ? ((gainLoss / costBasis) * 100).toFixed(2) + '%' : '0%';
            
            // Format currency values
            const formattedPrice = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(price);
            
            const formattedValue = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(currentValue);
            
            const formattedCostBasis = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(costBasis);
            
            const formattedGainLoss = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(gainLoss);
            
            // Format dates with validation
            let dateAcquired = '';
            let updatedDate = '';
            
            try {
              if (investment.date_acquired && !isNaN(new Date(investment.date_acquired).getTime())) {
                dateAcquired = new Date(investment.date_acquired).toLocaleDateString();
              }
              
              const updateDate = investment.updated_at || investment.created_at;
              if (updateDate && !isNaN(new Date(updateDate).getTime())) {
                updatedDate = new Date(updateDate).toLocaleDateString();
              }
            } catch (error) {
              // Keep empty values if any date parsing fails
            }
            
            return {
              ...investment,
              shares: shares,
              price: price,
              formatted_price: formattedPrice,
              value: currentValue,
              formatted_value: formattedValue,
              cost_basis: costBasis,
              formatted_cost_basis: formattedCostBasis,
              gain_loss: gainLoss,
              formatted_gain_loss: formattedGainLoss,
              gain_loss_percent: gainLossPercent,
              date_acquired: dateAcquired,
              last_updated: updatedDate,
              account_name: investment.account_name || investment.account || '',
              institution: investment.institution || '',
              symbol: investment.symbol || '',
              name: investment.name || '',
              notes: investment.notes || ''
            };
          });
        } else if (investmentsError) {
          console.error("Error fetching investments:", investmentsError);
        }
        break;
        
      case 'budget-analysis':
        // Fetch budget data
        const { data: budgets, error: budgetsError } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', timeFilter.start.toISOString())
          .lte('created_at', timeFilter.end.toISOString())
        
        if (!budgetsError && budgets) {
          // Process and enrich the data
          data = budgets.map((budget: any) => {
            // Calculate budget metrics
            const budgeted = budget.budgeted_amount || 0;
            const actual = budget.actual_amount || 0;
            const difference = budgeted - actual;
            const percentUsed = budgeted > 0 ? ((actual / budgeted) * 100).toFixed(2) + '%' : '0%';
            
            // Format currency values
            const formattedBudgeted = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(budgeted);
            
            const formattedActual = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(actual);
            
            const formattedDifference = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(difference);
            
            // Format period
            const month = budget.month || '';
            const year = budget.year || '';
            const period = month && year ? `${month}/${year}` : '';
            
            return {
              ...budget,
              budgeted: budgeted,
              formatted_budgeted: formattedBudgeted,
              actual: actual,
              formatted_actual: formattedActual,
              difference: difference,
              formatted_difference: formattedDifference,
              percent_used: percentUsed,
              month: month,
              year: year,
              period: period,
              category: budget.category || '',
              subcategory: budget.subcategory || '',
              notes: budget.notes || ''
            };
          });
        } else if (budgetsError) {
          console.error("Error fetching budget data:", budgetsError);
        }
        break;
        
      case 'spending-categories':
        // Fetch spending by category data
        const { data: categorySpending, error: categorySpendingError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .gte('created_at', timeFilter.start.toISOString())
          .lte('created_at', timeFilter.end.toISOString())
        
        if (!categorySpendingError && categorySpending) {
          // Process and aggregate data by category
          const spendingMap: any = {};
          let totalSpending = 0;
          
          // First pass: aggregate data
          categorySpending.forEach((transaction: any) => {
            const amount = transaction.amount || 0;
            totalSpending += amount;
            
            const categoryId = transaction.category || '';
            const subcategoryId = transaction.subcategory || '';
            const categoryName = transaction.category_name || categoryId;
            const subcategoryName = transaction.subcategory_name || subcategoryId;
            
            // Initialize category if it doesn't exist
            if (!spendingMap[categoryId]) {
              spendingMap[categoryId] = {
                id: categoryId,
                category: categoryName,
                amount: 0,
                transaction_count: 0,
                subcategories: {}
              }
            }
            
            // Add amount to category
            spendingMap[categoryId].amount += amount;
            spendingMap[categoryId].transaction_count += 1;
            
            // Handle subcategory
            if (subcategoryId) {
              if (!spendingMap[categoryId].subcategories[subcategoryId]) {
                spendingMap[categoryId].subcategories[subcategoryId] = {
                  id: subcategoryId,
                  subcategory: subcategoryName,
                  amount: 0,
                  transaction_count: 0
                }
              }
              
              spendingMap[categoryId].subcategories[subcategoryId].amount += amount
              spendingMap[categoryId].subcategories[subcategoryId].transaction_count += 1
            }
          })
          
          // Second pass: calculate percentages and format data
          data = Object.values(spendingMap).map((category: any) => {
            // Calculate percentage of total spending
            const percentOfTotal = totalSpending > 0 ? (category.amount / totalSpending * 100) : 0
            
            // Format currency values
            const formattedAmount = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(category.amount || 0);
            
            // Calculate average transaction amount
            const avgTransaction = category.transaction_count > 0 ? 
              (category.amount / category.transaction_count) : 0;
              
            const formattedAverage = new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(avgTransaction);
            
            // Process subcategories into array with formatted values
            const subcategories = Object.values(category.subcategories).map((sub: any) => {
              const subPercentOfCategory = category.amount > 0 ? (sub.amount / category.amount * 100) : 0;
              const subPercentOfTotal = totalSpending > 0 ? (sub.amount / totalSpending * 100) : 0;
              
              const subFormattedAmount = new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'USD' 
              }).format(sub.amount || 0);
              
              return {
                ...sub,
                percent_of_category: subPercentOfCategory.toFixed(2) + '%',
                percent_of_total: subPercentOfTotal.toFixed(2) + '%',
                formatted_amount: subFormattedAmount
              };
            });
            
            // Format dates and period
            const month = new Date(timeFilter.start).getMonth() + 1;
            const year = new Date(timeFilter.start).getFullYear();
            const period = `${month}/${year}`;
            
            return {
              ...category,
              percent_of_total: percentOfTotal.toFixed(2) + '%',
              formatted_amount: formattedAmount,
              average_transaction: avgTransaction,
              formatted_average: formattedAverage,
              subcategories: subcategories,
              month: month,
              year: year,
              period: period
            };
          });
        } else if (categorySpendingError) {
          console.error("Error fetching category spending data:", categorySpendingError);
        }
        break;
    }
    
    return data
  } catch (error) {
    console.error(`Error fetching data for ${reportType} report:`, error)
    return []
  }
}

// Helper function to get date range from time range
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
