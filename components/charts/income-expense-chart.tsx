"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { formatCurrency } from "@/lib/utils/formatting" // Updated import
import { addMonths, format, parseISO, isAfter } from "date-fns"

interface IncomeExpenseData {
  month: string
  income: number
  expenses: number
  recurring_income?: number
  recurring_expenses?: number
  one_time_income?: number
  one_time_expenses?: number
  is_projected?: boolean
  end_date?: string
  frequency?: string
}

interface ChartDataItem {
  month: string
  income: number
  expenses: number
  isProjected: boolean
  actualIncome?: number
  actualExpenses?: number
  projectedIncome?: number
  projectedExpenses?: number
  recurring_income?: number
  recurring_expenses?: number
  one_time_income?: number
  one_time_expenses?: number
  is_projected?: boolean
}

interface IncomeExpenseChartProps {
  data: IncomeExpenseData[]
  title?: string
  description?: string
  totalIncome?: number
  totalExpenses?: number
  recurringIncome?: number
  recurringExpenses?: number
  oneTimeIncome?: number
  oneTimeExpenses?: number
  projectMonths?: number
}

export function IncomeExpenseChart({
  data,
  title = "Income vs. Expenses",
  description = "Monthly comparison of income and expenses",
  totalIncome: propTotalIncome,
  totalExpenses: propTotalExpenses,
  recurringIncome: propRecurringIncome,
  recurringExpenses: propRecurringExpenses,
  oneTimeIncome: propOneTimeIncome,
  oneTimeExpenses: propOneTimeExpenses,
  projectMonths = 3, // Default to projecting 3 months into the future
}: IncomeExpenseChartProps) {
  const [timeframe, setTimeframe] = useState("6m")
  const [enhancedData, setEnhancedData] = useState<ChartDataItem[]>([])
  const [activeBar, setActiveBar] = useState<string | null>(null)
  const [monthlyRecurringIncome, setMonthlyRecurringIncome] = useState(0)
  const [monthlyRecurringExpenses, setMonthlyRecurringExpenses] = useState(0)

  // Helper function to normalize amounts based on frequency
  const normalizeAmountByFrequency = (amount: number, frequency?: string): number => {
    if (!frequency) return amount
    
    switch (frequency.toLowerCase()) {
      case 'weekly':
        return amount * 4 // Weekly to monthly (multiply by 4)
      case 'bi_weekly':
      case 'biweekly':
        return amount * 2 // Bi-weekly to monthly (multiply by 2)
      case 'quarterly':
        return amount / 3 // Quarterly to monthly (divide by 3)
      case 'semi_annual':
        return amount / 6 // Semi-annual to monthly (divide by 6)
      case 'annual':
        return amount / 12 // Annual to monthly (divide by 12)
      case 'monthly':
      default:
        return amount // Already monthly
    }
  }

  // Process data to include projections based on recurring income/expenses
  useEffect(() => {
    if (!data || data.length === 0) return

    // Create a clean array of chart data from the original data
    const actualData: ChartDataItem[] = data.map(item => ({
      month: item.month,
      income: item.income,
      expenses: item.expenses,
      isProjected: false,
      is_projected: false,
      actualIncome: item.income,
      actualExpenses: item.expenses,
      projectedIncome: 0,
      projectedExpenses: 0,
      recurring_income: item.recurring_income || 0,
      recurring_expenses: item.recurring_expenses || 0,
      one_time_income: item.one_time_income || 0,
      one_time_expenses: item.one_time_expenses || 0
    }))

    // Get recurring income and expenses for projections
    let calculatedMonthlyRecurringIncome = 0
    let calculatedMonthlyRecurringExpenses = 0

    // Use props if available, otherwise calculate from data
    if (propRecurringIncome !== undefined) {
      calculatedMonthlyRecurringIncome = propRecurringIncome
    } else {
      // Calculate from recurring transactions in data
      calculatedMonthlyRecurringIncome = data
        .filter(item => item.recurring_income && item.recurring_income > 0)
        .reduce((sum, item) => {
          return sum + normalizeAmountByFrequency(item.recurring_income || 0, item.frequency || 'monthly')
        }, 0)
    }

    if (propRecurringExpenses !== undefined) {
      calculatedMonthlyRecurringExpenses = propRecurringExpenses
    } else {
      // Calculate from recurring transactions in data
      calculatedMonthlyRecurringExpenses = data
        .filter(item => item.recurring_expenses && item.recurring_expenses > 0)
        .reduce((sum, item) => {
          return sum + normalizeAmountByFrequency(item.recurring_expenses || 0, item.frequency || 'monthly')
        }, 0)
    }
    
    // Update state variables for use in the render
    setMonthlyRecurringIncome(calculatedMonthlyRecurringIncome)
    setMonthlyRecurringExpenses(calculatedMonthlyRecurringExpenses)

    // Get the current date to start projections from
    const currentDate = new Date()
    
    // Ensure we have non-zero values for recurring income/expenses for projection
    // If they're zero, use a default value based on average of actual data
    let projectedRecurringIncome = calculatedMonthlyRecurringIncome
    let projectedRecurringExpenses = calculatedMonthlyRecurringExpenses
    
    if (projectedRecurringIncome === 0 && actualData.length > 0) {
      // Calculate average income from actual data
      projectedRecurringIncome = actualData.reduce((sum, item) => sum + (item.income || 0), 0) / actualData.length
      console.log('Using average income for projections:', projectedRecurringIncome)
    }
    
    if (projectedRecurringExpenses === 0 && actualData.length > 0) {
      // Calculate average expenses from actual data
      projectedRecurringExpenses = actualData.reduce((sum, item) => sum + (item.expenses || 0), 0) / actualData.length
      console.log('Using average expenses for projections:', projectedRecurringExpenses)
    }
    
    // Update state for use in the render
    setMonthlyRecurringIncome(projectedRecurringIncome)
    setMonthlyRecurringExpenses(projectedRecurringExpenses)
    
    // Generate projected data for future months
    const projectedData: ChartDataItem[] = []
    
    // Find the latest month in actual data to start projections from
    let latestMonth = currentDate
    if (actualData.length > 0) {
      // Sort actual data by date
      const sortedActualData = [...actualData].sort((a, b) => {
        const monthMap: Record<string, number> = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        }
        
        const [aMonth, aYear] = a.month.split(' ')
        const [bMonth, bYear] = b.month.split(' ')
        
        const aDate = new Date(parseInt(aYear), monthMap[aMonth], 1)
        const bDate = new Date(parseInt(bYear), monthMap[bMonth], 1)
        
        return aDate.getTime() - bDate.getTime()
      })
      
      // Get the latest month from actual data
      const lastItem = sortedActualData[sortedActualData.length - 1]
      
      // Use current date as fallback if we can't parse the date properly
      try {
        const [month, year] = lastItem.month.split(' ')
        const monthMap: Record<string, number> = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        }
        
        // Only set latestMonth if month and year are valid
        if (month && year && monthMap[month] !== undefined) {
          latestMonth = new Date(parseInt(year), monthMap[month], 1)
        }
      } catch (error) {
        console.error('Error parsing date:', error)
        // Keep using currentDate as fallback
      }
    }
    
    // Generate projections starting from the month after the latest actual data
    for (let i = 1; i <= projectMonths; i++) {
      const projectedDate = addMonths(latestMonth, i)
      const projectedMonth = format(projectedDate, 'MMM yyyy')
      
      // Check if this month already exists in the actual data
      const existingMonth = actualData.find(item => item.month === projectedMonth)
      if (!existingMonth) {
        projectedData.push({
          month: projectedMonth,
          income: projectedRecurringIncome, // Use non-zero values
          expenses: projectedRecurringExpenses, // Use non-zero values
          isProjected: true,
          is_projected: true,
          actualIncome: 0,
          actualExpenses: 0,
          projectedIncome: projectedRecurringIncome,
          projectedExpenses: projectedRecurringExpenses,
          recurring_income: projectedRecurringIncome,
          recurring_expenses: projectedRecurringExpenses,
          one_time_income: 0,
          one_time_expenses: 0
        })
      }
    }
    
    console.log('Generated', projectedData.length, 'projected months with income:', projectedRecurringIncome, 'expenses:', projectedRecurringExpenses)
    
    console.log('Generated Projected Data:', projectedData.length, 'items')

    // Create a continuous timeline with unique months
    // First, create a map of all unique months
    const monthsMap = new Map<string, ChartDataItem>();
    
    // Add actual data to the map first
    actualData.forEach(item => {
      monthsMap.set(item.month, item);
    });
    
    // Add projected data, but only for months that don't already exist in actual data
    projectedData.forEach(item => {
      if (!monthsMap.has(item.month)) {
        monthsMap.set(item.month, item);
      }
    });
    
    // Convert map back to array and sort by date
    const combinedData = Array.from(monthsMap.values()).sort((a, b) => {
      try {
        // Parse month strings to ensure correct sorting
        const monthMap: Record<string, number> = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        }
        
        const [aMonth, aYear] = a.month.split(' ')
        const [bMonth, bYear] = b.month.split(' ')
        
        // Validate month and year before creating Date objects
        if (!aMonth || !aYear || !bMonth || !bYear || 
            monthMap[aMonth] === undefined || monthMap[bMonth] === undefined) {
          // If we can't parse the dates properly, maintain original order
          return 0
        }
        
        // Create proper Date objects for comparison
        const aDate = new Date(parseInt(aYear), monthMap[aMonth], 1)
        const bDate = new Date(parseInt(bYear), monthMap[bMonth], 1)
        
        return aDate.getTime() - bDate.getTime()
      } catch (error) {
        console.error('Error sorting dates:', error)
        return 0 // Maintain original order if there's an error
      }
    })
    
    console.log('Combined Data:', combinedData.length, 'items')
    
    setEnhancedData(combinedData)
  }, [data, projectMonths, propRecurringIncome, propRecurringExpenses])

  // Filter data based on timeframe and sort by month
  const filteredData = (() => {
    // Calculate how many months to show based on timeframe
    // Add projectMonths to ensure we include projected data
    const historyMonths = timeframe === "1y" ? 12 : timeframe === "6m" ? 6 : timeframe === "3m" ? 3 : enhancedData.length
    const totalMonths = historyMonths + projectMonths
    
    // Sort the data by date to ensure chronological order
    const sortedData = [...enhancedData].sort((a, b) => {
      try {
        // Parse month strings to ensure correct sorting
        const monthMap: Record<string, number> = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        }
        
        const [aMonth, aYear] = a.month.split(' ')
        const [bMonth, bYear] = b.month.split(' ')
        
        // Validate month and year before creating Date objects
        if (!aMonth || !aYear || !bMonth || !bYear || 
            monthMap[aMonth] === undefined || monthMap[bMonth] === undefined) {
          // If we can't parse the dates properly, maintain original order
          return 0
        }
        
        // Create proper Date objects for comparison
        const aDate = new Date(parseInt(aYear), monthMap[aMonth], 1)
        const bDate = new Date(parseInt(bYear), monthMap[bMonth], 1)
        
        return aDate.getTime() - bDate.getTime()
      } catch (error) {
        console.error('Error sorting dates in filteredData:', error)
        return 0 // Maintain original order if there's an error
      }
    })
    
    console.log('Sorted Data Length:', sortedData.length, 'items')
    console.log('Projected Months:', projectMonths)
    console.log('History Months:', historyMonths)
    
    // For "all" timeframe, show everything, otherwise slice to show the appropriate number of months
    const result = timeframe === "all" ? sortedData : sortedData.slice(-totalMonths)
    
    // Count how many projected items are in the result
    const projectedCount = result.filter(item => item.isProjected || item.is_projected).length
    console.log('Filtered Data Length:', result.length, 'items (including', projectedCount, 'projected items)')
    
    return result
  })()

  // Calculate totals from filtered data or use provided totals
  const chartTotalIncome = filteredData
    .filter(item => !item.isProjected) // Exclude projected months from totals
    .reduce((sum, item) => sum + (item.actualIncome || item.income), 0)
  const chartTotalExpenses = filteredData
    .filter(item => !item.isProjected) // Exclude projected months from totals
    .reduce((sum, item) => sum + (item.actualExpenses || item.expenses), 0)
  
  // Calculate recurring and one-time totals
  const chartRecurringIncome = filteredData
    .filter(item => !item.isProjected) // Exclude projected months
    .reduce((sum, item) => sum + (item.recurring_income || 0), 0)
  const chartRecurringExpenses = filteredData
    .filter(item => !item.isProjected) // Exclude projected months
    .reduce((sum, item) => sum + (item.recurring_expenses || 0), 0)
  
  // Calculate projected income and expenses for display
  const projectedTotalIncome = filteredData
    .filter(item => item.isProjected) // Only include projected months
    .reduce((sum, item) => sum + (item.projectedIncome || 0), 0)
  const projectedTotalExpenses = filteredData
    .filter(item => item.isProjected) // Only include projected months
    .reduce((sum, item) => sum + (item.projectedExpenses || 0), 0)
    
  const chartOneTimeIncome = filteredData
    .filter(item => !item.isProjected) // Exclude projected months
    .reduce((sum, item) => sum + (item.one_time_income || 0), 0)
  const chartOneTimeExpenses = filteredData
    .filter(item => !item.isProjected) // Exclude projected months
    .reduce((sum, item) => sum + (item.one_time_expenses || 0), 0)
  
  // Use provided totals if available, otherwise use calculated totals from chart data
  const totalIncome = propTotalIncome !== undefined ? propTotalIncome : chartTotalIncome
  const totalExpenses = propTotalExpenses !== undefined ? propTotalExpenses : chartTotalExpenses
  const recurringIncome = propRecurringIncome !== undefined ? propRecurringIncome : chartRecurringIncome
  const recurringExpenses = propRecurringExpenses !== undefined ? propRecurringExpenses : chartRecurringExpenses
  const oneTimeIncome = propOneTimeIncome !== undefined ? propOneTimeIncome : chartOneTimeIncome
  const oneTimeExpenses = propOneTimeExpenses !== undefined ? propOneTimeExpenses : chartOneTimeExpenses
  
  const netSavings = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0

  // Custom tooltip component for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isProjected = data.isProjected || data.is_projected;
      const netAmount = data.income - data.expenses;
      
      // Get the full month and year for display
      const [month, year] = data.month.split(' ');
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-2 border-b pb-1">
            {month} {year}
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              <span className="inline-block w-3 h-3 mr-2 rounded-sm" 
                style={{ backgroundColor: isProjected ? '#1d4ed8' : '#15803d', display: 'inline-block' }}></span>
              Income: {formatCurrency(data.income)}
            </p>
            <p className="text-sm font-medium">
              <span className="inline-block w-3 h-3 mr-2 rounded-sm" 
                style={{ backgroundColor: isProjected ? '#7e22ce' : '#b91c1c', display: 'inline-block' }}></span>
              Expenses: {formatCurrency(data.expenses)}
            </p>
            <p className={`text-sm font-semibold border-t pt-1 mt-1 ${netAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              Net: {formatCurrency(netAmount)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex justify-between mb-4">
            <Tabs defaultValue={timeframe} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-50 p-1">
                <TabsTrigger 
                  value="3m" 
                  onClick={() => setTimeframe("3m")} 
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200"
                >
                  3 Months
                </TabsTrigger>
                <TabsTrigger 
                  value="6m" 
                  onClick={() => setTimeframe("6m")} 
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200"
                >
                  6 Months
                </TabsTrigger>
                <TabsTrigger 
                  value="1y" 
                  onClick={() => setTimeframe("1y")} 
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200"
                >
                  1 Year
                </TabsTrigger>
                <TabsTrigger 
                  value="all" 
                  onClick={() => setTimeframe("all")} 
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200"
                >
                  All Time
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-4 mb-6">
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-700">Total Income</div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totalIncome)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-700">Total Expenses</div>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-700">Net Savings</div>
            <div className={`text-2xl font-bold ${netSavings >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(netSavings)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-700">Savings Rate</div>
            <div className={`text-2xl font-bold ${savingsRate >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {savingsRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Chart Legend */}
        <div className="flex flex-wrap gap-4 justify-center mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: '#15803d' }}></div>
            <span className="text-sm font-semibold text-gray-800">Actual Income</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: '#b91c1c' }}></div>
            <span className="text-sm font-semibold text-gray-800">Actual Expenses</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: '#1d4ed8' }}></div>
            <span className="text-sm font-semibold text-gray-800">Projected Income</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: '#7e22ce' }}></div>
            <span className="text-sm font-semibold text-gray-800">Projected Expenses</span>
          </div>
        </div>
        
        {/* Monthly Bar Chart */}
        <div className="h-[300px] mb-6 transition-all duration-300 hover:shadow-lg rounded-lg p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
                tickFormatter={(value) => {
                  // Just show the month name consistently for both actual and projected data
                  // The color coding of the bars will distinguish between actual and projected
                  const [month] = value.split(' ');
                  return month;
                }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
                tickFormatter={(value) => formatCurrency(value)}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
                tickCount={5}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={chartRecurringIncome} 
                stroke="#15803d" 
                strokeDasharray="3 3" 
                label={{ 
                  value: "Avg Income", 
                  fill: '#15803d', 
                  fontSize: 12,
                  position: 'right'
                }} 
              />
              <ReferenceLine 
                y={chartRecurringExpenses} 
                stroke="#b91c1c" 
                strokeDasharray="3 3" 
                label={{ 
                  value: "Avg Expenses", 
                  fill: '#b91c1c', 
                  fontSize: 12,
                  position: 'left'
                }} 
              />
              <Bar 
                dataKey="income" 
                name="Income"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
                onMouseOver={() => setActiveBar('income')}
                onMouseLeave={() => setActiveBar(null)}
                className={activeBar === 'expenses' ? 'opacity-50' : ''}
              >
                {filteredData.map((entry, index) => (
                  <Cell 
                    key={`income-${index}`} 
                    fill={entry.isProjected || entry.is_projected ? '#1d4ed8' : '#15803d'} 
                    className="transition-opacity duration-300"
                  />
                ))}
              </Bar>
              <Bar 
                dataKey="expenses" 
                name="Expenses"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
                onMouseOver={() => setActiveBar('expenses')}
                onMouseLeave={() => setActiveBar(null)}
                className={activeBar === 'income' ? 'opacity-50' : ''}
              >
                {filteredData.map((entry, index) => (
                  <Cell 
                    key={`expenses-${index}`} 
                    fill={entry.isProjected || entry.is_projected ? '#7e22ce' : '#b91c1c'} 
                    className="transition-opacity duration-300"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Financial Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 transition-all duration-300 hover:shadow-md">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Income Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Recurring Income:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(chartRecurringIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">One-time Income:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(chartOneTimeIncome)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="font-medium text-gray-800">Total Income:</span>
                  <span className="font-bold text-green-800">{formatCurrency(totalIncome)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 transition-all duration-300 hover:shadow-md">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Expense Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Recurring Expenses:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(chartRecurringExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">One-time Expenses:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(chartOneTimeExpenses)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="font-medium text-gray-800">Total Expenses:</span>
                  <span className="font-bold text-red-800">{formatCurrency(totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 transition-all duration-300 hover:shadow-md">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Savings Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-md shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-700">Net Savings</div>
                <div className={`text-lg font-bold ${netSavings >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(netSavings)}
                </div>
              </div>
              <div className="p-3 bg-white rounded-md shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-700">Savings Rate</div>
                <div className={`text-lg font-bold ${savingsRate >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {savingsRate.toFixed(1)}%
                </div>
              </div>
              <div className="p-3 bg-white rounded-md shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-700">Projected Next Month</div>
                <div className={`text-lg font-bold ${(monthlyRecurringIncome - monthlyRecurringExpenses) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(monthlyRecurringIncome - monthlyRecurringExpenses)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
