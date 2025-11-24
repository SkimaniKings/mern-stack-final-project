"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface Debt {
  id: string
  name: string
  balance: number
  interestRate: number
  minimumPayment: number
  actualPayment: number
}

interface DebtPayoffChartProps {
  debts: Debt[]
  strategy: "avalanche" | "snowball"
  extraPayment: number
}

export function DebtPayoffChart({ debts, strategy, extraPayment }: DebtPayoffChartProps) {
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    // Generate chart data based on debts, strategy, and extra payment
    const data = generatePayoffData(debts, strategy, extraPayment)
    setChartData(data)
  }, [debts, strategy, extraPayment])

  const generatePayoffData = (debts: Debt[], strategy: string, extraPayment: number) => {
    // Deep copy of debts to avoid modifying original
    const remainingDebts = debts.map((debt) => ({
      ...debt,
      remainingBalance: debt.balance,
      paid: false,
    }))

    const chartData = []
    let month = 0
    const totalStartingBalance = remainingDebts.reduce((sum, debt) => sum + debt.balance, 0)
    let currentTotalBalance = totalStartingBalance

    // Add starting point
    chartData.push({
      month: month,
      totalBalance: currentTotalBalance,
      ...remainingDebts.reduce(
        (acc, debt) => {
          acc[debt.name] = debt.remainingBalance
          return acc
        },
        {} as Record<string, number>,
      ),
    })

    // Continue until all debts are paid off or max 10 years (120 months)
    while (currentTotalBalance > 0 && month < 120) {
      month++

      // Sort debts according to strategy (if not already paid off)
      const activeDebts = remainingDebts.filter((debt) => !debt.paid)
      if (strategy === "avalanche") {
        // Highest interest rate first
        activeDebts.sort((a, b) => b.interestRate - a.interestRate)
      } else {
        // Lowest balance first
        activeDebts.sort((a, b) => a.remainingBalance - b.remainingBalance)
      }

      let availableExtra = extraPayment

      // Apply payments to each debt
      for (const debt of remainingDebts) {
        if (debt.paid) continue

        // Calculate interest for this month
        const monthlyInterest = debt.remainingBalance * (debt.interestRate / 100 / 12)

        // Determine payment amount
        let payment = debt.minimumPayment

        // Add extra payment to highest priority debt
        if (debt === activeDebts[0] && availableExtra > 0) {
          payment += availableExtra
        }

        // Apply payment to balance
        debt.remainingBalance = Math.max(0, debt.remainingBalance + monthlyInterest - payment)

        // If debt is paid off
        if (debt.remainingBalance === 0) {
          debt.paid = true

          // Add any overpayment to available extra for next debt
          if (debt === activeDebts[0]) {
            const overpayment = payment - (debt.remainingBalance + monthlyInterest)
            availableExtra = overpayment > 0 ? overpayment : 0
          }
        }
      }

      // Calculate new total balance
      currentTotalBalance = remainingDebts.reduce((sum, debt) => sum + debt.remainingBalance, 0)

      // Add data point for this month
      chartData.push({
        month: month,
        totalBalance: currentTotalBalance,
        ...remainingDebts.reduce(
          (acc, debt) => {
            acc[debt.name] = debt.remainingBalance
            return acc
          },
          {} as Record<string, number>,
        ),
      })

      // Add quarterly data points only after first year to reduce chart density
      if (month > 12 && month % 3 !== 0) {
        chartData.pop()
      }
    }

    return chartData
  }

  // Generate colors for each debt
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"]

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            label={{ value: "Months", position: "insideBottomRight", offset: -10 }}
            tickFormatter={(value) => {
              if (value === 0) return "0"
              if (value % 12 === 0) return `${value / 12}y`
              return ""
            }}
          />
          <YAxis
            tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
            label={{ value: "Balance ($)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            formatter={(value) => formatCurrency(value as number)}
            labelFormatter={(value) => `Month ${value}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="totalBalance"
            name="Total Balance"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
          />
          {debts.map((debt, index) => (
            <Line
              key={debt.id}
              type="monotone"
              dataKey={debt.name}
              name={debt.name}
              stroke={COLORS[index % COLORS.length]}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

