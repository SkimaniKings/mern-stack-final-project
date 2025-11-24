"use client"

import Link from "next/link"
import { BellIcon } from "@radix-ui/react-icons"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { type Notification } from "@/types/notification"

const notificationVariants = cva(
  "flex items-start space-x-4 p-4 rounded-lg transition-colors",
  {
    variants: {
      is_read: {
        true: "hover:bg-slate-100 dark:hover:bg-slate-800",
        false: "bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950",
      },
    },
    defaultVariants: {
      is_read: false,
    },
  }
)

interface NotificationItemProps {
  notification: Notification
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const content = (
    <div className={cn(notificationVariants({ is_read: notification.is_read }))}>
      <div className="flex-shrink-0 pt-1">
        <BellIcon className="h-5 w-5 text-slate-500" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-800 dark:text-slate-200">{notification.message}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {new Date(notification.created_at).toLocaleString()}
        </p>
      </div>
       {!notification.is_read && (
        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
      )}
    </div>
  )

  if (notification.link) {
    return (
      <Link href={notification.link} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500">
        {content}
      </Link>
    )
  }

  return <div className="rounded-lg">{content}</div>
}
