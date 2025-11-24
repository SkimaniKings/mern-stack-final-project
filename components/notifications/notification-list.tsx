"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "@/app/actions/notifications"
import { type Notification } from "@/types/notification"
import { Button } from "@/components/ui/button"
import { NotificationItem } from "@/components/notifications/notification-item"
import { CheckCircle, Trash2 } from "lucide-react"

interface NotificationListProps {
  initialNotifications: Notification[]
}

export function NotificationList({ initialNotifications }: NotificationListProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const router = useRouter()

  const handleMarkAsRead = async (id: string) => {
    const originalNotifications = [...notifications]
    const updatedNotifications = notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
    setNotifications(updatedNotifications)

    const { success, error } = await markNotificationAsRead(id)
    if (!success) {
      setNotifications(originalNotifications) // Revert on error
      toast.error(error || "Failed to mark as read.")
    }
  }

  const handleMarkAllAsRead = async () => {
    const originalNotifications = [...notifications]
    const updatedNotifications = notifications.map(n => ({ ...n, is_read: true }))
    setNotifications(updatedNotifications)

    const { success, error } = await markAllNotificationsAsRead()
    if (!success) {
      setNotifications(originalNotifications) // Revert on error
      toast.error(error || "Failed to mark all as read.")
    }
  }

  const handleDelete = async (id: string) => {
    const originalNotifications = [...notifications]
    const updatedNotifications = notifications.filter(n => n.id !== id)
    setNotifications(updatedNotifications)

    const { success, error } = await deleteNotification(id)
    if (!success) {
      setNotifications(originalNotifications) // Revert on error
      toast.error(error || "Failed to delete notification.")
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Notifications</h2>
        <Button onClick={handleMarkAllAsRead} disabled={unreadCount === 0} size="sm">
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark all as read
        </Button>
      </div>
      <div className="flex flex-col space-y-2">
        {notifications.map((notification) => (
          <div key={notification.id} className="flex items-center group">
            <div className="flex-grow">
              <NotificationItem notification={notification} />
            </div>
            <div className="flex items-center space-x-2 pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.is_read && (
                <Button variant="outline" size="sm" onClick={() => handleMarkAsRead(notification.id)}>
                  Mark as read
                </Button>
              )}
               <Button variant="ghost" size="icon" onClick={() => handleDelete(notification.id)} className="text-slate-500 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
