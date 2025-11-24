"use client"

import { Suspense } from "react"
import { BellIcon } from "@radix-ui/react-icons"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { Skeleton } from "@/components/ui/skeleton"

function DropdownSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>
      </div>
    </div>
  )
}

export function NotificationBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5" />
          {/* We could add a dot here for unread notifications later */}
          <span className="sr-only">Open notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 font-medium border-b text-sm">
          Notifications
        </div>
        <Suspense fallback={<DropdownSkeleton />}>
          {/* @ts-expect-error Server Component */}
          <NotificationDropdown />
        </Suspense>
      </PopoverContent>
    </Popover>
  )
}
