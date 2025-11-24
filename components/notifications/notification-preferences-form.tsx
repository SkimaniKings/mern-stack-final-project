"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { 
  getNotificationPreferences, 
  updateNotificationPreferences 
} from "@/app/actions/notifications"
import { NotificationPreferences } from "@/types/notification"
import { Bell, Mail, Smartphone, AlertTriangle } from "lucide-react"

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch notification preferences
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // First, ensure the database structure is set up
        try {
          await fetch(`/api/database/notifications-setup`)
        } catch (setupError) {
          console.error("Error setting up notification database structure:", setupError)
        }
        
        const { preferences, error } = await getNotificationPreferences()
        
        if (error) {
          setError(error)
          setPreferences(null)
        } else {
          setPreferences(preferences)
          setError(null)
        }
      } catch (err) {
        console.error("Error fetching notification preferences:", err)
        setError("Failed to load notification preferences")
        setPreferences(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle preference change
  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return
    
    setPreferences({
      ...preferences,
      [key]: value
    })
  }

  // Save preferences
  const handleSave = async () => {
    if (!preferences) return
    
    setSaving(true)
    try {
      const result = await updateNotificationPreferences(preferences)
      
      if (result.success) {
        toast.success("Notification preferences saved")
      } else {
        toast.error("Failed to save notification preferences")
        setError(result.error || "Failed to save notification preferences")
      }
    } catch (err) {
      console.error("Error saving notification preferences:", err)
      toast.error("Failed to save notification preferences")
      setError("Failed to save notification preferences")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-40" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-60" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
          <Skeleton className="h-10 w-24 mt-4" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center p-4 gap-4">
            <AlertTriangle className="h-16 w-16 text-destructive opacity-20" />
            <h3 className="text-lg font-medium">Failed to Load Notification Preferences</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive and how you want to receive them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Delivery Methods</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="email_notifications" className="text-base">Email Notifications</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive important notifications via email
                </p>
              </div>
              <Switch
                id="email_notifications"
                checked={preferences?.email_notifications ?? false}
                onCheckedChange={(checked) => handlePreferenceChange('email_notifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="push_notifications" className="text-base">Push Notifications</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive in-app notifications
                </p>
              </div>
              <Switch
                id="push_notifications"
                checked={preferences?.push_notifications ?? false}
                onCheckedChange={(checked) => handlePreferenceChange('push_notifications', checked)}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Notification Types</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="goal_alerts" className="text-base">Goal Alerts</Label>
                <p className="text-sm text-muted-foreground">Milestones, progress updates, and reminders</p>
              </div>
              <Switch
                id="goal_alerts"
                checked={preferences?.goal_alerts ?? false}
                onCheckedChange={(checked) => handlePreferenceChange('goal_alerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bill_alerts" className="text-base">Bill Alerts</Label>
                <p className="text-sm text-muted-foreground">Get reminders for upcoming bill due dates.</p>
              </div>
              <Switch
                id="bill_alerts"
                checked={preferences?.bill_alerts ?? false}
                onCheckedChange={(checked) => handlePreferenceChange('bill_alerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="budget_alerts" className="text-base">Budget Alerts</Label>
                <p className="text-sm text-muted-foreground">Over budget warnings, approaching limits</p>
              </div>
              <Switch
                id="budget_alerts"
                checked={preferences?.budget_alerts ?? false}
                onCheckedChange={(checked) => handlePreferenceChange('budget_alerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="watchlist_alerts" className="text-base">Watchlist Alerts</Label>
                <p className="text-sm text-muted-foreground">Price targets reached, stock updates</p>
              </div>
              <Switch
                id="watchlist_alerts"
                checked={preferences?.watchlist_alerts ?? false}
                onCheckedChange={(checked) => handlePreferenceChange('watchlist_alerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="investment_updates" className="text-base">Investment Updates</Label>
                <p className="text-sm text-muted-foreground">Portfolio performance, news</p>
              </div>
              <Switch
                id="investment_updates"
                checked={preferences?.investment_updates ?? false}
                onCheckedChange={(checked) => handlePreferenceChange('investment_updates', checked)}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={saving || !preferences}
            className="mt-4"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
