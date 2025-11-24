"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/investments/calculations"
import type { Investment } from "@/lib/investments/calculations"
import { Pencil, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"

interface PortfolioInvestmentTableProps {
  investments: Investment[]
  onInvestmentUpdated?: () => void
  onInvestmentDeleted?: () => void
}

export function PortfolioInvestmentTable({ investments, onInvestmentUpdated, onInvestmentDeleted }: PortfolioInvestmentTableProps) {
  // State for edit and delete dialogs
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null)
  const [assetClasses, setAssetClasses] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // State for calculated fields
  const [calculatedValue, setCalculatedValue] = useState<number>(0)
  const [calculatedCostBasis, setCalculatedCostBasis] = useState<number>(0)
  
  // Predefined account types
  const accountTypes = ["Default", "401k", "IRA", "Taxable", "HSA", "Brokerage", "Roth IRA"]
  
  // Currencies
  const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]
  
  // Helper function to format date as YYYY-MM-DD for input[type="date"]
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  }
  
  // Get today's date formatted for the date input
  const today = formatDateForInput(new Date());
  
  // Calculate value and cost basis when editing investment is set
  useEffect(() => {
    if (editingInvestment) {
      const quantity = editingInvestment.shares || 0;
      const initialPrice = editingInvestment.initialPrice || 0;
      const currentPrice = editingInvestment.currentPrice || 0;
      
      setCalculatedCostBasis(quantity * initialPrice);
      setCalculatedValue(quantity * currentPrice);
    }
  }, [editingInvestment]);

  // Fetch asset classes when component mounts
  useEffect(() => {
    const fetchAssetClasses = async () => {
      try {
        const defaultClasses = [
          "Stocks", 
          "Bonds", 
          "Cash", 
          "Alternative",
          "Shares",
          "Bills",
          "Crypto",
          "Real Estate"
        ];
        const { getAssetClasses } = await import("@/app/actions/investments");
        const classes = await getAssetClasses();
        let validClasses: string[] = [];
        if (classes && Array.isArray(classes)) {
          validClasses = classes.filter(c => typeof c === 'string');
        }
        
        // If we got valid classes from the server, use those, otherwise use defaults
        if (validClasses.length > 0) {
          setAssetClasses(validClasses);
        } else {
          setAssetClasses(defaultClasses);
        }
      } catch (error) {
        console.error("Failed to fetch asset classes:", error);
        // Fallback to default asset classes
        setAssetClasses([
          "Stocks", 
          "Bonds", 
          "Cash", 
          "Alternative",
          "Shares",
          "Bills",
          "Crypto",
          "Real Estate"
        ]);
      }
    };
    
    fetchAssetClasses();
  }, []);
  
  // Sort investments by value (highest first)
  const sortedInvestments = [...investments].sort((a, b) => b.value - a.value)

  // Calculate total value
  const totalValue = sortedInvestments.reduce((sum, inv) => sum + inv.value, 0)

  // Format investment type for display
  function formatInvestmentType(type: string | undefined): string {
    if (!type) return "Unknown"
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Format tax location for display
  function formatTaxLocation(location: string | undefined): string {
    if (!location) return "Unknown"
    switch (location) {
      case "taxable":
        return "Taxable"
      case "tax_deferred":
        return "Tax-Deferred"
      case "tax_free":
        return "Tax-Free"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="space-y-4">
      {investments.length === 0 ? (
        <div className="text-center p-4 border rounded-lg">
          <p className="text-muted-foreground">No investments found.</p>
          <p className="text-sm">Add investments to see them here.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investment</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Allocation</TableHead>
              <TableHead>Cost Basis</TableHead>
              <TableHead>Gain/Loss</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInvestments.map((investment) => {
              const gainLoss = investment.value - (investment.costBasis || 0)
              const gainLossPercent = investment.costBasis ? (gainLoss / investment.costBasis) * 100 : 0
              const allocation = (investment.value / totalValue) * 100

              return (
                <TableRow key={investment.id}>
                  <TableCell className="font-medium">
                    {investment.name}
                    {investment.ticker && <span className="text-muted-foreground ml-1">({investment.ticker})</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {formatInvestmentType(investment.assetClass)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(investment.value)}</TableCell>
                  <TableCell>{allocation.toFixed(1)}%</TableCell>
                  <TableCell>{formatCurrency(investment.costBasis || 0)}</TableCell>
                  <TableCell className={gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(gainLoss)} ({gainLossPercent.toFixed(1)}%)
                  </TableCell>
                  <TableCell>{investment.account || "Default"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingInvestment(investment)}
                        title="Edit investment"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingInvestment(investment)}
                        title="Delete investment"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      
      {/* Edit Investment Dialog */}
      {editingInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-hidden">
          <div className="bg-card p-6 rounded-lg shadow-xl max-w-md w-full border border-border max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-card-foreground">Edit Investment</h2>
              <Button variant="ghost" size="icon" onClick={() => setEditingInvestment(null)} className="h-8 w-8 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </Button>
            </div>
            <div className="border-t border-border mb-4"></div>
            <form className="flex flex-col flex-1 overflow-hidden" onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              try {
                const formData = new FormData(e.currentTarget);
                const { updateInvestment } = await import("@/app/actions/investment-actions");
                
                // Only include fields that exist in the database schema to avoid errors
                const result = await updateInvestment({
                  id: editingInvestment.id,
                  name: formData.get('name') as string,
                  ticker: formData.get('ticker') as string,
                  type: formData.get('assetClass') as string,
                  value: parseFloat(formData.get('value') as string),
                  cost_basis: parseFloat(formData.get('costBasis') as string),
                  quantity: parseFloat(formData.get('quantity') as string) || undefined,
                  initial_price: parseFloat(formData.get('initialPrice') as string) || undefined,
                  current_price: parseFloat(formData.get('currentPrice') as string) || undefined,
                  purchase_date: formData.get('purchaseDate') as string || undefined,
                  // Removed account field as it doesn't exist in the database schema
                  currency: formData.get('currency') as string || undefined,
                });
                
                if (result.success) {
                  setEditingInvestment(null);
                  if (onInvestmentUpdated) onInvestmentUpdated();
                } else {
                  alert(`Error updating investment: ${result.error}`);
                }
              } catch (error) {
                console.error("Error updating investment:", error);
                alert("An unexpected error occurred while updating the investment.");
              } finally {
                setIsLoading(false);
              }
            }}>
              <div className="overflow-y-auto pr-2 flex-1 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-card-foreground">Name</label>
                <input 
                  type="text" 
                  name="name"
                  className="w-full p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input" 
                  defaultValue={editingInvestment.name} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-card-foreground">Ticker Symbol</label>
                <input 
                  type="text" 
                  name="ticker"
                  className="w-full p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input" 
                  defaultValue={editingInvestment.ticker || ''} 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-card-foreground">Asset Class</label>
                <select name="assetClass" className="w-full p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input" defaultValue={editingInvestment.assetClass}>
                  <option value="Stocks">Stocks</option>
                  <option value="Bonds">Bonds</option>
                  <option value="Cash">Cash</option>
                  <option value="Alternative">Alternative</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-card-foreground">Quantity</label>
                <input 
                  type="number" 
                  name="quantity"
                  className="w-full p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input" 
                  defaultValue={editingInvestment.shares || 0} 
                  min="0" 
                  step="0.01" 
                  onChange={(e) => {
                    const quantity = parseFloat(e.target.value) || 0;
                    const initialPrice = parseFloat((document.querySelector('input[name="initialPrice"]') as HTMLInputElement)?.value) || 0;
                    const currentPrice = parseFloat((document.querySelector('input[name="currentPrice"]') as HTMLInputElement)?.value) || 0;
                    
                    // Calculate cost basis and value
                    const costBasis = quantity * initialPrice;
                    const value = quantity * currentPrice;
                    
                    setCalculatedCostBasis(costBasis);
                    setCalculatedValue(value);
                    
                    // Update the cost basis and value fields
                    const costBasisInput = document.querySelector('input[name="costBasis"]') as HTMLInputElement;
                    const valueInput = document.querySelector('input[name="value"]') as HTMLInputElement;
                    if (costBasisInput) costBasisInput.value = costBasis.toString();
                    if (valueInput) valueInput.value = value.toString();
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-card-foreground">Initial Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    type="number" 
                    name="initialPrice"
                    className="w-full p-2 pl-7 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input" 
                    defaultValue={editingInvestment.initialPrice || 0} 
                    min="0" 
                    step="0.01" 
                    onChange={(e) => {
                      const initialPrice = parseFloat(e.target.value) || 0;
                      const quantity = parseFloat((document.querySelector('input[name="quantity"]') as HTMLInputElement)?.value) || 0;
                      
                      // Calculate cost basis
                      const costBasis = quantity * initialPrice;
                      setCalculatedCostBasis(costBasis);
                      
                      // Update the cost basis field
                      const costBasisInput = document.querySelector('input[name="costBasis"]') as HTMLInputElement;
                      if (costBasisInput) costBasisInput.value = costBasis.toString();
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-card-foreground">Current Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    type="number" 
                    name="currentPrice"
                    className="w-full p-2 pl-7 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input" 
                    defaultValue={editingInvestment.currentPrice || 0} 
                    min="0" 
                    step="0.01" 
                    onChange={(e) => {
                      const currentPrice = parseFloat(e.target.value) || 0;
                      const quantity = parseFloat((document.querySelector('input[name="quantity"]') as HTMLInputElement)?.value) || 0;
                      
                      // Calculate value
                      const value = quantity * currentPrice;
                      setCalculatedValue(value);
                      
                      // Update the value field
                      const valueInput = document.querySelector('input[name="value"]') as HTMLInputElement;
                      if (valueInput) valueInput.value = value.toString();
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-card-foreground">Current Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    type="number" 
                    name="value"
                    className="w-full p-2 pl-7 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input" 
                    value={calculatedValue || editingInvestment.value || 0}
                    readOnly
                    required 
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                    Auto-calculated
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-card-foreground">Cost Basis</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    type="number" 
                    name="costBasis"
                    className="w-full p-2 pl-7 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input" 
                    value={calculatedCostBasis || editingInvestment.costBasis || 0}
                    readOnly
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                    Auto-calculated
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-card-foreground">Account</label>
                <select 
                  name="account" 
                  className="w-full p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                  defaultValue={editingInvestment.account || "Default"}
                >
                  {accountTypes.map((account) => (
                    <option key={account} value={account}>
                      {account}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-card-foreground">Currency</label>
                <select 
                  name="currency" 
                  className="w-full p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                  defaultValue={editingInvestment.currency || "USD"}
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-card-foreground">Purchase Date</label>
                <input 
                  type="date" 
                  name="purchaseDate"
                  className="w-full p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input" 
                  defaultValue={today} 
                />  
              </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 mt-4 border-t border-border sticky bottom-0 bg-card">
                <Button variant="outline" onClick={() => setEditingInvestment(null)} disabled={isLoading}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Investment Dialog */}
      {deletingInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-hidden">
          <div className="bg-card p-6 rounded-lg shadow-xl max-w-md w-full border border-border max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-card-foreground">Delete Investment</h2>
              <Button variant="ghost" size="icon" onClick={() => setDeletingInvestment(null)} className="h-8 w-8 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </Button>
            </div>
            <div className="border-t border-border mb-4"></div>
            <div className="text-card-foreground mb-6">
              <div className="flex items-center gap-3 mb-4 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <p>Are you sure you want to delete <strong>{deletingInvestment.name}</strong>? This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDeletingInvestment(null)} disabled={isLoading}>Cancel</Button>
              <Button 
                variant="destructive" 
                disabled={isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const { deleteInvestment } = await import("@/app/actions/investment-actions");
                    const result = await deleteInvestment(deletingInvestment.id);
                    
                    if (result.success) {
                      setDeletingInvestment(null);
                      if (onInvestmentDeleted) onInvestmentDeleted();
                    } else {
                      alert(`Error deleting investment: ${result.error}`);
                    }
                  } catch (error) {
                    console.error("Error deleting investment:", error);
                    alert("An unexpected error occurred while deleting the investment.");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

