import { Suspense } from "react"
import { getCategories } from "@/app/actions/categories"
import { CategoriesManager } from "@/components/categories/categories-manager"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

async function CategoriesContent() {
  const categories = await getCategories()

  return <CategoriesManager initialCategories={categories} />
}

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground mt-2">Manage your transaction categories</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <CategoriesContent />
      </Suspense>
    </div>
  )
}

