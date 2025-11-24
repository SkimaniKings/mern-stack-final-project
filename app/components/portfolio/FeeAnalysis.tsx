'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface FeeAnalysisProps {
  feeImpact: {
    assetName: string
    ticker: string | null
    feeType: string
    feePercent: number
    annualFeeAmount: number
    suggestedAlternative: string | null
  }[]
  feesByType: Record<string, number>
  totalAnnualFees: number
  potentialSavings: number
}

export function FeeAnalysis({ feeImpact, feesByType, totalAnnualFees, potentialSavings }: FeeAnalysisProps) {
  // Handle empty data
  if (!feeImpact || feeImpact.length === 0 || !feesByType || Object.keys(feesByType).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Fee Analysis</CardTitle>
          <CardDescription>
            Understand how fees impact your investment returns
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-muted-foreground mb-2">No fee data available.</p>
          <p className="text-sm text-muted-foreground">Add investments to your portfolio to analyze fee impact.</p>
        </CardContent>
      </Card>
    )
  }
  // Format fee type labels
  const formatFeeType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Prepare data for pie chart
  const pieData = Object.entries(feesByType).map(([type, amount]) => ({
    name: formatFeeType(type),
    value: amount
  }))

  // Colors for different fee types
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investment Fee Analysis</CardTitle>
        <CardDescription>
          Understand how fees impact your investment returns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Annual Fees</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalAnnualFees)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Potential Savings</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(potentialSavings)}</p>
                </div>
              </div>

              <Alert variant="default" className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertTitle>Fee Impact</AlertTitle>
                <AlertDescription>
                  Over 30 years, you could lose approximately {formatCurrency(totalAnnualFees * 30)} to fees, 
                  assuming your portfolio size remains constant. With compound growth, the actual impact could be much higher.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Fee Breakdown by Investment</h3>
            <div className="max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investment</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Fee %</TableHead>
                    <TableHead>Annual Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeImpact
                    .sort((a, b) => b.annualFeeAmount - a.annualFeeAmount)
                    .map((fee, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {fee.assetName}
                          {fee.ticker && <span className="text-muted-foreground ml-1">({fee.ticker})</span>}
                        </TableCell>
                        <TableCell>{formatFeeType(fee.feeType)}</TableCell>
                        <TableCell>{fee.feePercent.toFixed(2)}%</TableCell>
                        <TableCell>{formatCurrency(fee.annualFeeAmount)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
              <ul className="space-y-2">
                {feeImpact
                  .filter(fee => fee.suggestedAlternative)
                  .map((fee, index) => (
                    <li key={index} className="text-sm">
                      <span className="font-medium">{fee.assetName}:</span> {fee.suggestedAlternative}
                    </li>
                  ))}
                <li className="text-sm">Consider consolidating accounts to reduce account maintenance fees</li>
                <li className="text-sm">Look for low-cost index funds with expense ratios under 0.1%</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
