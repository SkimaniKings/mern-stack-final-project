import { Suspense } from "react"
import { getAccounts } from "@/app/actions/accounts"
import { AccountsManager } from "@/components/accounts/accounts-manager"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

async function AccountsContent() {
  const accounts = await getAccounts()
  return <AccountsManager initialAccounts={accounts} />
}

export default async function AccountsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <p className="text-muted-foreground mt-2">Manage your financial accounts</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <AccountsContent />
      </Suspense>
    </div>
  )
}

