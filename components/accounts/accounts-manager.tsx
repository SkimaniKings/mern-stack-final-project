"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils/formatting"
import { useToast } from "@/hooks/use-toast"
import { createAccount, updateAccount, deleteAccount } from "@/app/actions/accounts"
import { CURRENCIES } from "@/lib/currencies"
import { Plus, Edit, Trash2, Loader2, Search, CreditCard, Wallet, Building, PiggyBank, DollarSign, ArrowUpDown, Filter, RefreshCw, ExternalLink, BarChart, Eye } from "lucide-react"

// Define account types for better type safety
type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'cash' | 'other';
type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'INR' | 'BRL';

interface Account {
  id: string
  name: string
  account_type: AccountType | string // Using union type to support both predefined types and custom types
  balance: number
  currency: CurrencyCode | string // Using union type to support both predefined currencies and custom ones
  is_active: boolean
  is_primary: boolean
  institution?: string
  account_number?: string
  notes?: string
  color?: string
  icon?: string
  created_at: string
  updated_at: string
  // Cash flow data from the view
  total_inflow?: number
  total_outflow?: number
  net_cash_position?: number
  // Track transaction counts for quick summary (optional)
  transaction_count?: number
  // Track last transaction date (optional)
  last_transaction_date?: string
}

interface AccountsManagerProps {
  initialAccounts: Account[]
}

interface AccountFormData {
  name: string
  account_type: string
  balance: string
  currency: string
  institution: string
  account_number: string
  is_active: boolean
  is_primary: boolean
  notes: string
}

interface AccountSummary {
  totalBalance: number
  accountCount: number
  activeAccountCount: number
  currencyBreakdown: Record<string, number>
  typeBreakdown: Record<string, number>
}

