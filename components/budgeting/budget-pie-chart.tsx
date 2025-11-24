"use client"

import { useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from "recharts"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface BudgetPieChartProps {
  categories: {
    name: string
    amount: number
    percentage: number
  }[]
  showLegend?: boolean
  interactive?: boolean
  height?: string | number
  showTooltip?: boolean
}

export function BudgetPieChart({ 
  categories, 
  showLegend = true, 
  interactive = true,
  height = "100%",
  showTooltip = true
}: BudgetPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  
  // Sort categories by amount (descending) for better visualization
  const sortedCategories = [...categories].sort((a, b) => b.amount - a.amount)
  
  // Colors for the chart - using a more visually appealing color palette
  const COLORS = [
    "#0088FE", // Blue
    "#00C49F", // Green
    "#FFBB28", // Yellow
    "#FF8042", // Orange
    "#8884D8", // Purple
    "#82CA9D", // Light Green
    "#A4DE6C", // Lime
    "#D0ED57", // Light Yellow
    "#FAD000", // Gold
    "#F28E2C", // Dark Orange
    "#E57373", // Red
    "#9575CD", // Lavender
    "#4FC3F7", // Light Blue
    "#81C784", // Medium Green
    "#FFD54F"  // Amber
  ]
  
  // Get color for a specific category
  const getCategoryColor = (index: number) => COLORS[index % COLORS.length]

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }
  
  // Handle pie sector hover
  const onPieEnter = (_: any, index: number) => {
    if (interactive) {
      setActiveIndex(index)
    }
  }
  
  // Handle mouse leave
  const onPieLeave = () => {
    if (interactive) {
      setActiveIndex(undefined)
    }
  }
  
  // Render active shape with additional details when hovered
  const renderActiveShape = (props: any) => {
    const { 
      cx, cy, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value
    } = props
    
    return (
      <g>
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#333" className="text-xs font-medium">
          {payload.name}
        </text>
        <text x={cx} y={cy} textAnchor="middle" fill="#333" className="text-base font-bold">
          {formatCurrency(value)}
        </text>
        <text x={cx} y={cy} dy={20} textAnchor="middle" fill="#999" className="text-xs">
          {`${(percent * 100).toFixed(1)}%`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.8}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 5}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    )
  }

  // Check if we have any data
  if (!sortedCategories.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">No budget categories to display</p>
      </div>
    )
  }
  
  // Calculate total budget amount
  const totalAmount = sortedCategories.reduce((sum, category) => sum + category.amount, 0)
  
  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={interactive ? renderActiveShape : undefined}
            data={sortedCategories}
            cx="50%"
            cy="50%"
            innerRadius={interactive ? 70 : 60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="amount"
            nameKey="name"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            animationBegin={0}
            animationDuration={800}
            label={interactive ? false : ({ name, percentage }) => `${name}: ${percentage}%`}
          >
            {sortedCategories.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getCategoryColor(index)} 
                stroke="#fff"
                strokeWidth={1}
              />
            ))}
          </Pie>
          {showTooltip && <Tooltip 
            formatter={(value) => formatCurrency(value as number)} 
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px' }}
          />}
          {showLegend && <Legend 
            layout="vertical" 
            verticalAlign="middle" 
            align="right" 
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value, entry, index) => (
              <span className="flex items-center">
                <span>{value}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {sortedCategories[index!].percentage}%
                </Badge>
              </span>
            )}
          />}
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center text showing total */}
      {!interactive && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
        </div>
      )}
    </div>
  )
}

