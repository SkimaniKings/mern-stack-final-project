import { Suspense } from "react"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { headers } from "next/headers"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { IncomeSourceForm } from "@/components/income/income-source-form"
import { getIncomeSourceById } from "@/app/actions/income-sources"

interface EditIncomeSourcePageProps {
  params: {
    id: string
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EditIncomeSourcePage(props: EditIncomeSourcePageProps) {
  // Use a different approach to avoid the Next.js warning
  // This is a workaround for the Next.js 14+ issue with dynamic route params
  const id = Array.isArray(props.params.id) ? props.params.id[0] : props.params.id;
  
  // Fetch the income source
  const incomeSource = await getIncomeSourceById(id).catch(() => null)

  if (!incomeSource) {
    notFound()
  }

  // Generate a unique key for the form to force re-render
  const timestamp = Date.now();

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/income">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Income Source</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit {incomeSource.name}</CardTitle>
          <CardDescription>Update the details of this income source</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormSkeleton />}>
            <IncomeSourceForm 
              key={`form-${incomeSource.id}-${timestamp}`}
              incomeSource={incomeSource} 
              isEditing 
            />
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
