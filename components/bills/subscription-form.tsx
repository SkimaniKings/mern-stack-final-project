"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { X, ChevronDown } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface SubscriptionFormProps {
  onClose: () => void
  onSave: (subscription: any) => void
  initialData?: any
}

export function SubscriptionForm({ onClose, onSave, initialData }: SubscriptionFormProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [formData, setFormData] = useState(initialData || {
    name: "",
    category: "Uncategorized",
    cost: 0,
    billingCycle: "monthly",
    nextBillingDate: new Date().toISOString().split("T")[0],
    usage: 50,
    value: 50,
    paymentMethod: "Credit Card",
    autoRenew: true,
    notes: ""
  })
  
  useEffect(() => {
    const checkScroll = () => {
      if (!contentRef.current) return;
      const { scrollHeight, clientHeight, scrollTop } = contentRef.current;
      
      // If scrolled to the bottom or content doesn't need scrolling
      if (scrollTop + clientHeight >= scrollHeight - 20 || scrollHeight <= clientHeight) {
        setShowScrollIndicator(false);
      } else {
        setShowScrollIndicator(true);
      }
    };
    
    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', checkScroll);
      // Initial check
      checkScroll();
    }
    
    return () => {
      if (contentElement) {
        contentElement.removeEventListener('scroll', checkScroll);
      }
    };
  }, [])
  
  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // In a real app, you would validate the form data here
    
    const subscription = {
      ...formData,
      id: initialData?.id || `sub-${Date.now()}`,
      nextBillingDate: new Date(formData.nextBillingDate)
    }
    
    onSave(subscription)
  }
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ maxHeight: '100vh' }}>
      <Card className="w-full max-w-2xl my-8 max-h-[90vh] flex flex-col shadow-lg">
        <style jsx global>{`
          .scroll-smooth {
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
          }
          .scroll-smooth::-webkit-scrollbar {
            width: 8px;
          }
          .scroll-smooth::-webkit-scrollbar-track {
            background: transparent;
          }
          .scroll-smooth::-webkit-scrollbar-thumb {
            background-color: rgba(155, 155, 155, 0.5);
            border-radius: 20px;
            border: transparent;
          }
        `}</style>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{initialData ? "Edit Subscription" : "Add New Subscription"}</CardTitle>
            <CardDescription>
              {initialData ? "Update your subscription details" : "Enter details about your new subscription"}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden relative">
          <CardContent ref={contentRef} className="space-y-4 overflow-y-auto pr-2 flex-1 scroll-smooth">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Subscription Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g., Netflix, Spotify Premium"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Streaming">Streaming</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="News">News</SelectItem>
                    <SelectItem value="Fitness">Fitness</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Productivity">Productivity</SelectItem>
                    <SelectItem value="Gaming">Gaming</SelectItem>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Cloud Storage">Cloud Storage</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Health">Health</SelectItem>
                    <SelectItem value="Food Delivery">Food Delivery</SelectItem>
                    <SelectItem value="Shopping">Shopping</SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">$</span>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => handleChange("cost", parseFloat(e.target.value))}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="billingCycle">Billing Cycle</Label>
                <Select
                  value={formData.billingCycle}
                  onValueChange={(value) => handleChange("billingCycle", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi-annually">Semi-annually</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nextBillingDate">Next Billing Date</Label>
                <Input
                  id="nextBillingDate"
                  type="date"
                  value={formData.nextBillingDate}
                  onChange={(e) => handleChange("nextBillingDate", e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => handleChange("paymentMethod", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                    <SelectItem value="Bank Account">Bank Account</SelectItem>
                    <SelectItem value="PayPal">PayPal</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="usage">Usage (%)</Label>
                  <span className="text-sm font-medium">{formData.usage}%</span>
                </div>
                <Slider
                  id="usage"
                  min={0}
                  max={100}
                  step={1}
                  value={[formData.usage]}
                  onValueChange={(value) => handleChange("usage", value[0])}
                />
                <p className="text-xs text-muted-foreground">
                  How much do you use this subscription?
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="value">Value (%)</Label>
                  <span className="text-sm font-medium">{formData.value}%</span>
                </div>
                <Slider
                  id="value"
                  min={0}
                  max={100}
                  step={1}
                  value={[formData.value]}
                  onValueChange={(value) => handleChange("value", value[0])}
                />
                <p className="text-xs text-muted-foreground">
                  How valuable is this subscription to you?
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Add any additional notes about this subscription"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="autoRenew"
                checked={formData.autoRenew}
                onCheckedChange={(checked) => handleChange("autoRenew", checked)}
              />
              <Label htmlFor="autoRenew">Auto-renewal enabled</Label>
            </div>
          </CardContent>
          
          {showScrollIndicator && (
            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 animate-bounce bg-primary/10 rounded-full p-1 cursor-pointer z-10" 
                 onClick={() => contentRef.current?.scrollBy({ top: 100, behavior: 'smooth' })}>
              <ChevronDown className="h-5 w-5 text-primary" />
            </div>
          )}
          <CardFooter className="flex justify-end space-x-2 border-t pt-4 mt-2 relative">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Update Subscription" : "Add Subscription"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 