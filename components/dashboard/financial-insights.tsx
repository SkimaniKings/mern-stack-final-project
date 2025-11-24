"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  LineChart, 
  Lightbulb,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface FinancialInsight {
  id: string
  type: 'positive' | 'negative' | 'neutral' | 'warning'
  title: string
  description: string
  actionText?: string
  actionHref?: string
  metric?: {
    label: string
    value: string | number
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string | number
  }
}

interface FinancialInsightsProps {
  cashflowSummary: {
    projectedIncome: number
    projectedExpenses: number
    netCashflow: number
    savingsRate: number
  }
  transactionStats: {
    totalIncome: number
    totalExpenses: number
    netIncome: number
  }
}

export function FinancialInsights({ cashflowSummary, transactionStats }: FinancialInsightsProps) {
  // Generate insights based on financial data
  const insights: FinancialInsight[] = []
  
  // Savings rate insight
  if (cashflowSummary.savingsRate < 10) {
    insights.push({
      id: 'low-savings-rate',
      type: 'warning',
      title: 'Low Savings Rate',
      description: 'Your current savings rate is below the recommended 15-20%. Consider reducing non-essential expenses.',
      actionText: 'View Budget',
      actionHref: '/budgets',
      metric: {
        label: 'Savings Rate',
        value: `${Math.round(cashflowSummary.savingsRate)}%`,
        trend: 'down',
        trendValue: '15%'
      }
    })
  } else if (cashflowSummary.savingsRate >= 20) {
    insights.push({
      id: 'good-savings-rate',
      type: 'positive',
      title: 'Healthy Savings Rate',
      description: 'Great job! Your savings rate is above the recommended threshold. Consider investing the surplus.',
      actionText: 'Explore Investments',
      actionHref: '/investments',
      metric: {
        label: 'Savings Rate',
        value: `${Math.round(cashflowSummary.savingsRate)}%`,
        trend: 'up',
        trendValue: '20%'
      }
    })
  }
  
  // Income vs Expenses insight
  if (transactionStats.netIncome < 0) {
    insights.push({
      id: 'negative-cashflow',
      type: 'negative',
      title: 'Negative Cash Flow',
      description: 'Your expenses are exceeding your income. Review your spending to identify areas to cut back.',
      actionText: 'Analyze Expenses',
      actionHref: '/expenses',
      metric: {
        label: 'Net Income',
        value: formatCurrency(transactionStats.netIncome),
        trend: 'down'
      }
    })
  } else if (transactionStats.netIncome > 0 && transactionStats.netIncome < transactionStats.totalIncome * 0.1) {
    insights.push({
      id: 'low-positive-cashflow',
      type: 'neutral',
      title: 'Thin Margin',
      description: 'Your income barely exceeds expenses. Building an emergency fund should be a priority.',
      actionText: 'Emergency Fund Tips',
      actionHref: '/planning/emergency-fund',
      metric: {
        label: 'Income Buffer',
        value: `${Math.round((transactionStats.netIncome / transactionStats.totalIncome) * 100)}%`,
        trend: 'neutral',
        trendValue: '10%'
      }
    })
  }
  
  // Budget utilization insight
  const budgetUtilization = cashflowSummary.projectedExpenses > 0 
    ? Math.min(100, Math.round((cashflowSummary.projectedExpenses / cashflowSummary.projectedIncome) * 100)) 
    : 0;
    
  if (budgetUtilization > 90) {
    insights.push({
      id: 'budget-limit',
      type: 'warning',
      title: 'Approaching Budget Limit',
      description: 'You\'re using over 90% of your budget. Consider reviewing your spending to avoid going over budget.',
      actionText: 'Review Budget',
      actionHref: '/budgets',
      metric: {
        label: 'Budget Used',
        value: `${budgetUtilization}%`,
        trend: 'up',
        trendValue: '90%'
      }
    })
  }
  
  // If no insights, add a default one
  if (insights.length === 0) {
    insights.push({
      id: 'financial-health',
      type: 'positive',
      title: 'Financial Health Check',
      description: 'Your finances look healthy. Continue monitoring your spending and saving habits.',
      actionText: 'View Financial Health',
      actionHref: '/planning',
      metric: {
        label: 'Overall Health',
        value: 'Good',
        trend: 'up'
      }
    })
  }

  return (
    <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/30 dark:to-transparent border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center">
              <Lightbulb className="h-5 w-5 text-amber-500 mr-2" />
              Financial Insights
            </CardTitle>
            <CardDescription>Personalized recommendations based on your financial data</CardDescription>
          </div>
          <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
            <Lightbulb className="h-5 w-5 text-amber-500" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-5">
          {insights.map((insight) => (
            <div 
              key={insight.id} 
              className={`rounded-lg border p-5 shadow-sm transition-all duration-300 hover:shadow-md ${
                insight.type === 'positive' ? 'bg-gradient-to-r from-green-50 to-green-50/50 border-green-200 dark:from-green-950/50 dark:to-green-950/20 dark:border-green-800' :
                insight.type === 'negative' ? 'bg-gradient-to-r from-red-50 to-red-50/50 border-red-200 dark:from-red-950/50 dark:to-red-950/20 dark:border-red-800' :
                insight.type === 'warning' ? 'bg-gradient-to-r from-amber-50 to-amber-50/50 border-amber-200 dark:from-amber-950/50 dark:to-amber-950/20 dark:border-amber-800' :
                'bg-gradient-to-r from-blue-50 to-blue-50/50 border-blue-200 dark:from-blue-950/50 dark:to-blue-950/20 dark:border-blue-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className={`p-2.5 rounded-full flex-shrink-0 ${
                    insight.type === 'positive' ? 'bg-green-100 dark:bg-green-900/30' :
                    insight.type === 'negative' ? 'bg-red-100 dark:bg-red-900/30' :
                    insight.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                    'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {insight.type === 'positive' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    {insight.type === 'negative' && <AlertCircle className="h-5 w-5 text-red-600" />}
                    {insight.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-600" />}
                    {insight.type === 'neutral' && <LineChart className="h-5 w-5 text-blue-600" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h4 className="font-medium text-base">{insight.title}</h4>
                      <Badge variant={
                        insight.type === 'positive' ? 'success' :
                        insight.type === 'negative' ? 'destructive' :
                        insight.type === 'warning' ? 'secondary' :
                        'secondary'
                      } className="ml-0">
                        {insight.type === 'positive' ? 'Good' :
                         insight.type === 'negative' ? 'Action Needed' :
                         insight.type === 'warning' ? 'Warning' :
                         'Info'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
                
                {insight.metric && (
                  <div className="text-right bg-muted/30 p-3 rounded-lg flex-shrink-0 min-w-[120px]">
                    <div className="text-sm text-muted-foreground font-medium">{insight.metric.label}</div>
                    <div className="text-lg font-semibold mt-1">
                      {insight.metric.value}
                    </div>
                    {insight.metric.trend && (
                      <div className="flex items-center justify-end text-xs mt-1 bg-background/50 rounded-full px-2 py-1">
                        {insight.metric.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600 mr-1" />}
                        {insight.metric.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600 mr-1" />}
                        {insight.metric.trendValue && (
                          <span className={
                            insight.metric.trend === 'up' ? 'text-green-600' :
                            insight.metric.trend === 'down' ? 'text-red-600' :
                            'text-muted-foreground'
                          }>
                            {insight.metric.trend === 'up' ? 'Target: ' : 
                             insight.metric.trend === 'down' ? 'Target: ' : 
                             'Neutral: '}{insight.metric.trendValue}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {insight.actionText && insight.actionHref && (
                <div className="mt-4 pt-3 border-t border-dashed">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                    <a href={insight.actionHref} className="flex items-center justify-center">
                      {insight.actionText} <ArrowRight className="h-3 w-3 ml-1.5" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
