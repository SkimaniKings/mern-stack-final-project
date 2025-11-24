"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, Unlock, Pencil, Save, X, Trash2 } from "lucide-react"

interface CollaborativeBudgetTableProps {
  categories: {
    id: string
    name: string
    amount: number
    locked: boolean
  }[]
  isOwner: boolean
}

export function CollaborativeBudgetTable({ categories, isOwner }: CollaborativeBudgetTableProps) {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>("")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const handleEditStart = (category: { id: string; amount: number }) => {
    setEditingCategoryId(category.id)
    setEditValue(category.amount.toString())
  }

  const handleEditCancel = () => {
    setEditingCategoryId(null)
    setEditValue("")
  }

  const handleEditSave = (categoryId: string) => {
    // In a real app, this would update the category amount
    console.log(`Updating category ${categoryId} to ${editValue}`)
    setEditingCategoryId(null)
    setEditValue("")
  }

  const handleToggleLock = (categoryId: string) => {
    // In a real app, this would toggle the lock status
    console.log(`Toggling lock for category ${categoryId}`)
  }

  const handleDeleteCategory = (categoryId: string) => {
    // In a real app, this would delete the category
    console.log(`Deleting category ${categoryId}`)
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-right">
                {editingCategoryId === category.id ? (
                  <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-32 ml-auto" />
                ) : (
                  formatCurrency(category.amount)
                )}
              </TableCell>
              <TableCell>
                <Badge variant={category.locked ? "secondary" : "outline"}>
                  {category.locked ? <Lock className="mr-1 h-3 w-3" /> : <Unlock className="mr-1 h-3 w-3" />}
                  {category.locked ? "Locked" : "Unlocked"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {editingCategoryId === category.id ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEditCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditSave(category.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {!category.locked && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditStart(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {isOwner && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleLock(category.id)}
                          >
                            {category.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

