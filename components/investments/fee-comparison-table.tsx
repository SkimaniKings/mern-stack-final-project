"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatPercent } from "@/lib/investments/calculations"
import type { Investment } from "@/lib/investments/calculations"

interface FeeComparisonTableProps {
  alternatives: {
    originalInvestment: {
      id: string
      name: string
      ticker?: string
    }
    alternatives: {
      id: string
      name: string
      ticker: string
      expenseRatio: number
      tracking: string
      annualSavings: number
    }[]
  }[]
  investments: Investment[]
}

export function FeeComparisonTable({ alternatives, investments }: FeeComparisonTableProps) {
  return (
    <div className="space-y-6">
      {alternatives.map((item) => {
        // Find the original investment details
        const originalInvestment = investments.find((inv) => inv.id === item.originalInvestment.id)

        if (!originalInvestment) return null

        return (
          <div key={item.originalInvestment.id} className="space-y-2">
            <h3 className="font-medium">
              Alternatives for {item.originalInvestment.name}
              {item.originalInvestment.ticker && (
                <span className="text-muted-foreground ml-1">({item.originalInvestment.ticker})</span>
              )}
            </h3>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead>Expense Ratio</TableHead>
                  <TableHead>Tracks</TableHead>
                  <TableHead>Annual Savings</TableHead>
                  <TableHead>30-Year Savings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    {originalInvestment.name}
                    {originalInvestment.ticker && (
                      <span className="text-muted-foreground ml-1">({originalInvestment.ticker})</span>
                    )}
                    <Badge className="ml-2">Current</Badge>
                  </TableCell>
                  <TableCell>{formatPercent(originalInvestment.expenseRatio || 0)}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>

                {item.alternatives.map((alt) => {
                  // Calculate 30-year savings
                  const thirtyYearSavings = alt.annualSavings * 30 * 1.5 // Simple approximation with compound growth

                  return (
                    <TableRow key={alt.id}>
                      <TableCell className="font-medium">
                        {alt.name}
                        <span className="text-muted-foreground ml-1">({alt.ticker})</span>
                      </TableCell>
                      <TableCell className="text-green-600">{formatPercent(alt.expenseRatio)}</TableCell>
                      <TableCell>{alt.tracking}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(alt.annualSavings)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(thirtyYearSavings)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )
      })}

      <div className="p-4 border rounded-lg bg-muted/50">
        <h3 className="font-medium mb-2">How to Switch to Lower-Cost Alternatives</h3>
        <ol className="space-y-1 text-sm list-decimal pl-4">
          <li>Research the alternative fund to ensure it tracks a similar index and has adequate liquidity</li>
          <li>Consider tax implications before selling investments in taxable accounts</li>
          <li>Look for commission-free ETF options at your brokerage</li>
          <li>Consider using the new fund for future contributions while holding existing investments</li>
          <li>If selling, use specific lot identification to minimize tax impact</li>
        </ol>
      </div>
    </div>
  )
}

