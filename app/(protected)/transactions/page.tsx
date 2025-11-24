import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { TransactionsManager } from "@/components/transactions/transactions-manager"
import { getCombinedTransactions } from "@/app/actions/transactions"
// Fix the import path to use the correct location
import { getAccounts } from "@/app/actions/accounts"
import { getCategories } from "@/app/actions/categories"

export const dynamic = "force-dynamic"

async function TransactionsContent() {
  const [combinedTransactions, accounts, categories] = await Promise.all([getCombinedTransactions(), getAccounts(), getCategories()])

  return <TransactionsManager initialTransactions={combinedTransactions} accounts={accounts} categories={categories} />
}

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground mt-2">Manage your financial transactions</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <TransactionsContent />
      </Suspense>
    </div>
  )
}

