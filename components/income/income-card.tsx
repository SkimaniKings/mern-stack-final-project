"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon, DollarSign, Edit2Icon, TrashIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import type { Income } from "@/app/actions/income"

interface IncomeCardProps {
  income: Income
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function IncomeCard({ income, onEdit, onDelete }: IncomeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Format the recurrence for display
  const formatRecurrence = (recurrence: string) => {
    switch (recurrence) {
      case "none": return "One-time"
      case "weekly": return "Weekly"
      case "bi_weekly": return "Bi-weekly"
      case "monthly": return "Monthly"
      case "quarterly": return "Quarterly"
      case "semi_annual": return "Semi-annual"
      case "annual": return "Annual"
      default: return recurrence
    }
  }

  // Format the tax class for display
  const formatTaxClass = (taxClass: string) => {
    switch (taxClass) {
      case "none": return "Non-taxable"
      case "pre_tax": return "Pre-tax"
      case "post_tax": return "Post-tax"
      default: return taxClass
    }
  }

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{income.source_name}</CardTitle>
          <Badge variant={income.is_taxable ? "default" : "outline"}>
            {income.is_taxable ? formatTaxClass(income.tax_class) : "Non-taxable"}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1">
          <CalendarIcon className="h-3 w-3" />
          {formatRecurrence(income.recurrence)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount:</span>
            <span className="font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
              {formatCurrency(income.amount)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Monthly Equivalent:</span>
            <span className="font-medium">
              {formatCurrency(income.monthly_equivalent_amount)}
            </span>
          </div>
          
          {income.category_id && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Category:</span>
              <Badge variant="secondary">{income.category ? income.category.name : 'Category'}</Badge>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Start Date:</span>
            <span>{formatDate(income.start_date)}</span>
          </div>

          {income.end_date && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">End Date:</span>
              <span>{formatDate(income.end_date)}</span>
            </div>
          )}

          {isExpanded && income.notes && (
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">Notes:</span>
              <p className="text-sm mt-1">{income.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? "Show Less" : "Show More"}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => onEdit(income.id)}>
            <Edit2Icon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onDelete(income.id)}>
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
