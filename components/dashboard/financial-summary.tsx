"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { 
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon,
  ArrowUp,
  ArrowDown,
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { 
  BarChart, 
  PieChart, 
  LineChart, 
  ResponsiveContainer, 
  Bar, 
  Pie, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell,
  Area,
  AreaChart,
  ReferenceLine
} from "recharts"

interface FinancialSummaryProps {
  // Support both the original interface and the simplified props
  accountSummary?: {
    totalBalance: number
    accountCount: number
    currencyBreakdown: { [key: string]: number }
    typeBreakdown: { [key: string]: number }
  }
  transactionStats?: {
    totalIncome: number
    totalExpenses: number
    netIncome: number
    transactionCount: number
    averageTransaction: number
  }
  monthlyData?: Array<{
    month: string
    income: number
    expenses: number
    recurring_income?: number
    one_time_income?: number
    recurring_expenses?: number
    one_time_expenses?: number
  }>
  // Direct props as passed from dashboard page
  totalIncome?: number
  totalExpenses?: number
  netIncome?: number
  categorySpending: Array<{
    name: string
    amount?: number
    total_amount?: number
    color?: string
    is_recurring?: boolean
  }>
}

export function FinancialSummary({ 
  accountSummary, 
  transactionStats, 
  monthlyData, 
  totalIncome: directTotalIncome, 
  totalExpenses: directTotalExpenses, 
  netIncome: directNetIncome, 
  categorySpending 
}: FinancialSummaryProps) {
  // Use either direct props or transactionStats
  const totalIncome = directTotalIncome ?? transactionStats?.totalIncome ?? 0
  const totalExpenses = directTotalExpenses ?? transactionStats?.totalExpenses ?? 0
  const netIncome = directNetIncome ?? transactionStats?.netIncome ?? (totalIncome - totalExpenses)
  
  // Calculate financial health metrics
  const savingsRate = totalIncome > 0 
    ? (netIncome / totalIncome) * 100 
    : 0
  
  // Prepare data for account type breakdown chart
  const accountTypeData = accountSummary?.typeBreakdown 
    ? Object.entries(accountSummary.typeBreakdown).map(([type, amount]) => ({
        name: type,
        value: amount,
      }))
    : []
  
  // Prepare data for category spending chart
  const topCategories = [...(categorySpending || [])]
    .filter(category => {
      // Filter out categories with no spending or those named 'Uncategorized'
      return category && 
             ((category.amount && category.amount > 0) || (category.total_amount && category.total_amount > 0)) && 
             category.name && 
             category.name.toLowerCase() !== 'uncategorized';
    })
    .sort((a, b) => {
      // Use either amount or total_amount, whichever is available
      const aAmount = (a.amount !== undefined ? a.amount : (a.total_amount !== undefined ? a.total_amount : 0));
      const bAmount = (b.amount !== undefined ? b.amount : (b.total_amount !== undefined ? b.total_amount : 0));
      return bAmount - aAmount;
    }) // Sort by amount, handling different property names
    .slice(0, 5) // Get top 5 categories
    
  // Create fallback data if no categories are available
  const categoryData = topCategories.length > 0 ? topCategories : [
    { name: "Food & Dining", amount: 850, color: "#0088FE" },
    { name: "Housing", amount: 1200, color: "#00C49F" },
    { name: "Transportation", amount: 450, color: "#FFBB28" },
    { name: "Entertainment", amount: 320, color: "#FF8042" },
    { name: "Utilities", amount: 280, color: "#A569BD" }
  ]
    
  // Format monthly data for the chart
  const formattedMonthlyData = (monthlyData || []).map(item => ({
    month: item.month,
    income: Number(item.income) || 0,
    expenses: Number(item.expenses) || 0,
    recurring_income: Number(item.recurring_income) || 0,
    one_time_income: Number(item.one_time_income) || 0,
    recurring_expenses: Number(item.recurring_expenses) || 0,
    one_time_expenses: Number(item.one_time_expenses) || 0
  }))
  
  // Default colors for categories
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#58D68D']
  
  return (
    <Card className="w-full overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <CardHeader className="bg-gradient-to-r from-blue-100/50 to-transparent dark:from-blue-900/30 dark:to-transparent border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-xl">
              <BarChartIcon className="h-6 w-6 text-blue-600 mr-2" />
              Financial Summary
            </CardTitle>
            <CardDescription className="text-sm mt-1">Overview of your financial health and spending patterns</CardDescription>
          </div>
          <div className="bg-blue-200 dark:bg-blue-800/50 p-2.5 rounded-full shadow-sm">
            <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Key Financial Metrics */}
          <div className="space-y-5">
            <h3 className="text-sm font-medium flex items-center">
              <LineChart className="h-4 w-4 mr-1.5 text-muted-foreground" />
              Key Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Income */}
              <div className="border rounded-lg p-4 shadow-sm bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-slate-900 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Income</h3>
                  <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full">
                    <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
              </div>
              
              {/* Expenses */}
              <div className="border rounded-lg p-4 shadow-sm bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-900 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Expenses</h3>
                  <div className="bg-red-100 dark:bg-red-900/30 p-1.5 rounded-full">
                    <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpenses)}</p>
              </div>
              
              {/* Net Income */}
              <div className="border rounded-lg p-4 shadow-sm bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Net Income</h3>
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-full">
                    <Wallet className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(netIncome)}</p>
              </div>
              
              {/* Savings Rate */}
              <div className="border rounded-lg p-4 shadow-sm bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Savings Rate</h3>
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-full">
                    <DollarSign className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{savingsRate.toFixed(1)}%</p>
              </div>
            </div>
            
            {/* Monthly Trend Chart */}
            <div className="border rounded-lg p-4 shadow-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 hover:shadow-md transition-shadow duration-200">
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <LineChartIcon className="h-4 w-4 mr-1.5 text-blue-500" />
                Monthly Trend
              </h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={formattedMonthlyData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6b7280" 
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      tickFormatter={(value) => `$${value}`}
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', padding: '8px 12px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                      dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorExpenses)"
                      dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Account and Category Breakdown */}
          <div className="space-y-5">
            {/* Account Type Breakdown */}
            <div className="border rounded-lg p-4 shadow-sm bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900 hover:shadow-md transition-shadow duration-200">
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <PieChartIcon className="h-4 w-4 mr-1.5 text-purple-500" />
                Account Distribution
              </h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={accountTypeData || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      innerRadius={30}
                      paddingAngle={2}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {accountTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', padding: '8px 12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Top Spending Categories */}
            <div className="border rounded-lg p-4 shadow-sm bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 hover:shadow-md transition-shadow duration-200">
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <BarChartIcon className="h-4 w-4 mr-1.5 text-amber-500" />
                Top Spending Categories
              </h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryData}
                    layout="vertical"
                    margin={{ top: 5, right: 5, left: 50, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => `$${value}`} 
                      stroke="#6b7280" 
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#6b7280" 
                      width={100}
                      tickFormatter={(value, index) => {
                        const category = categoryData[index];
                        return category?.is_recurring ? `${value} (R)` : value;
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: '1px solid #e5e7eb', 
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', 
                        padding: '8px 12px' 
                      }}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    />
                    <Bar dataKey="amount" name="Amount" radius={[0, 6, 6, 0]}>
                      {topCategories.slice(0, 5).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color || COLORS[index % COLORS.length]}
                          strokeWidth={entry.is_recurring ? 2 : 0}
                          stroke={entry.is_recurring ? '#000' : 'none'}
                          strokeDasharray={entry.is_recurring ? '5 5' : 'none'}
                        />
                      ))}
                    </Bar>
                    <ReferenceLine 
                      x={categoryData.length > 0 ? categoryData.reduce((sum, cat) => sum + (cat.amount || cat.total_amount || 0), 0) / categoryData.length : 0} 
                      stroke="#6b7280" 
                      strokeDasharray="3 3" 
                      label={{ value: 'Avg', position: 'right', fill: '#6b7280', fontSize: 10 }} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
