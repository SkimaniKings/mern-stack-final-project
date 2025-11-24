"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Plus, CreditCard, Home, Car, GraduationCap, Edit, Trash2, Briefcase, Stethoscope } from "lucide-react"
import { DebtDialog } from "@/components/debt/debt-dialog"
// Import the UI Debt type from actions instead of the database Debt type
import { Debt as UIDebt } from "@/app/actions/debts"
// Also import the database Debt type for service operations
import { Debt as DBDebt } from "@/types/debt"
import { DebtService } from "@/lib/debt/debt-service"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useDebtContext } from "@/lib/debt/debt-context"

export function DebtList() {
  const [open, setOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<UIDebt | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { debts: contextDebts, loading, error: contextError, refreshDebts, addDebt: addContextDebt, updateDebt: updateContextDebt, removeDebt: removeContextDebt } = useDebtContext()

  // No need for useEffect to fetch debts - the context handles that

  // Convert context debts to UI debts format for display
  const convertToUIDebts = (): UIDebt[] => {
    return contextDebts.map(dbDebt => ({
      id: dbDebt.id,
      name: dbDebt.name,
      type: dbDebt.type?.replace('_', '-') || 'personal',
      principal: dbDebt.current_balance,
      interest_rate: dbDebt.interest_rate,
      minimum_payment: dbDebt.minimum_payment,
      term_months: dbDebt.loan_term === null ? undefined : dbDebt.loan_term,
      due_date: dbDebt.due_date || undefined,
      start_date: undefined,
      // Add a flag to indicate if this debt was stored locally
      isLocal: !dbDebt.id.startsWith('db-')
    }))
  }
  
  // Get UI-formatted debts from context
  const debts = convertToUIDebts()

  const debtTypeIcons: Record<string, React.ReactNode> = {
    "credit_card": <CreditCard className="h-4 w-4" />,
    "credit-card": <CreditCard className="h-4 w-4" />,
    "mortgage": <Home className="h-4 w-4" />,
    "auto": <Car className="h-4 w-4" />,
    "auto_loan": <Car className="h-4 w-4" />,
    "student": <GraduationCap className="h-4 w-4" />,
    "student_loan": <GraduationCap className="h-4 w-4" />,
    "personal": <Briefcase className="h-4 w-4" />,
    "personal_loan": <Briefcase className="h-4 w-4" />,
    "medical": <Stethoscope className="h-4 w-4" />,
    "other": <CreditCard className="h-4 w-4" />,
  }

  const formatDebtType = (type: string) => {
    return type.replace('_', ' ').replace('-', ' ')
  }
  
  // Function to map UI debt types to database debt types
  const mapUITypeToDBType = (uiType: string | undefined): string => {
    if (!uiType) return 'personal_loan'; // Default to personal_loan if type is undefined
    
    // Map from UI format (with hyphens) to DB format (with underscores)
    const typeMap: Record<string, string> = {
      'credit-card': 'credit_card',
      'auto': 'auto_loan',
      'student': 'student_loan',
      'personal': 'personal_loan',
      'medical': 'medical_debt',
      'mortgage': 'mortgage',
      'other': 'other'
    }
    
    return typeMap[uiType] || 'personal_loan' // Default to personal_loan if type not found
  }

  const handleAddDebt = () => {
    setSelectedDebt(null)
    setOpen(true)
  }

  const handleEditDebt = (debt: UIDebt) => {
    setSelectedDebt(debt)
    setOpen(true)
  }

  const handleDeleteDebt = async (id: string) => {
    try {
      console.log(`handleDeleteDebt: ${id}`)
      setDeleting(id)
      const debtService = new DebtService()
      
      // Set the user ID if available from auth context
      if (user?.id) {
        debtService.setUserId(user.id)
      }
      
      await debtService.deleteDebt(id)
      
      // Remove the debt from context
      removeContextDebt(id)
      
      toast({
        title: "Debt Deleted",
        description: "The debt has been removed from your list.",
      })
      
      // Refresh the debt context
      refreshDebts()
    } catch (error) {
      console.error('Error deleting debt:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete debt",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleSaveDebt = async (debt: UIDebt) => {
    try {
      console.log('handleSaveDebt:', debt)
      const debtService = new DebtService()
      
      // Set the user ID if available from auth context
      if (user?.id) {
        debtService.setUserId(user.id)
      }
      
      // Convert UI debt to DB debt format
      const dbDebt: Partial<DBDebt> = {
        name: debt.name,
        type: mapUITypeToDBType(debt.type),
        current_balance: debt.principal,
        interest_rate: debt.interest_rate,
        minimum_payment: debt.minimum_payment,
        loan_term: debt.term_months || null,
        due_date: debt.due_date || null
      }
      
      if (debt.id && debt.id !== 'new') {
        // Update existing debt
        await debtService.updateDebt(debt.id, dbDebt)
        // Update the debt in context
        updateContextDebt(debt.id, dbDebt)
        toast({
          title: "Debt Updated",
          description: `${debt.name} has been updated successfully.`,
        })
      } else {
        // Create new debt
        const newDebt = await debtService.createDebt(dbDebt)
        console.log('New debt created:', newDebt)
        // Add the new debt to context
        addContextDebt(newDebt)
        toast({
          title: "Debt Added",
          description: `${debt.name} has been added to your debts.`,
        })
      }
      
      // Close the dialog
      setOpen(false)
      
      // Refresh the debt context
      refreshDebts()
    } catch (error) {
      console.error('Error saving debt:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save debt",
        variant: "destructive",
      })
      setOpen(false)
    }
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Debts</CardTitle>
              <CardDescription>Manage and track all your debts in one place</CardDescription>
            </div>
            <div className="flex space-x-2">
              {/* Only show sync button if there are local debts */}
              {debts.some(debt => (debt as any).isLocal) && (
                <Button 
                  onClick={async () => {
                    setLoading(true)
                    try {
                      const debtService = new DebtService()
                      const success = await debtService.forceSync()
                      if (success) {
                        toast({
                          title: "Success",
                          description: "Successfully synced debts to database",
                          variant: "default",
                        })
                        await fetchDebts() // Refresh the debt list
                      } else {
                        toast({
                          title: "Warning",
                          description: "Failed to sync some debts to database",
                          variant: "destructive",
                        })
                      }
                    } catch (error) {
                      console.error('Error syncing debts:', error)
                      toast({
                        title: "Error",
                        description: "Error syncing debts to database",
                        variant: "destructive",
                      })
                    } finally {
                      setLoading(false)
                    }
                  }} 
                  variant="outline"
                >
                  <Loader2 className="mr-2 h-4 w-4" />
                  Sync to DB
                </Button>
              )}
              <Button onClick={handleAddDebt}>
                <Plus className="mr-2 h-4 w-4" />
                Add Debt
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : debts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No debts added yet. Click "Add Debt" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Interest Rate</TableHead>
                  <TableHead>Min. Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="mr-2 rounded-full bg-muted p-1">
                          {debtTypeIcons[debt.type] || <CreditCard className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-medium">{debt.name}</div>
                          <Badge variant="outline" className="mt-1">
                            {formatDebtType(debt.type)}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(debt.principal)}</TableCell>
                    <TableCell>{debt.interest_rate}%</TableCell>
                    <TableCell>{formatCurrency(debt.minimum_payment)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditDebt(debt)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteDebt(debt.id)}
                        disabled={deleting === debt.id}
                      >
                        {deleting === debt.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-3">
          <div className="flex w-full items-center justify-between">
            <div className="text-sm text-muted-foreground">Total Debts: {debts.length}</div>
            <div className="font-medium">
              Total Balance: {formatCurrency(debts.reduce((sum, debt) => sum + debt.principal, 0))}
            </div>
          </div>
        </CardFooter>
      </Card>

      <DebtDialog open={open} onOpenChange={setOpen} debt={selectedDebt} onSave={handleSaveDebt} />
    </>
  )
}
