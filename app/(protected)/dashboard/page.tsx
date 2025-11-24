export const dynamic = 'force-dynamic';
import { getRecentTransactions, getMonthlyIncomeExpenseData, getTransactionStats, getFinancialCalendarData, getCombinedTransactions } from "@/app/actions/transactions"
import { getAccountSummary } from "@/app/actions/accounts"
import { getCategorySpending } from "@/app/actions/categories"
import { getCashflowForecast } from "@/lib/cashflow-utils"
import { getProjectedFinances } from "@/lib/projection-utils"
import { getNetWorth } from "@/app/actions/net-worth"
import { getAuthenticatedUser } from "@/lib/auth"
import { redirect } from 'next/navigation'

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardCards } from "@/components/dashboard/dashboard-cards"
import { FinancialHealthScore } from "@/components/dashboard/financial-health-score"
import { FinancialAssistant } from "@/components/dashboard/financial-assistant"

import { FinancialCalendar } from "@/components/dashboard/financial-calendar"
import { SankeyDiagram } from "@/components/dashboard/sankey-diagram"
import { NetWorthTimeline } from "@/components/dashboard/net-worth-timeline"
import { CashFlowForecast } from "@/components/dashboard/cash-flow-forecast"
import { WidgetLayout } from "@/components/dashboard/widget-layout"
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart"
import { FinancialInsights } from "@/components/dashboard/financial-insights"
import { FinancialSummary } from "@/components/dashboard/financial-summary"
import { InvestmentList } from "@/components/investments/investment-list"
import { ProjectedFinancesWidget } from "@/components/dashboard/projected-finances"
import { MobileTabButtons } from "@/components/dashboard/mobile-tab-buttons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// We'll use real data from the database instead of sample data

export const metadata = {
  title: "Dashboard",
  description: "View your financial overview",
}

