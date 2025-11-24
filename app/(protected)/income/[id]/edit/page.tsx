import { Suspense } from "react"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { IncomeForm } from "@/components/income/income-form"
import { getIncomeById } from "@/app/actions/income"

interface EditIncomePageProps {
  params: {
    id: string
  }
}

export const metadata = {
  title: "Edit Income",
  description: "Edit an existing income source",
}

export default async function EditIncomePage({ params }: EditIncomePageProps) {
  // Ensure params is properly awaited before accessing its properties
  const { id } = params
  const income = await getIncomeById(id)
  
  if (!income) {
    notFound()
  }
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/income">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Income</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Income: {income.source_name}</CardTitle>
          <CardDescription>Update the details of this income source</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormSkeleton />}>
            <IncomeForm income={income} isEditing={true} />
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
