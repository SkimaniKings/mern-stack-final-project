"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  MoreVertical, 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Pencil,
  Trash2,
  FileText
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Subscription {
  id: string
  name: string
  category: string
  cost: number
  billingCycle: string
  nextBillingDate: Date
  usage: number
  value: number
  paymentMethod: string
  autoRenew: boolean
  notes: string
}

interface SubscriptionCardProps {
  subscription: Subscription
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  const getUsageColor = (usage: number) => {
    if (usage >= 80) return "bg-green-500"
    if (usage >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }
  
  const getValueColor = (value: number) => {
    if (value >= 80) return "text-green-600"
    if (value >= 50) return "text-yellow-600"
    return "text-red-600"
  }
  
  const getBillingCycleLabel = (cycle: string) => {
    switch (cycle) {
      case "monthly": return "Monthly"
      case "quarterly": return "Quarterly"
      case "bi-annual": return "Bi-Annual"
      case "yearly": return "Yearly"
      default: return cycle
    }
  }
  
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "entertainment": return "bg-purple-100 text-purple-800"
      case "software": return "bg-blue-100 text-blue-800"
      case "health": return "bg-green-100 text-green-800"
      case "shopping": return "bg-amber-100 text-amber-800"
      case "utilities": return "bg-cyan-100 text-cyan-800"
      case "streaming": return "bg-pink-100 text-pink-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-medium">{subscription.name.charAt(0)}</span>
            </div>
            <div>
              <h3 className="font-medium">{subscription.name}</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={getCategoryColor(subscription.category)}>
                  {subscription.category}
                </Badge>
                <Badge variant="outline">
                  {getBillingCycleLabel(subscription.billingCycle)}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="font-medium">{formatCurrency(subscription.cost)}</span>
            <span className="text-sm text-muted-foreground">
              /{subscription.billingCycle === "monthly" ? "mo" : subscription.billingCycle === "yearly" ? "yr" : ""}
            </span>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  View Statements
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Cancel Subscription
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="border-t px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Usage</span>
              <span className={`text-sm font-medium ${getValueColor(subscription.usage)}`}>
                {subscription.usage}%
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Value</span>
              <span className={`text-sm font-medium ${getValueColor(subscription.value)}`}>
                {subscription.value}%
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Usage</span>
              <span>{subscription.usage}%</span>
            </div>
            <Progress value={subscription.usage} className="h-1" indicatorClassName={getUsageColor(subscription.usage)} />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Value</span>
              <span>{subscription.value}%</span>
            </div>
            <Progress value={subscription.value} className="h-1" indicatorClassName={getValueColor(subscription.value)} />
          </div>
        </div>
        
        <div className="border-t px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Next billing: {formatDate(subscription.nextBillingDate)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{subscription.paymentMethod}</span>
            </div>
          </div>
        </div>
        
        <div className="border-t px-4 py-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {subscription.autoRenew ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                {subscription.autoRenew ? "Auto-renewal enabled" : "Auto-renewal disabled"}
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "Hide Details" : "Show Details"}
            </Button>
          </div>
          
          {showDetails && (
            <div className="mt-3 text-sm text-muted-foreground">
              <p>{subscription.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 