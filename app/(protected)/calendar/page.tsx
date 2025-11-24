"use client"

import { Suspense, useState } from "react"
import { WidgetLayout } from "@/components/dashboard/widget-layout"
import { AnalyticsCalendar } from "@/components/reports/analytics-calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CalendarPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Financial Calendar</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Analytics Overview</CardTitle>
            <CardDescription>
              Track your financial activities and generated reports over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              The calendar below shows your financial activities and generated reports. 
              Days with financial transactions are highlighted with green (income) and red (expenses) borders. 
              Days with generated reports are highlighted with a blue border at the top.
            </p>
          </CardContent>
        </Card>
        
        <Suspense fallback={<div className="flex h-64 items-center justify-center">Loading calendar...</div>}>
          <AnalyticsCalendar />
        </Suspense>
      </div>
    </div>
  )
}
