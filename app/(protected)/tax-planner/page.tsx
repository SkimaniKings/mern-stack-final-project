"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { TaxPlanningDashboard } from "@/components/tax/tax-planning-dashboard"
import { TaxBreadcrumb } from "@/components/tax/tax-breadcrumb"
import { Calculator } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaxDocumentList } from "@/components/tax/tax-document-list"
import { TaxTimelineList } from "@/components/tax/tax-timeline-list"
import { TaxDeductionList } from "@/components/tax/tax-deduction-list"
import { TaxRecommendationList } from "@/components/tax/tax-recommendation-list"
import { TaxPredictionList } from "@/components/tax/tax-prediction-list"
// Tax info tab removed

export default function TaxPlannerPage() {
  const [activeTab, setActiveTab] = useState("overview")
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Tax Planner"
        text="Plan and optimize your tax strategy and maximize your returns."
      >
        <Calculator className="h-6 w-6" />
      </DashboardHeader>
      <TaxBreadcrumb />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full md:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TaxPlanningDashboard />
        </TabsContent>

        <TabsContent value="documents">
          <TaxDocumentList />
        </TabsContent>

        <TabsContent value="timeline">
          <TaxTimelineList />
        </TabsContent>

        <TabsContent value="deductions">
          <TaxDeductionList />
        </TabsContent>

        <TabsContent value="recommendations">
          <TaxRecommendationList />
        </TabsContent>

        <TabsContent value="predictions">
          <TaxPredictionList />
        </TabsContent>

        {/* Tax info tab removed */}
      </Tabs>
    </DashboardShell>
  )
}

