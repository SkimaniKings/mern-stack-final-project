"use client"

import { useState, useEffect } from "react"
import { Bell, CheckCircle, Trash2, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, getUnreadNotifications } from "@/app/actions/notifications"
import { Notification } from "@/types/notification"

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { notifications, error } = await getUnreadNotifications()
        
        if (error) {
          console.error("Error fetching notifications:", error)
          setNotifications([])
          setUnreadCount(0)
          return
        }
        
        setNotifications(notifications)
        setUnreadCount(notifications.length)
      } catch (error) {
        console.error("Unexpected error fetching notifications:", error)
        setNotifications([])
        setUnreadCount(0)
      }
    }

    fetchNotifications()

    // Subscribe to new notifications
    const channel = supabase
      .channel("notifications_channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        async (payload) => {
          // Refetch notifications to get the proper notification type
          fetchNotifications()
          
          // Show toast notification
          toast.info("New Notification", {
            description: payload.new.message,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Mark notification as read
  const handleMarkAsRead = async (id: string) => {
    const result = await markNotificationAsRead(id)
    
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount(count => count - 1)
    } else {
      toast.error("Failed to mark notification as read")
    }
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsAsRead()
    
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } else {
      toast.error("Failed to mark all notifications as read")
    }
  }

  // Delete notification
  const handleDeleteNotification = async (id: string) => {
    const result = await deleteNotification(id)
    
    if (result.success) {
      const notification = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (notification && !notification.is_read) {
        setUnreadCount(count => count - 1)
      }
    } else {
      toast.error("Failed to delete notification")
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id)
    }
    
    // For now, we don't have links in the new schema
    setIsOpen(false)
  }

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    if (type === "General Alert") return "🔔"
    if (type === "Reminder") return "⏰"
    if (type === "System Update") return "🔄"
    return "📢"
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between py-2 px-4">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 text-xs"
              >
                Mark all as read
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                  <Bell className="h-10 w-10 text-muted-foreground mb-2 opacity-20" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <div className="space-y-1 p-1">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-2 p-3 rounded-md hover:bg-accent/50 cursor-pointer transition-colors ${
                        notification.is_read ? "opacity-70" : "bg-accent/20"
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="text-lg mt-0.5">
                        {getNotificationIcon(notification.notification_type || "General Alert")}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium leading-none">
                            {notification.notification_type || "Notification"}
                          </p>
                          <div className="flex gap-1">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notification.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.created_at).toLocaleDateString()} {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {notification.link && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-2 text-center border-t">
              <Button 
                variant="link" 
                size="sm" 
                className="text-xs h-8"
                onClick={() => {
                  router.push("/notifications")
                  setIsOpen(false)
                }}
              >
                View all notifications
              </Button>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
