"use client"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/investments/calculations"
import type { Investment } from "@/lib/investments/calculations"

interface AlternativeAllocationChartProps {
  investments: Investment[]
}

export function AlternativeAllocationChart({ investments }: AlternativeAllocationChartProps) {
  // Group investments by type
  const investmentsByType = investments.reduce(
    (groups, investment) => {
      const type = investment.type
      if (!groups[type]) {
        groups[type] = {
          name: formatInvestmentType(type),
          value: 0,
        }
      }
      groups[type].value += investment.value
      return groups
    },
    {} as Record<string, { name: string; value: number }>,
  )

  // Convert to array for chart
  const data = Object.values(investmentsByType)

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

  // Format investment type for display
  function formatInvestmentType(type: string): string {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

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

