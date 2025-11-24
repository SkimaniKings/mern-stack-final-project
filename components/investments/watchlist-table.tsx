"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, Bell, Edit, MoreHorizontal, Plus, Trash, TrendingUp, TrendingDown, AlertTriangle, Clock, ExternalLink } from "lucide-react"
import { updateWatchlistItem, removeFromWatchlist } from "@/app/actions/watchlist"
import { toast } from "sonner"
import { WatchlistItem } from "@/app/(protected)/investments/watchlist/watchlist-content"

// Using the imported WatchlistItem type instead of redefining it here

type WatchlistTableProps = {
  items: WatchlistItem[]
  onAddNew: () => void
}

const SECTORS = [
  'Basic Materials',
  'Communication Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Energy',
  'Financial Services',
  'Healthcare',
  'Industrials',
  'Real Estate',
  'Technology',
  'Utilities',
]

export function WatchlistTable({ items = [], onAddNew }: WatchlistTableProps) {
  // Ensure items is always an array
  const watchlistItems = Array.isArray(items) ? items : []
  
  const [sortColumn, setSortColumn] = useState<keyof WatchlistItem>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  
  // Handle sorting
  const handleSort = (column: keyof WatchlistItem) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }
  
  // Sort items
  const sortedItems = [...watchlistItems].sort((a, b) => {
    const aValue = a[sortColumn] as string | number | null | undefined
    const bValue = b[sortColumn] as string | number | null | undefined
    
    if (aValue === null || aValue === undefined) return sortDirection === "asc" ? -1 : 1
    if (bValue === null || bValue === undefined) return sortDirection === "asc" ? 1 : -1
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue)
    }
    
    // For numbers and other types
    return sortDirection === "asc" 
      ? (aValue < bValue ? -1 : 1) 
      : (bValue < aValue ? -1 : 1)
  })
  
  // Handle edit
  const handleEdit = (item: WatchlistItem) => {
    setSelectedItem(item)
    setEditDialogOpen(true)
  }
  
  // Handle delete
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this item from your watchlist?")) {
      const result = await removeFromWatchlist(id)
      if (result.success) {
        toast.success("Item removed from watchlist")
      } else {
        toast.error("Failed to remove item: " + (result.error || "Unknown error"))
      }
    }
  }
  
  // Handle update
  const handleUpdate = async (formData: FormData) => {
    const result = await updateWatchlistItem(formData)
    if (result.success) {
      toast.success("Watchlist item updated")
      setEditDialogOpen(false)
    } else {
      toast.error("Failed to update: " + (result.error || "Unknown error"))
    }
  }
  
  // Calculate price difference from target
  const getPriceDifference = (current: number | null | undefined, target: number | null | undefined) => {
    // Return null if either value is null, undefined, or not a valid number
    if (target === null || target === undefined || current === null || current === undefined) return null
    if (isNaN(target) || isNaN(current) || current === 0) return null
    
    // Calculate the percentage difference
    const diff = ((target - current) / current) * 100
    
    // Make sure diff is a valid number before calling toFixed
    return !isNaN(diff) ? diff.toFixed(2) : null
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Watchlist</h2>
        <Button onClick={onAddNew} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Investment
        </Button>
      </div>
      
      {watchlistItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Your watchlist is empty</h3>
            <p className="text-muted-foreground mb-4">
              Add investments to track their performance and set price alerts
            </p>
            <Button onClick={onAddNew}>
              <Plus className="h-4 w-4 mr-2" /> Add Your First Investment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] cursor-pointer" onClick={() => handleSort("ticker")}>
                  <div className="flex items-center">
                    Ticker
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                  <div className="flex items-center">
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("price")}>
                  <div className="flex items-center">
                    Current Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("price_change_percent")}>
                  <div className="flex items-center">
                    Change %
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("target_price")}>
                  <div className="flex items-center">
                    Target Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("sector")}>
                  <div className="flex items-center">
                    Sector
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => {
                const priceDiff = getPriceDifference(item.price, item.target_price)
                const isAlertActive = item.price_alerts && item.alert_threshold !== null
                const isAlertTriggered = isAlertActive && item.price >= (item.alert_threshold || 0)
                const hasReachedTarget = item.target_price !== null && item.price >= item.target_price
                
                // Format the price change percentage
                const priceChangePercent = item.price_change_percent !== undefined && item.price_change_percent !== null && !isNaN(item.price_change_percent)
                  ? Number(item.price_change_percent).toFixed(2) 
                  : null
                
                // Determine if the stock is up or down for the day
                const isUp = item.price_change_percent !== undefined && item.price_change_percent > 0
                const isDown = item.price_change_percent !== undefined && item.price_change_percent < 0
                
                return (
                  <TableRow key={item.id} className={isAlertTriggered ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-1">
                        <span>{item.ticker}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a 
                                href={`https://finance.yahoo.com/quote/${item.ticker}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View on Yahoo Finance</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{item.name}</span>
                        {item.last_updated && (
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(item.last_updated).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-medium">${item.price.toFixed(2)}</span>
                        {item.previous_close && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="ml-2 px-1">
                                  <span className="text-xs">Prev: ${item.previous_close.toFixed(2)}</span>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Previous close price</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {priceChangePercent !== null ? (
                        <div className="flex items-center">
                          <span className={`font-medium ${isUp ? 'text-green-500' : isDown ? 'text-red-500' : ''}`}>
                            {isUp ? '+' : ''}{priceChangePercent}%
                          </span>
                          {isUp ? (
                            <TrendingUp className="ml-1 h-4 w-4 text-green-500" />
                          ) : isDown ? (
                            <TrendingDown className="ml-1 h-4 w-4 text-red-500" />
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.target_price ? (
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <span className={hasReachedTarget ? 'text-green-500 font-medium' : ''}>
                              ${item.target_price.toFixed(2)}
                            </span>
                            {hasReachedTarget && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <TrendingUp className="ml-1 h-4 w-4 text-green-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Target price reached!</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          {priceDiff && (
                            <span className={`text-xs ${parseFloat(priceDiff) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {parseFloat(priceDiff) > 0 ? '+' : ''}{priceDiff}% from current
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.sector ? (
                        <Badge variant="outline">{item.sector}</Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-2">
                        {isAlertActive && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {isAlertTriggered ? (
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Bell className="h-4 w-4 text-muted-foreground" />
                                )}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {isAlertTriggered 
                                    ? `Alert triggered! Price is above $${item.alert_threshold?.toFixed(2)}` 
                                    : `Alert set at $${item.alert_threshold?.toFixed(2)}`}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(item.id)}>
                              <Trash className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <a 
                                href={`https://finance.yahoo.com/quote/${item.ticker}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center cursor-pointer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Details
                              </a>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Watchlist Item</DialogTitle>
            <DialogDescription>
              Update details for {selectedItem?.ticker} - {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <form action={handleUpdate} className="overflow-y-auto pr-2">
            <input type="hidden" name="id" value={selectedItem?.id} />
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ticker" className="text-right">
                  Ticker
                </Label>
                <Input
                  id="ticker"
                  name="ticker"
                  defaultValue={selectedItem?.ticker}
                  readOnly
                  className="uppercase col-span-1"
                />
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={selectedItem?.name}
                  readOnly
                  className="col-span-1"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Current Price
                </Label>
                <div className="col-span-1">
                  <div className="flex items-center">
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={selectedItem?.price}
                      readOnly
                    />
                  </div>
                  {selectedItem?.previous_close && (
                    <div className="mt-1 text-xs text-muted-foreground flex items-center">
                      <span>Prev: ${selectedItem.previous_close.toFixed(2)}</span>
                      {selectedItem.price_change_percent !== undefined && (
                        <span className={`ml-2 ${selectedItem.price_change_percent > 0 ? 'text-green-500' : selectedItem.price_change_percent < 0 ? 'text-red-500' : ''}`}>
                          {selectedItem.price_change_percent > 0 ? '+' : ''}{selectedItem.price_change_percent.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Label htmlFor="targetPrice" className="text-right">
                  Target Price
                </Label>
                <div className="col-span-1">
                  <Input
                    id="targetPrice"
                    name="targetPrice"
                    type="number"
                    step="0.01"
                    defaultValue={selectedItem?.target_price || ''}
                    placeholder="Set a target price"
                  />
                  {selectedItem?.price && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {selectedItem.target_price ? (
                        <span>
                          {((selectedItem.target_price - selectedItem.price) / selectedItem.price * 100).toFixed(2)}% from current
                        </span>
                      ) : (
                        <span>Set a price target to track performance</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sector" className="text-right">
                  Sector
                </Label>
                <Select 
                  name="sector" 
                  defaultValue={selectedItem?.sector || ''}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={selectedItem?.notes || ''}
                  placeholder="Add your notes about this investment"
                  className="col-span-3"
                />
              </div>
              
              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-medium mb-3">Price Alert Settings</h3>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="priceAlertEnabled" className="text-right">
                    Price Alerts
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch
                      id="priceAlertEnabled"
                      name="priceAlertEnabled"
                      defaultChecked={selectedItem?.price_alerts}
                    />
                    <Label htmlFor="priceAlertEnabled">
                      Enable price alerts
                    </Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4 mt-2">
                  <Label htmlFor="alertThreshold" className="text-right">
                    Alert Threshold
                  </Label>
                  <div className="col-span-3 space-y-2">
                    <Input
                      id="alertThreshold"
                      name="alertThreshold"
                      type="number"
                      step="0.01"
                      defaultValue={selectedItem?.alert_threshold || ''}
                      placeholder="Price threshold for alerts"
                      disabled={!selectedItem?.price_alerts}
                    />
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm text-muted-foreground">
                        You'll be notified when the price reaches this threshold.
                      </p>
                      
                      {selectedItem?.price && selectedItem?.alert_threshold && (
                        <div className="text-sm">
                          <span className={`${selectedItem.alert_threshold > selectedItem.price ? 'text-amber-500' : 'text-green-500'}`}>
                            {selectedItem.alert_threshold > selectedItem.price ? (
                              <>
                                <AlertTriangle className="inline h-3 w-3 mr-1" />
                                {((selectedItem.alert_threshold - selectedItem.price) / selectedItem.price * 100).toFixed(2)}% above current price
                              </>
                            ) : (
                              <>
                                <Bell className="inline h-3 w-3 mr-1" />
                                Alert will trigger immediately (price is already above threshold)
                              </>
                            )}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex space-x-2 mt-1">
                        {selectedItem?.price && (
                          <>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => {
                                const input = document.getElementById('alertThreshold') as HTMLInputElement
                                if (input) input.value = (selectedItem.price * 1.05).toFixed(2)
                              }}
                            >
                              +5%
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => {
                                const input = document.getElementById('alertThreshold') as HTMLInputElement
                                if (input) input.value = (selectedItem.price * 1.1).toFixed(2)
                              }}
                            >
                              +10%
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => {
                                const input = document.getElementById('alertThreshold') as HTMLInputElement
                                if (input) input.value = (selectedItem.price * 1.2).toFixed(2)
                              }}
                            >
                              +20%
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
