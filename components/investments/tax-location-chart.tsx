"use client"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/investments/calculations"

interface TaxLocationChartProps {
  taxEfficiency: {
    taxableValue: number
    taxDeferredValue: number
    taxFreeValue: number
    taxEfficiencyScore: number
    recommendations: string[]
  }
}

export function TaxLocationChart({ taxEfficiency }: TaxLocationChartProps) {
  // Prepare data for pie chart
  const data = [
    { name: "Taxable", value: taxEfficiency.taxableValue, color: "#ff8042" },
    { name: "Tax-Deferred", value: taxEfficiency.taxDeferredValue, color: "#0088fe" },
    { name: "Tax-Free", value: taxEfficiency.taxFreeValue, color: "#00c49f" },
  ]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={120}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(value as number)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

