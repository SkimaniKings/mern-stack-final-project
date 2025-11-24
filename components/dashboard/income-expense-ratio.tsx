"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/formatting"
import { Progress } from "@/components/ui/progress"

interface IncomeExpenseRatioProps {
  income: number
  expenses: number
}

export function IncomeExpenseRatio({ income, expenses }: IncomeExpenseRatioProps) {
  const expenseRatio = income > 0 ? (expenses / income) * 100 : 0
  const savingsRatio = income > 0 ? ((income - expenses) / income) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Income</h3>
          <span className="text-sm font-medium text-green-600">{formatCurrency(income)}</span>
        </div>
        <Progress value={100} className="h-2 bg-green-100" indicatorClassName="bg-green-600" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Expenses</h3>
          <span className="text-sm font-medium text-red-600">{formatCurrency(expenses)}</span>
        </div>
        <Progress value={expenseRatio} className="h-2 bg-red-100" indicatorClassName="bg-red-600" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Savings</h3>
            <span className="text-sm font-medium">{formatCurrency(income - expenses)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Savings Rate</span>
            <span>{Math.round(savingsRatio)}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

