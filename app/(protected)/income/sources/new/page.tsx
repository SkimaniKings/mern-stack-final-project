import { Suspense } from "react"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { IncomeSourceForm } from "@/components/income/income-source-form"

export default function NewIncomeSourcePage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/income">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Income Source</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Income Source</CardTitle>
          <CardDescription>Add a new income source to track and analyze</CardDescription>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              
            </p>
          </CardContent>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormSkeleton />}>
            <IncomeSourceForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-1/3" />
    </div>
  )
}

