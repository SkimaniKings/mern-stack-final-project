"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TransactionFormProps {
  onAdd: (expense: any) => void
}

export function TransactionForm({ onAdd }: TransactionFormProps) {
  const [merchant, setMerchant] = useState("")
  const [category, setCategory] = useState("")
  const [amount, setAmount] = useState(0)
  const [latitude, setLatitude] = useState(0)
  const [longitude, setLongitude] = useState(0)
  const [description, setDescription] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    const newExpense = {
      id: Date.now().toString(),
      merchant: merchant,
      category: category,
      amount: amount,
      latitude: latitude,
      longitude: longitude,
      date: new Date().toISOString(),
      description: description,
    }
    onAdd(newExpense)
    setMerchant("")
    setCategory("")
    setAmount(0)
    setLatitude(0)
    setLongitude(0)
    setDescription("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="merchant">Merchant</Label>
          <Input type="text" id="merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="latitude">Latitude</Label>
          <Input type="number" id="latitude" value={latitude} onChange={(e) => setLatitude(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            type="number"
            id="longitude"
            value={longitude}
            onChange={(e) => setLongitude(Number(e.target.value))}
          />
        </div>
      </div>
      <Button type="submit">Add Expense</Button>
    </form>
  )
}

