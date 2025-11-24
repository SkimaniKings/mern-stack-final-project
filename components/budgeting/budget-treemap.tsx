"use client"

import { useState } from "react"
import { Treemap, ResponsiveContainer, Tooltip } from "recharts"

interface TreemapData {
  name: string
  size: number
  children?: TreemapData[]
  color?: string
}

interface BudgetTreemapProps {
  data: TreemapData
}

export function BudgetTreemap({ data }: BudgetTreemapProps) {
  const [activeNode, setActiveNode] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{formatCurrency(data.value)}</p>
          {data.percentage && <p className="text-xs text-muted-foreground">{data.percentage}% of budget</p>}
        </div>
      )
    }
    return null
  }

  // Custom content for treemap cells
  const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, name, value } = props

    // Don't render if the cell is too small
    if (width < 30 || height < 30) return null

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: props.color,
            stroke: "#fff",
            strokeWidth: 2,
            strokeOpacity: 1,
            opacity: activeNode === name ? 0.8 : 1,
          }}
          onMouseEnter={() => setActiveNode(name)}
          onMouseLeave={() => setActiveNode(null)}
        />
        {width > 50 && height > 50 ? (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: 12,
              fontWeight: 500,
              fill: "#fff",
              pointerEvents: "none",
            }}
          >
            {name}
          </text>
        ) : null}
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={[data]}
        dataKey="size"
        aspectRatio={4 / 3}
        stroke="#fff"
        fill="#8884d8"
        content={<CustomizedContent />}
      >
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  )
}

