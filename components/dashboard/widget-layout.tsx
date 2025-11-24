"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface WidgetLayoutProps {
  title: string
  description?: string
  className?: string
  contentClassName?: string
  isLoading?: boolean
  action?: ReactNode
  children: ReactNode
}

export function WidgetLayout({
  title,
  description,
  className,
  contentClassName,
  isLoading = false,
  action,
  children,
}: WidgetLayoutProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-[150px] mb-2" />
              {description && <Skeleton className="h-4 w-[250px]" />}
            </>
          ) : (
            <>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </>
          )}
        </div>
        {action && <div className="flex items-center">{action}</div>}
      </CardHeader>
      <CardContent className={cn("pt-0", contentClassName)}>
        {isLoading ? (
          <div className="flex flex-col space-y-3">
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

