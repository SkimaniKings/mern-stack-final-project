"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/investments/calculations"
import type { Investment } from "@/lib/investments/calculations"

interface AlternativeInvestmentTableProps {
  investments: Investment[]
}

export function AlternativeInvestmentTable({ investments }: AlternativeInvestmentTableProps) {
  // Sort investments by value (highest first)
  const sortedInvestments = [...investments].sort((a, b) => b.value - a.value)

  // Format investment type for display
  function formatInvestmentType(type: string): string {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <div className="space-y-4">
      {investments.length === 0 ? (
        <div className="text-center p-4 border rounded-lg">
          <p className="text-muted-foreground">No alternative investments found.</p>
          <p className="text-sm">Add alternative investments to see them here.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investment</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Cost Basis</TableHead>
              <TableHead>Gain/Loss</TableHead>
              <TableHead>Annual Income</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInvestments.map((investment) => {
              const gainLoss = investment.value - investment.costBasis
              const gainLossPercent = (gainLoss / investment.costBasis) * 100
              const annualIncome = investment.dividendYield ? (investment.value * investment.dividendYield) / 100 : 0

              return (
                <TableRow key={investment.id}>
                  <TableCell className="font-medium">{investment.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {formatInvestmentType(investment.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(investment.value)}</TableCell>
                  <TableCell>{formatCurrency(investment.costBasis)}</TableCell>
                  <TableCell className={gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(gainLoss)} ({gainLossPercent.toFixed(1)}%)
                  </TableCell>
                  <TableCell>
                    {annualIncome > 0 ? (
                      formatCurrency(annualIncome)
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <div className="p-4 border rounded-lg bg-muted/50">
        <h3 className="font-medium mb-2">Alternative Investment Tips</h3>
        <ul className="space-y-1 text-sm">
          <li>• Limit alternative investments to 5-20% of your total portfolio</li>
          <li>• Consider liquidity needs before investing in illiquid alternatives</li>
          <li>• Understand the unique risks and tax implications of each investment</li>
          <li>• Regularly update valuations for accurate portfolio tracking</li>
          <li>• Diversify across different types of alternative investments</li>
        </ul>
      </div>
    </div>
  )
}

