"use client"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/investments/calculations"

interface FeeImpactChartProps {
  currentExpenseRatio: number
  reducedExpenseRatio: number
  initialInvestment: number
}

export function FeeImpactChart({ currentExpenseRatio, reducedExpenseRatio, initialInvestment }: FeeImpactChartProps) {
  // Generate data for chart
  const data = []
  const years = 30
  const growthRate = 7 // 7% annual growth

  let valueWithCurrentFees = initialInvestment
  let valueWithReducedFees = initialInvestment
  let valueWithNoFees = initialInvestment

  for (let year = 0; year <= years; year++) {
    if (year > 0) {
      // Apply growth
      valueWithCurrentFees *= 1 + growthRate / 100
      valueWithReducedFees *= 1 + growthRate / 100
      valueWithNoFees *= 1 + growthRate / 100

      // Apply fees
      valueWithCurrentFees *= 1 - currentExpenseRatio / 100
      valueWithReducedFees *= 1 - reducedExpenseRatio / 100
    }

    data.push({
      year,
      withCurrentFees: valueWithCurrentFees,
      withReducedFees: valueWithReducedFees,
      withNoFees: valueWithNoFees,
      currentFeeImpact: valueWithNoFees - valueWithCurrentFees,
      reducedFeeImpact: valueWithNoFees - valueWithReducedFees,
    })
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" label={{ value: "Years", position: "insideBottomRight", offset: -10 }} />
        <YAxis
          tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
          label={{ value: "Portfolio Value", angle: -90, position: "insideLeft" }}
        />
        <Tooltip formatter={(value) => formatCurrency(value as number)} />
        <Legend />
        <Line
          type="monotone"
          dataKey="withCurrentFees"
          name={`With Current Fees (${currentExpenseRatio.toFixed(2)}%)`}
          stroke="#ff8042"
          activeDot={{ r: 8 }}
        />
        <Line
          type="monotone"
          dataKey="withReducedFees"
          name={`With Reduced Fees (${reducedExpenseRatio.toFixed(2)}%)`}
          stroke="#0088fe"
        />
        <Line type="monotone" dataKey="withNoFees" name="With No Fees (0.00%)" stroke="#00c49f" />
      </LineChart>
    </ResponsiveContainer>
  )
}

