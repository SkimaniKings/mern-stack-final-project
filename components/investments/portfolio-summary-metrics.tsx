"use client"

import { formatCurrency, formatPercent } from "@/lib/investments/calculations"

interface PortfolioSummaryMetricsProps {
  performanceMetrics: {
    totalValue: number
    totalCost: number
    totalGain: number
    totalGainPercent: number
    weightedExpenseRatio: number
    weightedDividendYield: number
  }
  taxEfficiency: {
    taxableValue: number
    taxDeferredValue: number
    taxFreeValue: number
    taxEfficiencyScore: number
    recommendations: string[]
  }
}

export function PortfolioSummaryMetrics({ performanceMetrics, taxEfficiency }: PortfolioSummaryMetricsProps) {
  // Ensure taxEfficiency has the expected structure
  const safeTaxEfficiency = {
    taxableValue: taxEfficiency?.taxableValue || 0,
    taxDeferredValue: taxEfficiency?.taxDeferredValue || 0,
    taxFreeValue: taxEfficiency?.taxFreeValue || 0,
    taxEfficiencyScore: taxEfficiency?.taxEfficiencyScore || 0,
    recommendations: taxEfficiency?.recommendations || []
  }

  // Ensure performanceMetrics has the expected structure
  const safePerformanceMetrics = {
    totalValue: performanceMetrics?.totalValue || 0,
    totalCost: performanceMetrics?.totalCost || 0,
    totalGain: performanceMetrics?.totalGain || 0,
    totalGainPercent: performanceMetrics?.totalGainPercent || 0,
    weightedExpenseRatio: performanceMetrics?.weightedExpenseRatio || 0,
    weightedDividendYield: performanceMetrics?.weightedDividendYield || 0
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div>
          <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
          <p className="text-2xl font-bold">{formatCurrency(safePerformanceMetrics.totalValue)}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Total Gain/Loss</p>
          <p className={`text-lg font-medium ${safePerformanceMetrics.totalGain >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(safePerformanceMetrics.totalGain)} ({safePerformanceMetrics.totalGainPercent.toFixed(1)}%)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Expense Ratio</p>
          <p className="font-medium">{formatPercent(safePerformanceMetrics.weightedExpenseRatio)}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Dividend Yield</p>
          <p className="font-medium">{formatPercent(safePerformanceMetrics.weightedDividendYield)}</p>
        </div>
      </div>

      <div className="pt-2 border-t">
        <p className="text-sm text-muted-foreground mb-2">Account Distribution</p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Taxable</p>
            <p className="font-medium">{formatCurrency(safeTaxEfficiency.taxableValue)}</p>
            <p className="text-xs text-muted-foreground">
              {((safeTaxEfficiency.taxableValue / safePerformanceMetrics.totalValue) * 100).toFixed(1)}%
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Tax-Deferred</p>
            <p className="font-medium">{formatCurrency(safeTaxEfficiency.taxDeferredValue)}</p>
            <p className="text-xs text-muted-foreground">
              {((safeTaxEfficiency.taxDeferredValue / safePerformanceMetrics.totalValue) * 100).toFixed(1)}%
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Tax-Free</p>
            <p className="font-medium">{formatCurrency(safeTaxEfficiency.taxFreeValue)}</p>
            <p className="text-xs text-muted-foreground">
              {((safeTaxEfficiency.taxFreeValue / safePerformanceMetrics.totalValue) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t">
        <p className="text-sm text-muted-foreground mb-2">Tax Efficiency Score</p>
        <div className="flex items-center">
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${safeTaxEfficiency.taxEfficiencyScore}%` }}></div>
          </div>
          <span className="ml-2 font-medium">{safeTaxEfficiency.taxEfficiencyScore.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

