import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { NotificationsContent } from "@/components/notifications/notifications-content"
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ManualGoalCheckButton } from "@/components/notifications/manual-goal-check-button"
import { ManualBillCheckButton } from "@/components/notifications/manual-bill-check-button"

export const dynamic = "force-dynamic"

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-2">Manage your notification preferences and view your notification history</p>
        </div>
        <div className="flex items-center gap-2">
          <ManualGoalCheckButton />
          <ManualBillCheckButton />
        </div>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        
        <TabsContent value="notifications">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <NotificationsContent />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="preferences">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <NotificationPreferencesForm />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
