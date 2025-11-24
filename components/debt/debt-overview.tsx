"use client"

import { useState, useEffect } from "react"
import { useDebtContext } from "@/lib/debt/debt-context";
import { Debt } from "@/types/debt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { AlertCircle, TrendingDown } from "lucide-react"

interface DebtSummary {
  totalDebt: number
  debtByType: {
    name: string
    value: number
    color: string
  }[]
  interestPaid: number
  debtToIncomeRatio: number
  monthlyPayments: number
}

export function DebtOverview() {
  const { debts, loading, error } = useDebtContext()
  const [summary, setSummary] = useState<DebtSummary>({
    totalDebt: 0,
    debtByType: [],
    interestPaid: 0,
    debtToIncomeRatio: 0,
    monthlyPayments: 0,
  })

  useEffect(() => {
    if (debts.length > 0) {
      const totalDebt = debts.reduce((acc: number, debt: Debt) => acc + (debt.current_balance || 0), 0);
      const monthlyPayments = debts.reduce((acc: number, debt: Debt) => acc + (debt.minimum_payment || 0), 0);

      const debtByType = debts.reduce((acc: { name: string; value: number; color: string }[], debt: Debt) => {
        const debtType = debt.type || "Other";
        const existingType = acc.find((d: { name: string }) => d.name === debtType);
        if (existingType) {
          existingType.value += debt.current_balance || 0
        } else {
          acc.push({ 
            name: debtType, 
            value: debt.current_balance || 0, 
            color: getRandomColor(debtType) 
          })
        }
        return acc
      }, [] as { name: string; value: number; color: string }[])

      setSummary({
        totalDebt,
        debtByType,
        monthlyPayments,
        // These are placeholders, as the data isn't available in the context
        interestPaid: 0,
        debtToIncomeRatio: 0,
      })
    }
  }, [debts])

  const colorMapping: { [key: string]: string } = {
    'credit-card': '#FF8042',
    'student-loan': '#00C49F',
    'auto-loan': '#0088FE',
    'mortgage': '#FFBB28',
    'personal-loan': '#8884d8',
    'medical': '#82ca9d',
    'other': '#d3d3d3',
  }

  const getRandomColor = (type: string) => {
    return colorMapping[type.toLowerCase().replace(' ', '-')] || colorMapping['other']
  }

  if (loading) {
    return <Skeleton className="h-[200px] w-full" />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-destructive mr-2" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Total Debt</CardTitle>
          <CardDescription>All outstanding balances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalDebt)}</div>
          <p className="text-xs text-muted-foreground mt-1">{summary.debtByType.length} active debts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Monthly Payments</CardTitle>
          <CardDescription>Total monthly obligations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.monthlyPayments)}</div>
          <p className="text-xs text-muted-foreground mt-1">Due each month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Interest Paid YTD</CardTitle>
          <CardDescription>Year-to-date interest</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.interestPaid)}</div>
          <p className="text-xs text-muted-foreground mt-1">Money paid to lenders</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Debt-to-Income</CardTitle>
          <CardDescription>Debt as % of income</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(summary.debtToIncomeRatio * 100).toFixed(1)}%</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
            <span>Decreased 2.5% from last month</span>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Debt Breakdown</CardTitle>
          <CardDescription>Distribution by debt type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.debtByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {summary.debtByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

