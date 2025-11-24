import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>You don't have permission to access this Dripcheck resource.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            This area may require additional permissions or authentication to access Dripcheck's premium features.
          </p>
          <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
            <h3 className="font-medium text-amber-800 mb-2">Possible reasons:</h3>
            <ul className="text-sm text-amber-700 list-disc list-inside text-left">
              <li>Your account doesn't have the required permissions</li>
              <li>Your session may have expired</li>
              <li>You need to verify your email address</li>
              <li>You're trying to access a premium feature</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/login">Sign In Again</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

