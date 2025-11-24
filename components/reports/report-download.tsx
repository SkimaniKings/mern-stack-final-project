"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileText, Loader2 } from "lucide-react"
import { Report } from "@/app/actions/reports"
import { useToast } from "@/components/ui/use-toast"
import { generateReportByFormat, downloadReport } from "@/lib/report-generators"

interface ReportDownloadProps {
  report: Report
  data: any[]
}

export function ReportDownload({ report, data }: ReportDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      
      // Generate the report file based on format
      const blob = generateReportByFormat(data, report)
      
      // Create a filename
      const extension = getFileExtension(report.format)
      const filename = `${formatFilename(report.title)}_${formatDate(new Date())}.${extension}`
      
      // Download the file
      downloadReport(blob, filename)
      
      toast({
        title: "Report downloaded",
        description: `Your ${report.format.toUpperCase()} report has been downloaded.`,
      })
    } catch (error) {
      console.error("Error downloading report:", error)
      toast({
        title: "Download failed",
        description: "There was an error downloading your report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download {report.format.toUpperCase()}
        </>
      )}
    </Button>
  )
}

// Helper functions
function getFileExtension(format: string): string {
  switch (format) {
    case 'pdf':
      return 'pdf'
    case 'csv':
      return 'csv'
    case 'excel':
      return 'xlsx'
    default:
      return 'txt'
  }
}

function formatFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
