"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Upload, Search, Receipt } from "lucide-react"
import Link from "next/link"
import { ReceiptList } from "@/components/expenses/receipt-list"
import { ReceiptDetail } from "@/components/expenses/receipt-detail"

export default function SmartReceiptManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)

  // Sample receipts data
  const receipts = [
    {
      id: "1",
      merchant: "Best Buy",
      category: "Electronics",
      amount: 899.99,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      items: [{ name: "MacBook Air", price: 899.99, quantity: 1 }],
      warranty: {
        type: "Extended Warranty",
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        details: "1-year extended warranty covering parts and labor",
      },
      imageUrl: "/placeholder.svg?height=300&width=200",
      ocrText:
        "Best Buy\n123 Tech Lane\nAnytown, USA\n\nMacBook Air\n$899.99\nExtended Warranty: $99.99\nSubtotal: $999.98\nTax: $80.00\nTotal: $1,079.98",
    },
    {
      id: "2",
      merchant: "Whole Foods Market",
      category: "Groceries",
      amount: 87.32,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      items: [
        { name: "Organic Apples", price: 4.99, quantity: 1 },
        { name: "Free Range Eggs", price: 5.99, quantity: 1 },
        { name: "Almond Milk", price: 3.99, quantity: 2 },
        { name: "Grass-fed Beef", price: 12.99, quantity: 1 },
        { name: "Quinoa", price: 6.99, quantity: 1 },
        { name: "Avocados", price: 5.99, quantity: 3 },
        { name: "Organic Spinach", price: 4.99, quantity: 1 },
        { name: "Sparkling Water", price: 3.99, quantity: 2 },
        { name: "Dark Chocolate", price: 3.99, quantity: 2 },
      ],
      imageUrl: "/placeholder.svg?height=300&width=200",
      ocrText:
        "Whole Foods Market\n456 Organic Ave\nAnytown, USA\n\nOrganic Apples $4.99\nFree Range Eggs $5.99\nAlmond Milk $3.99 x2\nGrass-fed Beef $12.99\nQuinoa $6.99\nAvocados $5.99 x3\nOrganic Spinach $4.99\nSparkling Water $3.99 x2\nDark Chocolate $3.99 x2\n\nSubtotal: $81.87\nTax: $5.45\nTotal: $87.32",
    },
    {
      id: "3",
      merchant: "Home Depot",
      category: "Home Improvement",
      amount: 129.97,
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      items: [
        { name: "Cordless Drill", price: 99.99, quantity: 1 },
        { name: "Drill Bits Set", price: 29.98, quantity: 1 },
      ],
      warranty: {
        type: "Manufacturer Warranty",
        expirationDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
        details: "2-year manufacturer warranty on power tools",
      },
      imageUrl: "/placeholder.svg?height=300&width=200",
      ocrText:
        "Home Depot\n789 Builder Blvd\nAnytown, USA\n\nCordless Drill $99.99\nDrill Bits Set $29.98\n\nSubtotal: $129.97\nTax: $10.40\nTotal: $140.37",
    },
    {
      id: "4",
      merchant: "Amazon",
      category: "Shopping",
      amount: 67.99,
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      items: [{ name: "Wireless Headphones", price: 67.99, quantity: 1 }],
      warranty: {
        type: "Return Period",
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        details: "30-day return period for unused items",
      },
      imageUrl: "/placeholder.svg?height=300&width=200",
      ocrText:
        "Amazon.com\nOrder #123-4567890-1234567\n\nWireless Headphones $67.99\n\nSubtotal: $67.99\nShipping: $0.00\nTax: $5.44\nTotal: $73.43",
    },
    {
      id: "5",
      merchant: "CVS Pharmacy",
      category: "Health",
      amount: 42.67,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      items: [
        { name: "Prescription Medication", price: 25.0, quantity: 1 },
        { name: "Vitamins", price: 12.99, quantity: 1 },
        { name: "Bandages", price: 4.68, quantity: 1 },
      ],
      imageUrl: "/placeholder.svg?height=300&width=200",
      ocrText:
        "CVS Pharmacy\n101 Health St\nAnytown, USA\n\nPrescription #12345 $25.00\nVitamins $12.99\nBandages $4.68\n\nSubtotal: $42.67\nTax: $2.56\nTotal: $45.23",
    },
  ]

  // Filter receipts based on active tab and search query
  const getFilteredReceipts = () => {
    let filtered = [...receipts]

    // Apply tab filter
    if (activeTab === "warranty") {
      filtered = filtered.filter((receipt) => receipt.warranty)
    } else if (activeTab === "recent") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter((receipt) => receipt.date >= thirtyDaysAgo)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (receipt) =>
          receipt.merchant.toLowerCase().includes(query) ||
          receipt.category.toLowerCase().includes(query) ||
          receipt.items.some((item) => item.name.toLowerCase().includes(query)) ||
          (receipt.ocrText && receipt.ocrText.toLowerCase().includes(query)),
      )
    }

    return filtered
  }

  const filteredReceipts = getFilteredReceipts()
  const selectedReceipt = receipts.find((receipt) => receipt.id === selectedReceiptId)

  const handleReceiptSelect = (receiptId: string) => {
    setSelectedReceiptId(receiptId)
  }

  const handleUploadReceipt = () => {
    // In a real app, this would open a file picker or camera
    alert("This would open a file picker or camera to upload a receipt")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Receipt Management</h1>
          <p className="text-muted-foreground mt-2">Automatically categorize receipts and track warranties</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/expenses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Expenses
            </Link>
          </Button>
          <Button onClick={handleUploadReceipt}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Receipt
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search receipts..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="warranty">Warranty</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg flex items-center">
                <Receipt className="mr-2 h-4 w-4" />
                Receipts
              </CardTitle>
              <CardDescription>
                {filteredReceipts.length} {filteredReceipts.length === 1 ? "receipt" : "receipts"} found
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ReceiptList
                receipts={filteredReceipts}
                onSelectReceipt={handleReceiptSelect}
                selectedReceiptId={selectedReceiptId}
              />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          {selectedReceipt ? (
            <ReceiptDetail receipt={selectedReceipt} />
          ) : (
            <Card className="h-full">
              <CardContent className="flex flex-col items-center justify-center h-full py-20 text-center">
                <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Select a Receipt</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Select a receipt from the list to view details, or upload a new receipt to get started.
                </p>
                <Button className="mt-4" onClick={handleUploadReceipt}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Receipt
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

