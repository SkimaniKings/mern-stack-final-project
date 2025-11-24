"use client"

import type { PortfolioESGScore } from "@/lib/investments/types"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface ESGScoreChartProps {
  esgScore: PortfolioESGScore
}

export function ESGScoreChart({ esgScore }: ESGScoreChartProps) {
  const data = [
    {
      name: "Environmental",
      score: esgScore.environmentalScore,
      fill: "#10b981", // green-500
    },
    {
      name: "Social",
      score: esgScore.socialScore,
      fill: "#3b82f6", // blue-500
    },
    {
      name: "Governance",
      score: esgScore.governanceScore,
      fill: "#8b5cf6", // purple-500
    },
    {
      name: "Total",
      score: esgScore.totalESGScore,
      fill: "#6366f1", // indigo-500
    },
  ]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" />
        <YAxis domain={[0, 10]} />
        <Tooltip
          formatter={(value: number) => [value.toFixed(1), "Score"]}
          labelStyle={{ color: "#111" }}
          contentStyle={{ backgroundColor: "#fff", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}
        />
        <Legend />
        <Bar dataKey="score" name="ESG Score" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

