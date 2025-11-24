import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Download, Calendar, Tag, Receipt } from "lucide-react"
import Image from "next/image"

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

interface ReceiptDetailProps {
  receipt: Receipt | null
}

export function ReceiptDetail({ receipt }: ReceiptDetailProps) {
  if (!receipt) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Receipt Selected</h3>
          <p className="text-muted-foreground mt-2">
            Select a receipt from the list to view details
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{receipt.merchant}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{formatDate(receipt.date)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline">{receipt.category}</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatCurrency(receipt.amount)}</div>
        </div>
      </div>

      {receipt.warranty && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Warranty Information</CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <div className="text-sm">
              <p><strong>Type:</strong> {receipt.warranty.type}</p>
              <p><strong>Expires:</strong> {formatDate(receipt.warranty.expirationDate)}</p>
              <p><strong>Details:</strong> {receipt.warranty.details}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Items</CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <div className="space-y-2">
            {receipt.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <div>
                  {item.name} {item.quantity > 1 && `(x${item.quantity})`}
                </div>
                <div className="font-medium">{formatCurrency(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border">
        <Image
          src={receipt.imageUrl}
          alt={`Receipt from ${receipt.merchant}`}
          fill
          className="object-contain"
        />
      </div>

      {receipt.ocrText && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Receipt Text</CardTitle>
            <CardDescription>Extracted text from receipt image</CardDescription>
          </CardHeader>
          <CardContent className="py-0">
            <pre className="text-xs whitespace-pre-wrap">{receipt.ocrText}</pre>
          </CardContent>
          <CardFooter className="pt-3 pb-3">
            <Button variant="outline" size="sm" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Receipt
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
