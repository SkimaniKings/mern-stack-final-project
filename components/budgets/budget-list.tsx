"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Eye } from "lucide-react"

import { Budget } from "@/types/budget"
import { formatCurrency } from "@/lib/utils/formatting"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BudgetMenu } from "./budget-menu"

interface BudgetListProps {
  budgets: Budget[]
}

export function BudgetList({ budgets }: BudgetListProps) {
  const router = useRouter()

  const handleAction = () => {
    router.refresh()
  }

  if (!budgets || budgets.length === 0) {
    return (
      <div className="col-span-full text-center p-8">
        <p className="text-muted-foreground">No budgets found. Create your first budget to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {budgets.map((budget) => {
        const allocationPercentage = budget.amount > 0 ? ((budget.total_allocated || 0) / budget.amount) * 100 : 0

        return (
          <Card
            key={budget.id}
            className="hover:shadow-lg transition-shadow duration-300 ease-in-out flex flex-col"
          >
            <CardHeader className="flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold">{budget.name}</CardTitle>
                  <CardDescription>
                    {budget.start_date && budget.end_date ? `${format(new Date(budget.start_date), "MMM yyyy")} - ${format(new Date(budget.end_date), "MMM yyyy")}` : 'No date range'}
                  </CardDescription>
                </div>
                <BudgetMenu budget={budget} onAction={handleAction} />
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Status</span>
                <Badge variant={budget.is_active ? "secondary" : "outline"}>
                  {budget.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="pt-4 flex-col items-start">
              <div className="w-full">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Allocated</span>
                  <span>{formatCurrency(budget.total_allocated || 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Budget</span>
                  <span>{formatCurrency(budget.amount)}</span>
                </div>
                <Progress
                  value={allocationPercentage}
                  className="mt-2 h-2"
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {budget.categories_count || 0} categories
              </div>
            </CardFooter>
            <CardFooter className="flex justify-start border-t pt-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/budgets/${budget.id}`}>
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
