"use client"

import { useState, useEffect } from "react"
import { Bell, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"

interface Notification {
  id: string
  type: "over_budget" | "approaching_limit" | "milestone_reached" | "new_transaction"
  message: string
  data: any
  read: boolean
  created_at: string
}

export function BudgetNotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClientComponentClient()

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("budget_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) {
        console.error("Error fetching notifications:", error)
        return
      }

      setNotifications(data)
      setUnreadCount(data.filter((n: Notification) => !n.read).length)
    }

    fetchNotifications()

    // Subscribe to new notifications
    const channel = supabase
      .channel("budget_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "budget_notifications",
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
          setUnreadCount(count => count + 1)
          toast.info(payload.new.message)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Mark notification as read
  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("budget_notifications")
      .update({ read: true })
      .eq("id", id)

    if (error) {
      console.error("Error marking notification as read:", error)
      return
    }

    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount(count => count - 1)
  }

  // Mark all as read
  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("budget_notifications")
      .update({ read: true })
      .eq("read", false)

    if (error) {
      console.error("Error marking all notifications as read:", error)
      return
    }

    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </CardTitle>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
          >
            Mark all as read
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-center text-muted-foreground">No notifications</p>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 p-4 rounded-lg border ${
                notification.read ? "bg-muted/50" : "bg-primary/5"
              }`}
            >
              <div className="flex-1">
                <p className="font-medium">{notification.message}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(notification.created_at).toLocaleDateString()}
                </p>
              </div>
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => markAsRead(notification.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
