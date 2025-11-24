"use client"

import { useState } from "react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { Badge } from "@/components/ui/badge"

interface AssetAllocationChartProps {
  data: any[]
  valueKey?: string
  nameKey?: string
  type?: "pie" | "bar"
  compareKeys?: string[]
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A28DFF",
  "#FF6B6B",
  "#4ECDC4",
  "#FF9F1C",
  "#6A0572",
  "#AB83A1",
]

export function AssetAllocationChart({
  data,
  valueKey = "value",
  nameKey = "name",
  type = "pie",
  compareKeys,
}: AssetAllocationChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const handleMouseEnter = (_, index) => {
    setActiveIndex(index)
  }

  const handleMouseLeave = () => {
    setActiveIndex(null)
  }

  const formatData = () => {
    if (type === "pie") {
      return data.map((item) => ({
        name: item[nameKey],
        value: item[valueKey],
        percentage: item.percentage || (item[valueKey] / data.reduce((sum, d) => sum + d[valueKey], 0)) * 100,
      }))
    } else {
      return data
    }
  }

  const chartData = formatData()

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              stroke={activeIndex === index ? "#fff" : "none"}
              strokeWidth={activeIndex === index ? 2 : 0}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name, props) => [`$${value.toFixed(2)} (${props.payload.percentage.toFixed(2)}%)`, name]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={nameKey} />
        <YAxis />
        <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
        <Legend />
        {compareKeys?.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={COLORS[index % COLORS.length]}
            name={key.charAt(0).toUpperCase() + key.slice(1)}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <div>
      {type === "pie" ? renderPieChart() : renderBarChart()}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {chartData.map((item, index) => (
          <div
            key={index}
            className={`flex justify-between items-center p-2 rounded-md ${activeIndex === index ? "bg-gray-100" : ""}`}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="text-sm font-medium truncate max-w-[120px]">{item[nameKey]}</span>
            </div>
            <Badge variant="outline">
              {type === "pie"
                ? `${item.percentage.toFixed(2)}%`
                : compareKeys
                  ? `${(item[compareKeys[0]] - item[compareKeys[1]]).toFixed(2)}%`
                  : ""}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

