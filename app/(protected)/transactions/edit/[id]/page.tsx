import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"

export const dynamic = "force-dynamic"

interface TransactionEditPageProps {
  params: {
    id: string
  }
}

export default function TransactionEditPage({ params }: TransactionEditPageProps) {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/transactions">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Transactions
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Transaction</h1>
        <p className="text-muted-foreground mt-2">Update transaction details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>Transaction ID: {params.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
                <path d="M12 8V16" />
                <path d="M8 12H16" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Transaction Editor Loading</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              The transaction editor is currently being updated. Please check back soon.
            </p>
            <Button asChild>
              <Link href="/transactions">Return to Transactions</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

