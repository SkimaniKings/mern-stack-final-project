"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ReceiptIcon, SearchIcon, CalendarIcon, DownloadIcon, TrashIcon, AlertTriangleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Receipt, Transaction } from "@/types/finance"

type ReceiptWithTransaction = Receipt & {
  transactions: Transaction
}

type ReceiptManagerProps = {
  receipts: ReceiptWithTransaction[]
}

export function ReceiptManager({ receipts }: ReceiptManagerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptWithTransaction | null>(null)
  const [viewMode, setViewMode] = useState("grid")

  // Filter receipts based on search term
  const filteredReceipts = receipts.filter((receipt) => {
    const transaction = receipt.transactions
    const searchLower = searchTerm.toLowerCase()

    return (
      transaction.description.toLowerCase().includes(searchLower) ||
      transaction.merchant_name?.toLowerCase().includes(searchLower) ||
      receipt.ocr_text?.toLowerCase().includes(searchLower)
    )
  })

  // Group receipts by month
  const receiptsByMonth = filteredReceipts.reduce(
    (acc, receipt) => {
      const date = new Date(receipt.transactions.date)
      const monthYear = format(date, "MMMM yyyy")

      if (!acc[monthYear]) {
        acc[monthYear] = []
      }

      acc[monthYear].push(receipt)
      return acc
    },
    {} as Record<string, ReceiptWithTransaction[]>,
  )

  // Sort months in reverse chronological order
  const sortedMonths = Object.keys(receiptsByMonth).sort((a, b) => {
    const dateA = new Date(a)
    const dateB = new Date(b)
    return dateB.getTime() - dateA.getTime()
  })

  // Handle receipt click
  const handleReceiptClick = (receipt: ReceiptWithTransaction) => {
    setSelectedReceipt(receipt)
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Receipt Vault</CardTitle>
          <CardDescription>Manage and search your digital receipts</CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <div className="relative w-full">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search receipts..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Tabs value={viewMode} onValueChange={setViewMode} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="grid">Grid</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReceipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
              <ReceiptIcon className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {searchTerm
                  ? "No receipts match your search."
                  : "No receipts found. Add transactions with receipts to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedMonths.map((month) => (
                <div key={month} className="space-y-3">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {month}
                  </h3>

                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {receiptsByMonth[month].map((receipt) => (
                        <Card
                          key={receipt.id}
                          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleReceiptClick(receipt)}
                        >
                          <div className="aspect-[3/4] relative">
                            <img
                              src={receipt.image_url || "/placeholder.svg"}
                              alt={`Receipt for ${receipt.transactions.description}`}
                              className="object-cover w-full h-full"
                            />
                            {receipt.has_warranty && (
                              <Badge className="absolute top-2 right-2 bg-yellow-500">Warranty</Badge>
                            )}
                          </div>
                          <CardContent className="p-3">
                            <p className="font-medium truncate">{receipt.transactions.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(receipt.transactions.date), "MMM d, yyyy")}
                            </p>
                            <p className="text-sm font-medium mt-1">${receipt.transactions.amount.toFixed(2)}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {receiptsByMonth[month].map((receipt) => (
                        <div
                          key={receipt.id}
                          className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                          onClick={() => handleReceiptClick(receipt)}
                        >
                          <div className="h-16 w-16 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={receipt.image_url || "/placeholder.svg"}
                              alt={`Receipt for ${receipt.transactions.description}`}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="font-medium truncate">{receipt.transactions.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(receipt.transactions.date), "MMM d, yyyy")}
                            </p>
                            {receipt.transactions.merchant_name && (
                              <p className="text-sm text-muted-foreground">{receipt.transactions.merchant_name}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-medium">${receipt.transactions.amount.toFixed(2)}</p>
                            {receipt.has_warranty && <Badge className="bg-yellow-500">Warranty</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Detail Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        {selectedReceipt && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedReceipt.transactions.description}</DialogTitle>
              <DialogDescription>
                {format(new Date(selectedReceipt.transactions.date), "MMMM d, yyyy")} • $
                {selectedReceipt.transactions.amount.toFixed(2)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <div className="border rounded-md overflow-hidden">
                  <img
                    src={selectedReceipt.image_url || "/placeholder.svg"}
                    alt={`Receipt for ${selectedReceipt.transactions.description}`}
                    className="object-contain w-full max-h-[500px]"
                  />
                </div>
                <div className="flex justify-between mt-4">
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500">
                    <TrashIcon className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Transaction Details</h4>
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-sm text-muted-foreground">Date:</span>
                      <span className="text-sm col-span-2">
                        {format(new Date(selectedReceipt.transactions.date), "MMMM d, yyyy")}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-sm text-muted-foreground">Amount:</span>
                      <span className="text-sm font-medium col-span-2">
                        ${selectedReceipt.transactions.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-sm text-muted-foreground">Merchant:</span>
                      <span className="text-sm col-span-2">
                        {selectedReceipt.transactions.merchant_name || "Not specified"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-sm text-muted-foreground">Category:</span>
                      <span className="text-sm col-span-2">
                        {selectedReceipt.transactions.category_id || "Uncategorized"}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedReceipt.has_warranty && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Warranty Information</h4>
                    <div className="rounded-md border p-3 space-y-2 bg-yellow-50">
                      <div className="flex items-start gap-2">
                        <AlertTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Warranty Expires:</p>
                          <p className="text-sm">
                            {selectedReceipt.warranty_end_date
                              ? format(new Date(selectedReceipt.warranty_end_date), "MMMM d, yyyy")
                              : "No expiration date"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReceipt.ocr_text && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Receipt Text</h4>
                    <div className="rounded-md border p-3 max-h-[200px] overflow-y-auto">
                      <p className="text-sm whitespace-pre-line">{selectedReceipt.ocr_text}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setSelectedReceipt(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

