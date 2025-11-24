import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { BillsList } from "@/components/bills/bills-list"
import { BillsCalendar } from "@/components/bills/bills-calendar"
import { BillsSummary } from "@/components/bills/bills-summary"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = "force-dynamic"

export default function BillsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bills Management</h1>
        <p className="text-muted-foreground mt-2">Track, schedule, and pay your bills on time</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
        <BillsSummary />
      </Suspense>

      <Tabs defaultValue="list" className="mt-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <BillsList />
          </Suspense>
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <BillsListWithCalendar />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// This component combines BillsList and BillsCalendar to share bill data
function BillsListWithCalendar() {
  return (
    <div className="space-y-6">
      <BillsList showCalendarView={true} />
    </div>
  )
}
