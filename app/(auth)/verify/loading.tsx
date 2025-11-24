import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function VerifyLoading() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Dripcheck Verification</CardTitle>
        <CardDescription>Loading email verification services...</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground text-center">
          Preparing to verify your account for access to ESG investment screening, 
          net worth tracking, and watchlist functionality.
        </p>
      </CardContent>
    </Card>
  )
}

