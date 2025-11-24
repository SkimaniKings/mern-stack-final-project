"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/formatting"
import { Progress } from "@/components/ui/progress"

interface Account {
  id: string
  name: string
  type: string
  balance: number
  currency: string
}

interface AccountSummaryProps {
  accounts: Account[]
}

export function AccountSummary({ accounts }: AccountSummaryProps) {
  // Group accounts by type
  const accountsByType: Record<string, { total: number; accounts: Account[] }> = {}

  accounts.forEach((account) => {
    if (!accountsByType[account.type]) {
      accountsByType[account.type] = { total: 0, accounts: [] }
    }

    accountsByType[account.type].total += account.balance
    accountsByType[account.type].accounts.push(account)
  })

  // Calculate total balance
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  return (
    <div className="space-y-6">
      {Object.entries(accountsByType).map(([type, data]) => (
        <div key={type} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium capitalize">{type.replace("_", " ")}</h3>
            <span className="text-sm font-medium">
              {formatCurrency(data.total)} ({Math.round((data.total / totalBalance) * 100)}%)
            </span>
          </div>
          <Progress value={(data.total / totalBalance) * 100} className="h-2" />
          <div className="space-y-2 mt-2">
            {data.accounts.map((account) => (
              <Card key={account.id}>
                <CardContent className="p-3 flex justify-between items-center">
                  <span className="text-sm">{account.name}</span>
                  <span className={`text-sm font-medium ${account.balance < 0 ? "text-red-600" : ""}`}>
                    {formatCurrency(account.balance)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

