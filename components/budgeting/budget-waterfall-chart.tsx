"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"

interface WaterfallChartProps {
  data: {
    name: string
    value: number
    isTotal?: boolean
    isIncome?: boolean
  }[]
}

export function BudgetWaterfallChart({ data }: WaterfallChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Calculate cumulative values for waterfall effect
  const processedData = data.map((item, index) => {
    if (index === 0 || item.isTotal) {
      return { ...item, start: 0, end: item.value }
    }

    const prevEnd = processedData[index - 1].end
    return {
      ...item,
      start: prevEnd,
      end: prevEnd + item.value,
    }
  })

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{formatCurrency(Math.abs(data.value))}</p>
          {!data.isTotal && !data.isIncome && (
            <p className="text-xs text-muted-foreground">{data.value < 0 ? "Expense" : "Income"}</p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={processedData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => `$${Math.abs(value / 1000)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <ReferenceLine y={0} stroke="#000" />
        <Bar
          dataKey="value"
          fill={(entry) => {
            if (entry.isTotal) return "#8884d8"
            if (entry.isIncome) return "#4caf50"
            return entry.value >= 0 ? "#2196f3" : "#f44336"
          }}
          stackId="stack"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

