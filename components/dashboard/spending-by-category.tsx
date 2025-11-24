import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface CategorySpending {
  category_id: string
  category_name: string
  color: string
  icon: string
  total_amount: number
  transaction_count: number
}

interface SpendingByCategoryProps {
  data: CategorySpending[]
}

export function SpendingByCategory({ data }: SpendingByCategoryProps) {
  // Find the maximum amount for scaling
  const maxAmount = Math.max(...data.map((item) => Math.abs(item.total_amount)), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>Your top spending categories this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length > 0 ? (
            data.map((category) => (
              <div key={category.category_id} className="flex items-center">
                <div className="w-full space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{category.category_name}</span>
                    <span
                      className={`text-sm font-medium ${category.total_amount < 0 ? "text-red-500" : "text-green-500"}`}
                    >
                      {formatCurrency(category.total_amount)}
                    </span>
                  </div>
                  <Progress
                    value={(Math.abs(category.total_amount) / maxAmount) * 100}
                    className={`h-2 ${category.total_amount < 0 ? "bg-red-100" : "bg-green-100"}`}
                    indicatorClassName={category.total_amount < 0 ? "bg-red-500" : "bg-green-500"}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">No category data available</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

