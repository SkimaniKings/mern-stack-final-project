"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
  const { debts: contextDebts, loading, error, authRequired, refreshDebts, addDebt: addContextDebt, updateDebt: updateContextDebt, removeDebt: removeContextDebt } = useDebtContext()

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
    "auto-loan": <Car className="h-4 w-4" />,
    "student": <GraduationCap className="h-4 w-4" />,
    "student-loan": <GraduationCap className="h-4 w-4" />,
    "personal": <Briefcase className="h-4 w-4" />,
    "personal-loan": <Briefcase className="h-4 w-4" />,
    "medical": <Stethoscope className="h-4 w-4" />
  }

  const formatDebtType = (type: string) => {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  // Function to map UI debt types to database debt types
  const mapUITypeToDBType = (uiType: string | undefined): string => {
    if (!uiType) return 'personal_loan'
    
    // Map from UI format (with hyphens) to DB format (with underscores)
    const typeMapping: Record<string, string> = {
      "credit-card": "credit_card",
      "auto-loan": "auto",
      "student-loan": "student",
      "personal-loan": "personal"
    }
    
    // If the type is in the mapping, return the mapped value
    if (uiType in typeMapping) {
      return typeMapping[uiType]
    }
    
    // Otherwise, replace hyphens with underscores
    return uiType.replace('-', '_')
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
      
      // First remove from context to give immediate UI feedback
      removeContextDebt(id)
      
      // Then delete from database
      await debtService.deleteDebt(id)
      
      toast({
        title: "Debt Deleted",
        description: "The debt has been removed from your list.",
      })
      
      // Refresh the debt context to ensure both components have the latest data
      setTimeout(() => {
        refreshDebts()
      }, 100) // Small delay to ensure state updates are processed
    } catch (error) {
      console.error('Error deleting debt:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete debt",
        variant: "destructive",
      })
      // If there was an error, refresh to restore the deleted debt
      refreshDebts()
    } finally {
      setDeleting(null)
    }
  }

  const handleSaveDebt = async (debt: UIDebt) => {
    try {
      console.log('handleSaveDebt:', debt)
      const debtService = new DebtService()
      
      // Convert UI debt to database debt format
      const dbDebt: Partial<DBDebt> = {
        name: debt.name,
        type: mapUITypeToDBType(debt.type),
        current_balance: debt.principal,
        interest_rate: debt.interest_rate,
        minimum_payment: debt.minimum_payment,
        loan_term: debt.term_months || null,
        due_date: debt.due_date || null
      }
      
      if (debt.id) {
        // Update existing debt
        console.log(`Updating existing debt: ${debt.id}`)
        // First update the context for immediate UI feedback
        updateContextDebt(debt.id, dbDebt)
        
        // Then update the database
        await debtService.updateDebt(debt.id, dbDebt)
        console.log(`Debt updated in database: ${debt.id}`)
        
        toast({
          title: "Debt Updated",
          description: `${debt.name} has been updated successfully.`,
        })
      } else {
        // Create new debt
        console.log('Creating new debt')
        const newDebt = await debtService.createDebt(dbDebt as Omit<DBDebt, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
        console.log(`New debt created in database: ${newDebt.id}`)
        
        // Add the new debt to context
        addContextDebt(newDebt)
        
        toast({
          title: "Debt Added",
          description: `${debt.name} has been added successfully.`,
        })
      }
      
      // Close the dialog
      setOpen(false)
      
      // Refresh debts to ensure we have the latest data
      console.log('Refreshing debts after save')
      setTimeout(() => {
        refreshDebts()
      }, 500) // Add a slight delay to ensure the database operation completes
    } catch (error) {
      console.error('Error in handleSaveDebt:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save debt",
        variant: "destructive",
      })
    }
  }

  // If authentication is required, show a login prompt
  if (authRequired) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="mb-4">Please sign in to access your debts. Debt management requires authentication to ensure your data is secure and accessible across devices.</p>
            <p className="mb-4 text-muted-foreground">
              Your debt information is securely stored and only accessible to you when signed in. 
              This ensures your financial data remains private and protected.
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => router.push('/login')}>
                Sign In
              </Button>
              <Button variant="outline" onClick={() => router.push('/register')}>
                Create Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">My Debts</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track and manage all your debts in one place.
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleAddDebt}>
              <Plus className="mr-2 h-4 w-4" />
              Add Debt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
