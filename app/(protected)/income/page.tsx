import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { IncomeList } from "@/components/income/income-list"
import { IncomeSummaryChart } from "@/components/income/income-summary-chart"
import { getIncomes, calculateIncomeDiversification } from "@/app/actions/income"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IncomeAnalyticsClient } from "@/components/income/income-analytics-client"

// Ensure this page is always dynamic and never cached
export const dynamic = "force-dynamic"
export const revalidate = 0

async function IncomeOverviewContent() {
  // Use current timestamp to ensure we get fresh data
  const timestamp = Date.now()
  const incomes = await getIncomes(timestamp)

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Income Overview</h2>
      <p className="text-muted-foreground mb-2">
        Track and manage your income entries here.
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        Note: All amounts show monthly equivalent values automatically calculated based on recurrence frequency
      </p>
      <IncomeSummaryChart incomes={incomes} />
      <IncomeList initialIncomes={incomes} />
    </div>
  )
}

async function IncomeAnalyticsContent() {
  // Use current timestamp to ensure we get fresh data
  const timestamp = Date.now()
  const incomes = await getIncomes(timestamp)
  const diversificationScore = await calculateIncomeDiversification()
  
  return (
    <IncomeAnalyticsClient 
      incomes={incomes}
      diversificationScore={diversificationScore}
    />
  )
}

export default async function IncomePage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Income</h1>
        <p className="text-muted-foreground mt-2">Manage your income sources and track your earnings</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Tools</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <IncomeOverviewContent />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-4">
          <Suspense fallback={
            <div className="grid grid-cols-1 gap-6">
              <Skeleton className="h-[300px] w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-[400px] w-full" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            </div>
          }>
            <IncomeAnalyticsContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
