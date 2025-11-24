"use client"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/investments/calculations"
import type { AssetClass } from "@/lib/investments/calculations"

interface PortfolioAllocationChartProps {
  assetClasses: AssetClass[]
}

export function PortfolioAllocationChart({ assetClasses }: PortfolioAllocationChartProps) {
  // Prepare data for pie chart
  const data = assetClasses.map((assetClass) => ({
    name: assetClass.name,
    value: assetClass.investments.reduce((sum, inv) => sum + inv.value, 0),
  }))

  // Colors for the chart
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#A4DE6C",
    "#D0ED57",
    "#FAD000",
    "#F28E2C",
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
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(value as number)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

