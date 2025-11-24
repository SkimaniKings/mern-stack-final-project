import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getBudgetById } from "@/app/actions/budgets"
import { getCategories } from "@/app/actions/categories"
import { BudgetDetail } from "@/components/budgets/budget-detail"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export const dynamic = "force-dynamic"

interface BudgetDetailPageProps {
  params: {
    id: string
  }
}

async function BudgetDetailContent({ budgetId }: { budgetId: string }) {
  try {
    // Validate that id is a valid UUID format before proceeding
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(budgetId)) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Invalid Budget ID</h2>
          <p className="text-muted-foreground mb-6">
            The budget ID format is invalid. Budget IDs must be in UUID format.
          </p>
          <Button asChild>
            <Link href="/budgets">Return to Budgets</Link>
          </Button>
        </div>
      );
    }
    
    // Fetch budget and categories in parallel
    const [budget, categoriesResult] = await Promise.all([
      getBudgetById(budgetId),
      getCategories()
    ]);

    // If budget not found, show a helpful error message instead of 404
    if (!budget) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Budget Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The budget you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button asChild>
            <Link href="/budgets">Return to Budgets</Link>
          </Button>
        </div>
      );
    }

    // Handle the categories result properly with type assertion
    let categories: any[] = [];
    if (categoriesResult && typeof categoriesResult === 'object' && 'categories' in categoriesResult) {
      categories = categoriesResult.categories as any[];
    }
      
    return <BudgetDetail budget={budget} categories={categories} />;
  } catch (error) {
    console.error("Error fetching budget:", error);
    
    // Show a helpful error message instead of 404
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Something Went Wrong</h2>
        <p className="text-muted-foreground mb-6">
          We encountered an error while trying to load this budget. Please try again later.
        </p>
        <Button asChild>
          <Link href="/budgets">Return to Budgets</Link>
        </Button>
      </div>
    );
  }
}

export default async function BudgetDetailPage({ params }: BudgetDetailPageProps) {
  // Await the params object to access its properties
  const { id } = await params;
  
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/budgets">
            ← Back to Budgets
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <BudgetDetailContent budgetId={id} />
      </Suspense>
    </div>
  )
}
