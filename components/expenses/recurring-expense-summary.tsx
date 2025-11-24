import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"

interface CategorySummary {
  category: string
  amount: number
}

interface RecurringExpenseSummaryProps {
  monthlyTotal: number
  yearlyTotal: number
  categorySummary: CategorySummary[]
}

export function RecurringExpenseSummary({
  monthlyTotal,
  yearlyTotal,
  categorySummary,
}: RecurringExpenseSummaryProps) {
  // Get total for progress calculation
  const totalMonthlyAmount = categorySummary.reduce((sum, category) => sum + category.amount, 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{formatCurrency(monthlyTotal)}</div>
            <p className="text-muted-foreground">Monthly subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotal * 12)}</div>
            <p className="text-muted-foreground">Annual cost</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Spending by Category</h3>
        <div className="space-y-4">
          {categorySummary.length === 0 ? (
            <p className="text-muted-foreground">No recurring expenses found</p>
          ) : (
            categorySummary.map((category) => {
              // Calculate percentage of total
              const percentage = Math.round((category.amount / totalMonthlyAmount) * 100)

              return (
                <div key={category.category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{category.category}</div>
                    <div className="text-right">
                      <div>{formatCurrency(category.amount)}</div>
                      <div className="text-xs text-muted-foreground">{percentage}% of total</div>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Subscription Insights</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            Your subscription spending represents approximately{" "}
            <span className="font-medium">{formatCurrency(yearlyTotal)}</span> per month.
          </p>
          <p>
            This amounts to <span className="font-medium">{formatCurrency(yearlyTotal * 12)}</span> per year.
          </p>
          {categorySummary.length > 0 && (
            <p>
              Your highest spending category is{" "}
              <span className="font-medium">{categorySummary[0].category}</span> at{" "}
              <span className="font-medium">{formatCurrency(categorySummary[0].amount)}</span> per month.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
