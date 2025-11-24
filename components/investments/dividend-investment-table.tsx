"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatPercent } from "@/lib/investments/calculations"
import type { Investment } from "@/lib/investments/calculations"

interface DividendInvestmentTableProps {
  investments: Investment[]
}

export function DividendInvestmentTable({ investments }: DividendInvestmentTableProps) {
  // Filter and sort investments by dividend yield (highest first)
  const dividendInvestments = investments
    .filter((inv) => inv.dividendYield !== undefined && inv.dividendYield > 0)
    .sort((a, b) => {
      const yieldA = a.dividendYield || 0
      const yieldB = b.dividendYield || 0
      return yieldB - yieldA
    })

  return (
    <div className="space-y-4">
      {dividendInvestments.length === 0 ? (
        <div className="text-center p-4 border rounded-lg">
          <p className="text-muted-foreground">No dividend-paying investments found.</p>
          <p className="text-sm">Add investments with dividend yields to see them here.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investment</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Dividend Yield</TableHead>
              <TableHead>Annual Income</TableHead>
              <TableHead>Monthly Income</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dividendInvestments.map((investment) => {
              const annualDividend = (investment.value * (investment.dividendYield || 0)) / 100
              const monthlyDividend = annualDividend / 12

              return (
                <TableRow key={investment.id}>
                  <TableCell className="font-medium">
                    {investment.name}
                    {investment.ticker && <span className="text-muted-foreground ml-1">({investment.ticker})</span>}
                  </TableCell>
                  <TableCell>{formatCurrency(investment.value)}</TableCell>
                  <TableCell>{investment.dividendYield ? formatPercent(investment.dividendYield) : "N/A"}</TableCell>
                  <TableCell>{formatCurrency(annualDividend)}</TableCell>
                  <TableCell>{formatCurrency(monthlyDividend)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <div className="p-4 border rounded-lg bg-muted/50">
        <h3 className="font-medium mb-2">Dividend Reinvestment Benefits</h3>
        <ul className="space-y-1 text-sm">
          <li>• Compound growth: Reinvested dividends purchase more shares that generate more dividends</li>
          <li>• Dollar-cost averaging: Automatic reinvestment at different price points</li>
          <li>• Hands-off approach: Automated wealth building without manual intervention</li>
          <li>
            • Long-term growth: Historical studies show reinvested dividends account for a significant portion of total
            returns
          </li>
        </ul>
      </div>
    </div>
  )
}

