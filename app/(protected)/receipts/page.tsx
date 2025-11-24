import { Suspense } from "react"
import { ReceiptIcon } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { ReceiptManager } from "@/components/transactions/receipt-manager"
import { supabase } from "@/lib/supabase"

// Mock user ID since authentication is disabled
const MOCK_USER_ID = "123e4567-e89b-12d3-a456-426614174000"

export const dynamic = "force-dynamic"

export default async function ReceiptsPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Receipt Vault</h1>
        <p className="text-muted-foreground">Manage and search your digital receipts and warranties</p>
      </div>

      <Suspense fallback={<ReceiptManagerSkeleton />}>
        <ReceiptManagerContent />
      </Suspense>
    </div>
  )
}

async function ReceiptManagerContent() {
  // Fetch receipts with transaction data
  const { data: receipts } = await supabase
    .from("receipts")
    .select(`
      *,
      transactions(*)
    `)
    .eq("transactions.user_id", MOCK_USER_ID)
    .order("created_at", { ascending: false })

  return <ReceiptManager receipts={receipts || []} />
}

function ReceiptManagerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center h-[200px] text-center p-4">
        <div className="flex flex-col items-center">
          <ReceiptIcon className="h-12 w-12 text-muted-foreground mb-2" />
          <Skeleton className="h-4 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  )
}

