"use client"

import { useState, useEffect } from "react"
import { ReportGenerator } from "@/components/reports/report-generator"
import { ReportsList } from "@/components/reports/reports-list"
import { getReports, Report } from "@/app/actions/reports"

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await getReports()
        setReports(data)
      } catch (error) {
        console.error("Error loading reports:", error)
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Report Generation</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ReportGenerator />
        <div className="md:col-span-2">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground">Loading reports...</p>
            </div>
          ) : (
            <ReportsList reports={reports} />
          )}
        </div>
      </div>
    </div>
  )
}
