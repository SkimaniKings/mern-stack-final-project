"use client"

import { useState } from "react"
import { ExpenseList } from "@/components/expenses/expense-list"
import { Button } from "@/components/ui/button"
import { Plus, BarChart, List } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpenseAnalytics } from "@/components/expenses/expense-analytics"

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState("list")

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Button asChild>
          <Link href="/expenses/new">
            <Plus className="mr-2 h-4 w-4" />
            New Expense
          </Link>
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list" className="flex items-center">
            <List className="mr-2 h-4 w-4" />
            Expense List
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center">
            <BarChart className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-6">
          <ExpenseList />
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6 space-y-6">
          <ExpenseAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  )
}
