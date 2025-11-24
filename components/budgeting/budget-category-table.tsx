"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

interface BudgetCategoryTableProps {
  categories: {
    name: string
    amount: number
    percentage: number
  }[]
  monthlyIncome: number
}

export function BudgetCategoryTable({ categories, monthlyIncome }: BudgetCategoryTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Sort categories by amount (highest first)
  const sortedCategories = [...categories].sort((a, b) => b.amount - a.amount)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Monthly Amount</TableHead>
            <TableHead>Percentage</TableHead>
            <TableHead className="w-[30%]">Allocation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCategories.map((category) => (
            <TableRow key={category.name}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell>{formatCurrency(category.amount)}</TableCell>
              <TableCell>{category.percentage}%</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={category.percentage} className="h-2" />
                  <span className="text-xs text-muted-foreground w-12 text-right">{category.percentage}%</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="font-bold">Total</TableCell>
            <TableCell className="font-bold">{formatCurrency(monthlyIncome)}</TableCell>
            <TableCell className="font-bold">100%</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

