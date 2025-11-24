"use client"

import { formatCurrency, formatDate } from "@/lib/utils/formatting"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Participant {
  id: string
  name: string
  avatar: string
  amount: number
  status: "paid" | "pending"
}

interface SplitExpense {
  id: string
  merchant: string
  category: string
  amount: number
  date: Date
  status: "active" | "settled"
  participants: Participant[]
}

interface SplitExpenseListProps {
  expenses: SplitExpense[]
  onSelectExpense: (id: string) => void
  selectedExpenseId: string | null
}

export function SplitExpenseList({ expenses, onSelectExpense, selectedExpenseId }: SplitExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No expenses found
      </div>
    )
  }

  return (
    <div className="divide-y">
      {expenses.map((expense) => {
        // Calculate pending amount
        const pendingAmount = expense.participants
          .filter(p => p.status === "pending")
          .reduce((sum, p) => sum + p.amount, 0)
        
        // Get pending participants count
        const pendingParticipants = expense.participants.filter(p => p.status === "pending").length
        
        return (
          <div
            key={expense.id}
            className={cn(
              "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
              selectedExpenseId === expense.id && "bg-muted"
            )}
            onClick={() => onSelectExpense(expense.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium">{expense.merchant}</h4>
                <p className="text-sm text-muted-foreground">{expense.category}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(expense.amount)}</p>
                <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-2">
              <div className="flex -space-x-2">
                {expense.participants.slice(0, 3).map((participant) => (
                  <Avatar key={participant.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={participant.avatar} alt={participant.name} />
                    <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
                {expense.participants.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                    +{expense.participants.length - 3}
                  </div>
                )}
              </div>
              
              {expense.status === "active" && pendingParticipants > 0 ? (
                <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50">
                  {pendingParticipants} pending • {formatCurrency(pendingAmount)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-emerald-500 border-emerald-200 bg-emerald-50">
                  Settled
                </Badge>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
