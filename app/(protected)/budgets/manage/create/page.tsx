import { Suspense } from "react"
import { getCategories } from "@/app/actions/categories"
import { BudgetForm } from "@/components/budgets/budget-form"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

async function CreateBudgetContent() {
  const { categories } = await getCategories()
  
  // Filter out income categories for budgets
  const expenseCategories = categories?.filter((category) => !category.is_income) || []
  
  return <BudgetForm categories={expenseCategories} />
}

export default function CreateBudgetPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/budgets">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Budgets
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Budget</h1>
        <p className="text-muted-foreground mt-2">Set up a new budget to track your spending</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <CreateBudgetContent />
      </Suspense>
    </div>
  )
}
