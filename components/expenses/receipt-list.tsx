import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ReceiptItem {
  name: string
  price: number
  quantity: number
}

interface Warranty {
  type: string
  expirationDate: Date
  details: string
}

interface Receipt {
  id: string
  merchant: string
  category: string
  amount: number
  date: Date
  items: ReceiptItem[]
  warranty?: Warranty
  imageUrl: string
  ocrText?: string
}

interface ReceiptListProps {
  receipts: Receipt[]
  onSelectReceipt: (receiptId: string) => void
  selectedReceiptId: string | null
}

export function ReceiptList({ receipts, onSelectReceipt, selectedReceiptId }: ReceiptListProps) {
  return (
    <div className="divide-y">
      {receipts.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          No receipts found
        </div>
      ) : (
        receipts.map((receipt) => (
          <div
            key={receipt.id}
            className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
              selectedReceiptId === receipt.id ? "bg-muted" : ""
            }`}
            onClick={() => onSelectReceipt(receipt.id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{receipt.merchant}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDate(receipt.date.toISOString())}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(receipt.amount)}</p>
                <Badge variant="outline" className="mt-1">
                  {receipt.category}
                </Badge>
              </div>
            </div>
            {receipt.warranty && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  Warranty until {formatDate(receipt.warranty.expirationDate.toISOString())}
                </Badge>
              </div>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              {receipt.items.length > 0 && (
                <p>
                  {receipt.items.length} {receipt.items.length === 1 ? "item" : "items"}
                </p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
