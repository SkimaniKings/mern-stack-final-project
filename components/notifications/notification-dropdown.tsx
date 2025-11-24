import { getNotifications } from "@/app/actions/notifications"
import { NotificationItem } from "@/components/notifications/notification-item"
import { ScrollArea } from "@/components/ui/scroll-area"

export async function NotificationDropdown() {
  const { notifications, error } = await getNotifications()

  if (error) {
    return <div className="p-4 text-sm text-center text-red-500">{error}</div>
  }

  if (!notifications || notifications.length === 0) {
    return <div className="p-8 text-sm text-center text-slate-500">You have no notifications.</div>
  }

  return (
    <ScrollArea className="h-96">
      <div className="flex flex-col space-y-1 p-2">
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </div>
    </ScrollArea>
  )
}
