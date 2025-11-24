"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Lock, Unlock, Plus, Trash2, Edit, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface Activity {
  id: string
  user: {
    id: string
    name: string
    avatar: string
  }
  action: "updated" | "added" | "deleted" | "locked" | "unlocked"
  category: string
  oldValue?: number
  newValue?: number
  timestamp: Date
}

interface CollaborativeActivityFeedProps {
  activities: Activity[]
}

export function CollaborativeActivityFeed({ activities }: CollaborativeActivityFeedProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`
    }

    const diffInMonths = Math.floor(diffInDays / 30)
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`
  }

  const getActionIcon = (action: Activity["action"]) => {
    switch (action) {
      case "updated":
        return <Edit className="h-4 w-4" />
      case "added":
        return <Plus className="h-4 w-4" />
      case "deleted":
        return <Trash2 className="h-4 w-4" />
      case "locked":
        return <Lock className="h-4 w-4" />
      case "unlocked":
        return <Unlock className="h-4 w-4" />
    }
  }

  const getActionColor = (action: Activity["action"]) => {
    switch (action) {
      case "updated":
        return "bg-blue-100 text-blue-700"
      case "added":
        return "bg-green-100 text-green-700"
      case "deleted":
        return "bg-red-100 text-red-700"
      case "locked":
        return "bg-amber-100 text-amber-700"
      case "unlocked":
        return "bg-purple-100 text-purple-700"
    }
  }

  const getActionText = (activity: Activity) => {
    switch (activity.action) {
      case "updated":
        return (
          <>
            updated <span className="font-medium">{activity.category}</span> from {formatCurrency(activity.oldValue!)}{" "}
            to {formatCurrency(activity.newValue!)}
            <span className="ml-1 inline-flex items-center">
              {activity.newValue! > activity.oldValue! ? (
                <ArrowUpRight className="h-3 w-3 text-red-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-green-500" />
              )}
              <span className={activity.newValue! > activity.oldValue! ? "text-red-500" : "text-green-500"}>
                {Math.abs(((activity.newValue! - activity.oldValue!) / activity.oldValue!) * 100).toFixed(1)}%
              </span>
            </span>
          </>
        )
      case "added":
        return (
          <>
            added <span className="font-medium">{activity.category}</span> with amount{" "}
            {formatCurrency(activity.newValue!)}
          </>
        )
      case "deleted":
        return (
          <>
            deleted <span className="font-medium">{activity.category}</span>
          </>
        )
      case "locked":
        return (
          <>
            locked <span className="font-medium">{activity.category}</span>
          </>
        )
      case "unlocked":
        return (
          <>
            unlocked <span className="font-medium">{activity.category}</span>
          </>
        )
    }
  }

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No activity yet</p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{activity.user.name}</span>
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getActionColor(activity.action)}`}
                  >
                    {getActionIcon(activity.action)}
                    <span className="capitalize">{activity.action}</span>
                  </div>
                </div>
                <p className="text-sm">{getActionText(activity)}</p>
                <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

