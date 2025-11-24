import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Investment Fee Analyzer",
  description: "Analyze your investment fees and find lower-cost alternatives",
}

export const dynamic = 'force-dynamic'

export default function InvestmentFeesPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Investment Fee Analyzer</h1>
        <p className="text-muted-foreground">Analyze your investment fees and find lower-cost alternatives</p>
      </div>
      
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4"/>
              <path d="M12 16h.01"/>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Feature Coming Soon</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            The investment fee analyzer feature is currently being updated. Please check back soon for detailed fee analysis.
          </p>
          <Button asChild>
            <a href="/investments">Return to Investments</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