export function AccountsManager({ initialAccounts }: AccountsManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [sortField, setSortField] = useState<'name' | 'balance' | 'type' | 'created_at'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [currentView, setCurrentView] = useState<'grid' | 'table'>('grid')

  // Form state
  const [formData, setFormData] = useState<AccountFormData>({
    name: "",
    account_type: "checking",
    balance: "0.00",
    currency: "USD",
    institution: "",
    account_number: "",
    is_active: true,
    is_primary: false,
    notes: "",
  })

  // Calculate account summary statistics
  const accountSummary = useMemo<AccountSummary>(() => {
    const summary: AccountSummary = {
      totalBalance: 0,
      accountCount: accounts.length,
      activeAccountCount: 0,
      currencyBreakdown: {},
      typeBreakdown: {}
    };
    
    accounts.forEach(account => {
      // Only include active accounts in financial calculations
      if (account.is_active) {
        summary.totalBalance += account.balance;
        summary.activeAccountCount++;
        
        // Add to currency breakdown
        if (!summary.currencyBreakdown[account.currency]) {
          summary.currencyBreakdown[account.currency] = 0;
        }
        summary.currencyBreakdown[account.currency] += account.balance;
        
        // Add to type breakdown
        if (!summary.typeBreakdown[account.account_type]) {
          summary.typeBreakdown[account.account_type] = 0;
        }
        summary.typeBreakdown[account.account_type] += account.balance;
      }
    });
    
    return summary;
  }, [accounts]);
  
  // Filter and sort accounts based on search term, filters, and sort options
  const filteredAndSortedAccounts = useMemo(() => {
    // First, filter the accounts
    let result = accounts.filter((account) => {
      // Apply search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          account.name.toLowerCase().includes(searchLower) ||
          account.account_type.toLowerCase().includes(searchLower) ||
          (account.institution && account.institution.toLowerCase().includes(searchLower));
          
        if (!matchesSearch) return false;
      }
      
      // Apply account type filter
      if (filterType && account.account_type !== filterType) {
        return false;
      }
      
      // Apply active status filter
      if (filterActive !== null && account.is_active !== filterActive) {
        return false;
      }
      
      return true;
    });
    
    // Then, sort the filtered accounts
    return result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'balance':
          comparison = a.balance - b.balance;
          break;
        case 'type':
          comparison = a.account_type.localeCompare(b.account_type);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [accounts, searchTerm, filterType, filterActive, sortField, sortDirection]);

  // Reset form data and validation errors
  const resetFormData = () => {
    setFormData({
      name: "",
      account_type: "checking",
      balance: "0.00",
      currency: "USD",
      institution: "",
      account_number: "",
      is_active: true,
      is_primary: false,
      notes: "",
    });
    setValidationErrors({});
  }
  
  // Refresh accounts data
  const refreshAccounts = useCallback(async () => {
    try {
      setIsRefreshing(true);
      // In a real implementation, this would fetch fresh data from the server
      // For now, we'll just simulate a refresh delay
      await new Promise(resolve => setTimeout(resolve, 800));
      toast({
        title: "Accounts refreshed",
        description: "Your account data has been updated.",
      });
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh account data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

  // Open edit dialog
  const openEditDialog = (account: Account) => {
    setCurrentAccount(account)
    setFormData({
      name: account.name,
      account_type: account.account_type,
      balance: account.balance.toString(),
      currency: account.currency,
      institution: account.institution || "",
      account_number: account.account_number || "",
      is_active: account.is_active,
      is_primary: account.is_primary,
      notes: account.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (account: Account) => {
    setCurrentAccount(account)
    setIsDeleteDialogOpen(true)
  }

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setFormData({ ...formData, [name]: checked })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
  }

  // Handle checkbox change
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData({ ...formData, [name]: checked })
  }

  // Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Required fields
    if (!formData.name.trim()) {
      errors.name = "Account name is required";
    } else if (formData.name.length > 50) {
      errors.name = "Account name must be less than 50 characters";
    }
    
    // Balance validation
    const balanceNum = Number(formData.balance);
    if (isNaN(balanceNum)) {
      errors.balance = "Balance must be a valid number";
    }
    
    // Account number validation (if provided)
    if (formData.account_number && !/^\d{1,4}$/.test(formData.account_number)) {
      errors.account_number = "Please enter up to 4 digits only";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Create account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data before submission
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const formDataObj = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        formDataObj.append(key, String(value));
      });

      const newAccount = await createAccount(formDataObj);

      setAccounts([...accounts, newAccount]);
      setIsCreateDialogOpen(false);
      resetFormData();

      toast({
        title: "Account created",
        description: "Your account has been added successfully.",
      });
      
      // Refresh the account list to ensure we have the latest data
      await refreshAccounts();
    } catch (error) {
      console.error("Error creating account:", error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes("duplicate")) {
          toast({
            title: "Duplicate Account",
            description: "An account with this name already exists.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to create account. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Update account
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentAccount) return;
    
    // Validate form data before submission
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const formDataObj = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        formDataObj.append(key, String(value));
      });

      const updatedAccount = await updateAccount(currentAccount.id, formDataObj);

      // Update the accounts array with the updated account
      setAccounts(
        accounts.map((account) => (account.id === currentAccount.id ? updatedAccount : account))
      );
      
      setIsEditDialogOpen(false);
      setCurrentAccount(null);
      resetFormData();

      toast({
        title: "Account updated",
        description: "Your account has been updated successfully.",
      });
      
      // Refresh accounts to ensure we have the latest data
      await refreshAccounts();
    } catch (error) {
      console.error("Error updating account:", error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes("duplicate")) {
          toast({
            title: "Duplicate Account",
            description: "An account with this name already exists.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to update account. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (!currentAccount) return

    setIsLoading(true)

    try {
      await deleteAccount(currentAccount.id)

      setAccounts(accounts.filter((account) => account.id !== currentAccount.id))
      setIsDeleteDialogOpen(false)
      setCurrentAccount(null)

      toast({
        title: "Account deleted",
        description: "Your account has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  // Get account icon
  const getAccountIcon = (type: string) => {
    switch (type) {
      case "checking":
        return <CreditCard className="h-4 w-4" />
      case "savings":
        return <PiggyBank className="h-4 w-4" />
      case "credit_card":
        return <CreditCard className="h-4 w-4" />
      case "investment":
        return <DollarSign className="h-4 w-4" />
      case "loan":
        return <Building className="h-4 w-4" />
      case "cash":
        return <Wallet className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  // Format account type
  const formatAccountType = (type: string | null | undefined) => {
    if (!type) return "Unknown"
    return type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="space-y-6">
      {/* Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountSummary.totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {accountSummary.activeAccountCount} active accounts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Account Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(accountSummary.typeBreakdown).length}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.keys(accountSummary.typeBreakdown).map(type => (
                <Badge key={type} variant="outline" className="capitalize">
                  {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(accountSummary.currencyBreakdown).length}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.keys(accountSummary.currencyBreakdown).map(currency => (
                <Badge key={currency} variant="secondary" className="font-mono">
                  {currency}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Accounts Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Manage your financial accounts</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={refreshAccounts} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search accounts..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={filterType || "all"} onValueChange={(value) => setFilterType(value === "all" ? null : value)}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Account Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
                <SelectItem value="loan">Loan</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filterActive === null ? "all" : filterActive ? "active" : "inactive"}
              onValueChange={(value) => {
                if (value === "all") setFilterActive(null);
                else setFilterActive(value === "active");
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              }}
              className="relative"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle sort direction</span>
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchTerm || filterType || filterActive !== null
                      ? "No matching accounts found."
                      : "No accounts found. Add your first account to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedAccounts.map((account: Account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary"
                        >
                          {getAccountIcon(account.account_type)}
                        </div>
                        {account.name}
                      </div>
                    </TableCell>
                    <TableCell>{formatAccountType(account.account_type)}</TableCell>
                    <TableCell>{account.institution || "-"}</TableCell>
                    <TableCell>{formatCurrency(account.balance, account.currency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant={account.is_active ? "default" : "outline"} className="text-xs">
                          {account.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {account.is_primary && (
                          <Badge variant="secondary" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(account)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(account)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedAccounts.length} {filteredAndSortedAccounts.length === 1 ? "account" : "accounts"} {searchTerm || filterType || filterActive !== null ? "(filtered)" : ""}
        </div>
      </CardFooter>

      {/* Create Account Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] h-auto max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>Enter the details of your financial account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="flex flex-col h-full overflow-hidden">
            <div className="grid gap-4 py-4 overflow-y-auto pr-4 flex-grow max-h-[calc(90vh-10rem)] scrollbar-thin scrollbar-thumb-rounded scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Account Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Checking Account"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="account_type">
                  Account Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.account_type} onValueChange={(value) => handleSelectChange("account_type", value)}>
                  <SelectTrigger id="account_type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="balance">
                  Current Balance <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.balance}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => handleSelectChange("currency", value)}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="institution">Financial Institution</Label>
                <Input
                  id="institution"
                  name="institution"
                  placeholder="e.g., Bank of America"
                  value={formData.institution}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="account_number">Last 4 Digits (optional)</Label>
                <Input
                  id="account_number"
                  name="account_number"
                  placeholder="e.g., 1234"
                  maxLength={4}
                  value={formData.account_number}
                  onChange={handleInputChange}
                  className={validationErrors.account_number ? "border-red-500" : ""}
                />
                {validationErrors.account_number && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.account_number}</p>
                )}
              </div>



              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Add any additional notes about this account"
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleCheckboxChange("is_active", checked === true)}
                />
                <Label htmlFor="is_active">Active Account</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_primary"
                  checked={formData.is_primary}
                  onCheckedChange={(checked) => handleCheckboxChange("is_primary", checked === true)}
                />
                <Label htmlFor="is_primary">Primary Account</Label>
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 py-2 mt-2 border-t sticky bottom-0 bg-background z-10">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  resetFormData()
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] h-auto max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update the details of your financial account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateAccount} className="flex flex-col h-full overflow-hidden">
            <div className="grid gap-4 py-4 overflow-y-auto pr-4 flex-grow max-h-[calc(90vh-10rem)] scrollbar-thin scrollbar-thumb-rounded scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Account Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  placeholder="e.g., Checking Account"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={validationErrors.name ? "border-red-500" : ""}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-account_type">
                  Account Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.account_type} onValueChange={(value) => handleSelectChange("account_type", value)}>
                  <SelectTrigger id="edit-account_type" className={validationErrors.account_type ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.account_type && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.account_type}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-balance">Current Balance</Label>
                <Input
                  id="edit-balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.balance}
                  onChange={handleInputChange}
                  required
                  className={validationErrors.balance ? "border-red-500" : ""}
                />
                {validationErrors.balance && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.balance}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => handleSelectChange("currency", value)}>
                  <SelectTrigger id="edit-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-institution">Financial Institution</Label>
                <Input
                  id="edit-institution"
                  name="institution"
                  placeholder="e.g., Bank of America"
                  value={formData.institution}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-account_number">Last 4 Digits (optional)</Label>
                <Input
                  id="edit-account_number"
                  name="account_number"
                  placeholder="e.g., 1234"
                  maxLength={4}
                  value={formData.account_number}
                  onChange={handleInputChange}
                  className={validationErrors.account_number ? "border-red-500" : ""}
                />
                {validationErrors.account_number && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.account_number}</p>
                )}
              </div>



              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  name="notes"
                  placeholder="Add any additional notes about this account"
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleCheckboxChange("is_active", checked === true)}
                />
                <Label htmlFor="edit-is_active">Active Account</Label>
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 py-2 mt-2 border-t sticky bottom-0 bg-background z-10">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setCurrentAccount(null)
                  resetFormData()
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account
              {currentAccount && <strong> "{currentAccount.name}"</strong>} and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  </div>
)
}
