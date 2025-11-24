"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpenseCategoryBreakdown } from "./expense-category-breakdown"
import { ExpenseMonthlyTrend } from "./expense-monthly-trend"
import { ExpenseDayAnalysis } from "./expense-day-analysis"
import { InteractiveTimeline } from "./interactive-timeline"
import { BarChart3, PieChart, Calendar, Clock } from "lucide-react"

export function ExpenseAnalytics() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center">
            <PieChart className="mr-2 h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Patterns
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ExpenseCategoryBreakdown />
            <ExpenseMonthlyTrend />
          </div>
        </TabsContent>
        
        <TabsContent value="categories" className="mt-6 space-y-6">
          <ExpenseCategoryBreakdown />
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Timeline</CardTitle>
              <CardDescription>
                View your spending trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InteractiveTimeline />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="patterns" className="mt-6 space-y-6">
          <ExpenseDayAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  )
}
