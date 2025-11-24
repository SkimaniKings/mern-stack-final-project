import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"

export const dynamic = "force-dynamic"

interface AccountDetailPageProps {
  params: {
    id: string
  }
}

export default function AccountDetailPage({ params }: AccountDetailPageProps) {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/accounts">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Accounts
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Account ID: {params.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Account Details Loading</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              The account details feature is currently being updated. Please check back soon.
            </p>
            <Button asChild>
              <Link href="/accounts">Return to Accounts</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

