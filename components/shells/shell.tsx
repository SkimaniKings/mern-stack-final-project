import React from "react"
import { cn } from "@/lib/utils"

interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  layout?: "default" | "dashboard"
}

export function Shell({
  children,
  className,
  layout = "default",
  ...props
}: ShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col",
        layout === "default" && "container pb-8 pt-6 md:py-8",
        layout === "dashboard" && "mx-auto p-4 md:p-6 2xl:p-10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
