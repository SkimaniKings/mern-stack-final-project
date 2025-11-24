"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Investment } from "@/lib/investments/types"
import { formatCurrency, formatPercentage } from "@/lib/utils"

interface ESGInvestmentTableProps {
  investments: Investment[]
}

export function ESGInvestmentTable({ investments }: ESGInvestmentTableProps) {
  if (!investments.length) {
    return <div className="text-center py-4">No investments found matching your criteria.</div>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Ticker</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Expense Ratio</TableHead>
            <TableHead className="text-right">ESG Score</TableHead>
            <TableHead>Sector</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investments.map((investment) => (
            <TableRow key={investment.id}>
              <TableCell className="font-medium">{investment.name}</TableCell>
              <TableCell>{investment.ticker}</TableCell>
              <TableCell className="capitalize">{investment.type ? investment.type.replace("_", " ") : "N/A"}</TableCell>
              <TableCell className="text-right">{investment.price ? formatCurrency(investment.price) : "N/A"}</TableCell>
              <TableCell className="text-right">
                {investment.expenseRatio ? formatPercentage(investment.expenseRatio / 100) : "N/A"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <div
                    className="h-2 w-16 bg-muted rounded-full overflow-hidden"
                    title={`ESG Score: ${investment.esgScore?.total ? investment.esgScore.total.toFixed(1) : "N/A"}`}
                  >
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${investment.esgScore?.total ? (investment.esgScore.total / 10) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <span>{investment.esgScore?.total ? investment.esgScore.total.toFixed(1) : "N/A"}</span>
                </div>
              </TableCell>
              <TableCell>{investment.sector || "N/A"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
