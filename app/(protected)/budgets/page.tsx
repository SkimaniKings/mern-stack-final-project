import { Suspense, use } from "react"
import { getBudgets } from "@/app/actions/budgets"
import { getCategories, ensureStaticCategories } from "@/app/actions/categories"
import { BudgetDashboard } from "@/components/budgets/budget-dashboard"
import { BudgetList } from "@/components/budgets/budget-list"
import { QuickActionsWrapper } from "@/components/budgets/quick-actions-wrapper"
import { BudgetTemplatesWrapper } from "@/components/budgets/templates/budget-templates-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Target, Plus, List, Grid3X3 } from "lucide-react"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils/formatting"
import { BudgetsAdvancedClient } from "@/components/budgets/budgets-advanced-client"

export const dynamic = "force-dynamic"

async function BudgetsListServer() {
  try {
    // Get budgets
    const budgets = await getBudgets()
    return { budgets }
  } catch (error) {
    console.error("Error in BudgetsListServer:", error)
    return { budgets: [], error: "Failed to load budgets" }
  }
}

// Client component that renders the budgets list
function BudgetsList() {
  const { budgets, error } = use(BudgetsListServer())
  
  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-destructive/10 text-destructive">
        <h2 className="text-lg font-semibold">Error loading budgets</h2>
        <p>There was a problem loading your budgets. Please try refreshing the page.</p>
      </div>
    )
  }
  
  if (!budgets || budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[400px]">
        <div className="mb-4 p-4 rounded-full bg-muted">
          <LineChart className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Budgets Yet</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Create your first budget to start tracking your spending and saving goals.
        </p>
        <Button asChild>
          <Link href="/budgets/manage/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Budget
          </Link>
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Budget List with Edit and Delete functionality */}
      <BudgetList budgets={budgets} />
      
      {/* Create New Budget Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/budgets/manage/create">
          <Card className="h-full border-dashed hover:border-primary transition-colors cursor-pointer flex flex-col justify-center items-center p-6">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Create New Budget</h3>
            <p className="text-muted-foreground text-center">
              Set up a new budget to track your finances
            </p>
          </Card>
        </Link>
      </div>
    </div>
  )
}

async function BudgetsAdvancedServer() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error("Not authenticated")
    }

    // Get categories first, which will be initialized if needed
    const { categories } = await ensureStaticCategories()

    // Get budgets after categories are ensured
    const budgets = await getBudgets()
    
    // Check if we have any budgets
    const hasBudgets = budgets && budgets.length > 0
    
    // Calculate total budget allocation across all budgets
    const totalBudgeted = hasBudgets
      ? budgets.reduce((sum, budget) => sum + (budget.amount || 0), 0)
      : 0
    
    // Calculate total allocated across all budgets
    const totalAllocated = hasBudgets
      ? budgets.reduce((sum, budget) => {
          const budgetAllocated = budget.budget_categories?.reduce(
            (catSum: number, cat: any) => catSum + (cat.amount_allocated || 0),
            0
          ) || 0
          return sum + budgetAllocated
        }, 0)
      : 0
    
    // Calculate overall allocation percentage
    const overallAllocationPercentage = totalBudgeted > 0
      ? (totalAllocated / totalBudgeted) * 100
      : 0
    
    return {
      categories,
      budgets,
      hasBudgets,
      totalBudgeted,
      totalAllocated,
      overallAllocationPercentage
    }
  } catch (error) {
    console.error("Error in BudgetsAdvancedServer:", error)
    return {
      categories: [],
      budgets: [],
      hasBudgets: false,
      totalBudgeted: 0,
      totalAllocated: 0,
      overallAllocationPercentage: 0,
      error: "Failed to load budget data"
    }
  }
}




function BudgetsAdvanced() {
  const data = use(BudgetsAdvancedServer())
  
  if (data.error) {
    return (
      <div className="p-4 border rounded-lg bg-destructive/10 text-destructive">
        <h2 className="text-lg font-semibold">Error loading budgets</h2>
        <p>There was a problem loading your budgets. Please try refreshing the page.</p>
      </div>
    )
  }
  
  return (
    <BudgetsAdvancedClient 
      categories={data.categories} 
      budgets={data.budgets} 
      hasBudgets={data.hasBudgets} 
      totalBudgeted={data.totalBudgeted} 
      totalAllocated={data.totalAllocated} 
      overallAllocationPercentage={data.overallAllocationPercentage} 
    />
  )
}

export default function BudgetsPage() {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto w-full">
        <div className="flex justify-between items-center">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
            <p className="text-muted-foreground text-lg">Manage your spending budgets</p>
          </div>
          <Button asChild>
            <Link href="/budgets/manage/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Budget
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="essentials" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="essentials" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Budget List
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Advanced Features
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="essentials" className="mt-0">
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
              <BudgetsList />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="advanced" className="mt-0">
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
              <BudgetsAdvanced />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