export default async function DashboardPage() {
  try {
    // Get the authenticated user
    const user = await getAuthenticatedUser()
    
    // Handle the case where user might be null
    // We'll let the layout handle the redirect if needed
    const userId = user?.id || ''
    
    // If no user is found, render a placeholder dashboard
    // This prevents errors from being thrown by the data fetching functions
    if (!user || !userId) {
      return (
        <DashboardShell>
          <DashboardHeader heading="Dashboard" text="Your financial overview" />
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Loading dashboard...</h2>
              <p className="text-muted-foreground">Please wait while we prepare your financial data</p>
            </div>
          </div>
        </DashboardShell>
      )
    }

    // Fetch data for the dashboard
    const [
      recentTransactions, 
      accountSummary, 
      categorySpending, 
      incomeExpenseData, 
      transactionStats, 
      cashflowForecast,
      projectedFinances,
      financialCalendarData,
      combinedTransactions,
      netWorthData
    ] = await Promise.all([
      getRecentTransactions(5).catch(() => []),
      getAccountSummary().catch(() => ({
        totalBalance: 0,
        accountCount: 0,
        currencyBreakdown: {},
        typeBreakdown: {},
      })),
      getCategorySpending("month" as "month").catch(() => []),
      getMonthlyIncomeExpenseData().catch(() => []),
      getTransactionStats("month" as "month").catch(() => ({
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        transactionCount: 0,
        averageTransaction: 0,
      })),
      getCashflowForecast(userId).catch(() => ({
        projectedIncome: 0,
        projectedExpenses: 0,
        netCashflow: 0,
        savingsRate: 0,
        monthlyTrend: [],
        monthOverMonth: { income: 0, expenses: 0 }
      })),
      getProjectedFinances(userId).catch(() => ({
        projectedIncome: 0,
        projectedExpenses: 0,
        netCashflow: 0,
        savingsRate: 0,
        projectedIncomeBreakdown: [],
        projectedExpensesBreakdown: [],
        monthlyTrend: []
      })),
      getFinancialCalendarData().catch(() => []),
      getCombinedTransactions().catch(() => []),
      getNetWorth().catch(() => ({
        totalAssets: 0,
        totalLiabilities: 0,
        netWorth: 0,
        assets: [],
        liabilities: [],
        assetBreakdown: [],
        liabilityBreakdown: [],
        history: [],
        snapshots: []
      }))
    ])

    // Calculate total income and expenses from combined transactions
    const totalIncome = combinedTransactions
      .filter(transaction => transaction.is_income)
      .reduce((sum, transaction) => sum + transaction.amount, 0)
      
    const totalExpenses = combinedTransactions
      .filter(transaction => !transaction.is_income)
      .reduce((sum, transaction) => sum + transaction.amount, 0)
      
    // Calculate recurring income and expenses for projections
    const recurringIncome = combinedTransactions
      .filter(transaction => transaction.is_income && transaction.recurrence && transaction.recurrence !== 'none')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
      
    const recurringExpenses = combinedTransactions
      .filter(transaction => !transaction.is_income && transaction.recurrence && transaction.recurrence !== 'none')
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    // Format category spending data for the financial summary
    const formattedCategorySpending = categorySpending
      .filter(category => category && (category.total_amount > 0 || category.amount > 0))
      .map(category => ({
        name: category.name || category.category_name || 'Uncategorized',
        amount: Number(category.amount || category.total_amount || 0),
        color: category.color || '#888888',
        is_recurring: category.is_recurring || false
      }))

    // Ensure we have valid net worth history data or use an empty array
    const netWorthHistory = Array.isArray(netWorthData?.history) ? netWorthData.history : [];
    
    // Create sample data if history is empty
    const netWorthTimelineData = netWorthHistory.length > 0 
      ? netWorthHistory.map(item => ({
          date: new Date(item.date || Date.now()).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          assets: typeof item.assets === 'number' ? item.assets : 0,
          liabilities: typeof item.liabilities === 'number' ? item.liabilities : 0,
          netWorth: typeof item.netWorth === 'number' ? item.netWorth : 0
        }))
      : null; // If no history data, pass null to use the component's sample data

    return (
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-7xl">
        {/* Dashboard Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card rounded-lg p-6 shadow-sm border">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Your financial overview and insights</p>
          </div>

        </div>

        {/* Financial Overview Cards */}
        <div className="grid gap-6">
          <DashboardCards 
            accountSummary={accountSummary}
            cashflowSummary={{
              ...cashflowForecast,
              monthOverMonth: cashflowForecast.monthOverMonth || { income: 0, expenses: 0 }
            }}
          />
        </div>

        {/* Main Dashboard Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            <TabsTrigger value="investments" className="hidden lg:block">Investments</TabsTrigger>
            <TabsTrigger value="assistant" className="hidden lg:block">Assistant</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Top Row - Financial Insights and Calendar */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <FinancialInsights 
                cashflowSummary={{
                  projectedIncome: cashflowForecast.projectedIncome,
                  projectedExpenses: cashflowForecast.projectedExpenses,
                  netCashflow: cashflowForecast.netCashflow,
                  savingsRate: cashflowForecast.savingsRate
                }}
                transactionStats={{
                  totalIncome: transactionStats.totalIncome,
                  totalExpenses: transactionStats.totalExpenses,
                  netIncome: transactionStats.netIncome
                }}
              />
              <FinancialCalendar initialData={financialCalendarData} />
            </div>
            
            {/* Middle Row - Financial Summary and Health Score */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              <FinancialSummary 
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                netIncome={totalIncome - totalExpenses}
                categorySpending={formattedCategorySpending}
                accountSummary={accountSummary}
                monthlyData={incomeExpenseData}
                transactionStats={transactionStats}
              />
              <div className="h-full">
                <FinancialHealthScore 
                  score={0}
                  factors={[]}
                />
              </div>
            </div>
            
            {/* Income vs Expense Chart */}
            <IncomeExpenseChart 
              data={incomeExpenseData} 
              totalIncome={totalIncome} 
              totalExpenses={totalExpenses}
              recurringIncome={recurringIncome}
              recurringExpenses={recurringExpenses}
              projectMonths={6} // Project 6 months into the future
            />
          </TabsContent>
          
          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {/* Visualizations */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <SankeyDiagram />
              <NetWorthTimeline data={netWorthTimelineData} />
            </div>
            
            {/* Cash Flow Forecast */}
            <CashFlowForecast data={cashflowForecast.monthlyTrend} />
          </TabsContent>
          
          {/* Planning Tab */}
          <TabsContent value="planning" className="space-y-6">
            {/* Projected Finances Widget */}
            <ProjectedFinancesWidget projectedFinances={projectedFinances} />
          </TabsContent>
          
          {/* Investments Tab */}
          <TabsContent value="investments" className="space-y-6">
            {/* Investment Portfolio Analytics */}
            <InvestmentList />
          </TabsContent>
          
          {/* Assistant Tab */}
          <TabsContent value="assistant" className="space-y-6">
            {/* Financial Assistant */}
            <FinancialAssistant />
          </TabsContent>
        </Tabs>
        
        {/* Mobile Tab Buttons (visible only on small screens) */}
        <MobileTabButtons 
          tabIds={['investments', 'assistant']} 
          tabLabels={['Investments', 'Assistant']} 
        />
      </div>
    )
  } catch (error) {
    console.error("Dashboard error:", error)
    return (
      <DashboardShell>
        <DashboardHeader heading="Dashboard" text="Your financial overview" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Error loading dashboard</h2>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </div>
        </div>
      </DashboardShell>
    )
  }
}
