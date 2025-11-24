import { Suspense } from "react"
import { getBudgets } from "@/app/actions/budgets"
import { getCategories } from "@/app/actions/categories"
import { BudgetsManager } from "@/components/budgets/budgets-manager"

import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

async function BudgetsContent() {
  const [budgets, categories] = await Promise.all([
    getBudgets(),
    getCategories()
  ])
  return <BudgetsManager initialBudgets={budgets} categories={categories.categories || []} />
}

export default function ManageBudgetsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Budgets</h1>
        <p className="text-muted-foreground mt-2">Create and manage your budget plans</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <BudgetsContent />
      </Suspense>
    </div>
  )
}

