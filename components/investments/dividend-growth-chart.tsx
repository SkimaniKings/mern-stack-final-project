"use client"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, ComposedChart } from "recharts"
import { formatCurrency } from "@/lib/investments/calculations"

interface DividendGrowthChartProps {
  projection: {
    year: number
    portfolioValue: number
    dividendIncome: number
    cumulativeDividends: number
  }[]
}

export function DividendGrowthChart({ projection }: DividendGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={projection}
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
          yAxisId="left"
          tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
          label={{ value: "Portfolio Value", angle: -90, position: "insideLeft" }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
          label={{ value: "Dividend Income", angle: 90, position: "insideRight" }}
        />
        <Tooltip formatter={(value) => formatCurrency(value as number)} />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="portfolioValue"
          name="Portfolio Value"
          stroke="#0088fe"
          strokeWidth={2}
        />
        <Bar yAxisId="right" dataKey="dividendIncome" name="Annual Dividend Income" fill="#00c49f" />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cumulativeDividends"
          name="Cumulative Dividends"
          stroke="#ff8042"
          strokeDasharray="5 5"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

