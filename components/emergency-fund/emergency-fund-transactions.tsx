"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { ArrowDown, ArrowUp } from "lucide-react"

interface EmergencyFundTransaction {
  id: string
  date: Date
  type: "deposit" | "withdrawal"
  amount: number
  balance: number
  source: string
  note: string
}

export function EmergencyFundTransactions() {
  // This would come from your database in a real app
  const transactions: EmergencyFundTransaction[] = [
    {
      id: "1",
      date: new Date(2024, 7, 15),
      type: "deposit",
      amount: 500,
      balance: 8500,
      source: "Checking Account",
      note: "Monthly contribution",
    },
    {
      id: "2",
      date: new Date(2024, 6, 15),
      type: "deposit",
      amount: 500,
      balance: 8000,
      source: "Checking Account",
      note: "Monthly contribution",
    },
    {
      id: "3",
      date: new Date(2024, 5, 15),
      type: "deposit",
      amount: 500,
      balance: 7500,
      source: "Checking Account",
      note: "Monthly contribution",
    },
    {
      id: "4",
      date: new Date(2024, 4, 15),
      type: "deposit",
      amount: 500,
      balance: 7000,
      source: "Checking Account",
      note: "Monthly contribution",
    },
    {
      id: "5",
      date: new Date(2024, 3, 15),
      type: "deposit",
      amount: 500,
      balance: 6500,
      source: "Checking Account",
      note: "Monthly contribution",
    },
    {
      id: "6",
      date: new Date(2024, 3, 2),
      type: "withdrawal",
      amount: 350,
      balance: 6000,
      source: "Checking Account",
      note: "Car repair emergency",
    },
    {
      id: "7",
      date: new Date(2024, 2, 15),
      type: "deposit",
      amount: 500,
      balance: 6350,
      source: "Checking Account",
      note: "Monthly contribution",
    },
    {
      id: "8",
      date: new Date(2024, 1, 15),
      type: "deposit",
      amount: 500,
      balance: 5850,
      source: "Checking Account",
      note: "Monthly contribution",
    },
    {
      id: "9",
      date: new Date(2024, 0, 15),
      type: "deposit",
      amount: 500,
      balance: 5350,
      source: "Checking Account",
      note: "Monthly contribution",
    },
    {
      id: "10",
      date: new Date(2024, 0, 1),
      type: "deposit",
      amount: 5000,
      balance: 5000,
      source: "Savings Account",
      note: "Initial emergency fund setup",
    },
  ]

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Source/Destination</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{transaction.date.toLocaleDateString()}</TableCell>
              <TableCell>
                {transaction.type === "deposit" ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    <ArrowUp className="mr-1 h-3 w-3" />
                    Deposit
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                    <ArrowDown className="mr-1 h-3 w-3" />
                    Withdrawal
                  </Badge>
                )}
              </TableCell>
              <TableCell className={transaction.type === "deposit" ? "text-green-500" : "text-red-500"}>
                {transaction.type === "deposit" ? "+" : "-"}
                {formatCurrency(transaction.amount)}
              </TableCell>
              <TableCell>{formatCurrency(transaction.balance)}</TableCell>
              <TableCell>{transaction.source}</TableCell>
              <TableCell>{transaction.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

