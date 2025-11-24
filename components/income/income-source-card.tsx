"use client"

import { formatCurrency } from "@/lib/utils/formatting"
import {
  BriefcaseIcon,
  BuildingIcon,
  CoinsIcon,
  DollarSignIcon,
  GlobeIcon,
  HeartIcon,
  HomeIcon,
  LaptopIcon,
  PiggyBankIcon,
} from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { IncomeSource } from "@/types/income"

const sourceIcons: Record<string, any> = {
  salary: BriefcaseIcon,
  bonus: DollarSignIcon,
  freelance: LaptopIcon,
  rental: HomeIcon,
  investment: CoinsIcon,
  passive: PiggyBankIcon,
  other: GlobeIcon,
}

interface IncomeSourceCardProps {
  source: IncomeSource
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function IncomeSourceCard({ source, onEdit, onDelete }: IncomeSourceCardProps) {
  const Icon = sourceIcons[source.type] || GlobeIcon

  return (
    <Card
      className="dashboard-card overflow-hidden border-l-4 transition-all hover:shadow-md"
      style={{ borderLeftColor: getTypeColor(source.type) }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{source.name}</h3>
              <p className="text-sm text-muted-foreground">{capitalizeFirstLetter(source.type)}</p>
            </div>
          </div>
          {source.currency && source.currency !== "USD" && (
            <Badge variant="outline" className="flex items-center space-x-1">
              <GlobeIcon className="h-3 w-3 mr-1" />
              {source.currency}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-medium">{formatCurrency(source.amount, { currency: source.currency || "USD" })}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Frequency</span>
            <span>{capitalizeFirstLetter(source.frequency)}</span>
          </div>
          {source.start_date && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Start Date</span>
              <span>{new Date(source.start_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex justify-end space-x-2 w-full">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(source.id)} className="text-xs h-8">
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(source.id)}
              className="text-xs h-8 text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    salary: "#3b82f6", // blue
    bonus: "#ec4899", // pink
    freelance: "#8b5cf6", // purple
    rental: "#f59e0b", // amber
    investment: "#10b981", // green
    passive: "#6366f1", // indigo
    other: "#6b7280", // gray
  }

  return colors[type] || colors.other
}

function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
