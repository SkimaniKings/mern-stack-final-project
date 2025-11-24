"use client"

import { WidgetLayout } from "@/components/dashboard/widget-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { CURRENCIES } from "@/lib/currencies"
import { Spinner } from "@/components/ui/spinner"

interface ProfileData {
  id: string
  username?: string
  full_name?: string
  email?: string
  avatar_url?: string
  phone?: string
  currency_code?: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currency, setCurrency] = useState("USD")
  const { toast } = useToast()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Fetch profile data
        const response = await fetch("/api/profile")
        if (response.ok) {
          const profileData = await response.json()
          setProfile(profileData)
          
          // Set form values from profile data
          setName(profileData.full_name || "")
          setEmail(profileData.email || "")
          setCurrency(profileData.currency_code || "USD")
        }
      } catch (error) {
        console.error("Error fetching profile data:", error)
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [toast])

  const handleSaveAccount = async () => {
    setSaving(true)
    try {
      // Split name into first and last name for the API
      const nameParts = name.split(" ")
      const firstName = nameParts[0] || ""
      const lastName = nameParts.slice(1).join(" ") || ""

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          currency_code: currency
        })
      })

      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        toast({
          title: "Success",
          description: "Account settings updated successfully"
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to update account settings")
      }
    } catch (error) {
      console.error("Error updating account settings:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update account settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Tabs defaultValue="account">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <WidgetLayout title="Account Settings">
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  disabled 
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} ({currency.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <Button 
                className="mt-4"
                onClick={handleSaveAccount}
                disabled={saving}
              >
                {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </WidgetLayout>
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <WidgetLayout title="Preferences">
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Enable dark mode for the application</p>
                </div>
                <Switch id="dark-mode" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email notifications for important updates</p>
                </div>
                <Switch id="notifications" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-summary">Weekly Summary</Label>
                  <p className="text-sm text-muted-foreground">Receive a weekly summary of your financial activity</p>
                </div>
                <Switch id="weekly-summary" defaultChecked />
              </div>

              <Button className="mt-4">Save Preferences</Button>
            </div>
          </WidgetLayout>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <WidgetLayout title="Notification Settings">
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="bill-reminders">Bill Reminders</Label>
                  <p className="text-sm text-muted-foreground">Get notified before bills are due</p>
                </div>
                <Switch id="bill-reminders" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="budget-alerts">Budget Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you're close to exceeding your budget
                  </p>
                </div>
                <Switch id="budget-alerts" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="goal-progress">Goal Progress</Label>
                  <p className="text-sm text-muted-foreground">Get notified about your financial goal progress</p>
                </div>
                <Switch id="goal-progress" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="unusual-activity">Unusual Activity</Label>
                  <p className="text-sm text-muted-foreground">Get notified about unusual spending activity</p>
                </div>
                <Switch id="unusual-activity" defaultChecked />
              </div>

              <Button className="mt-4">Save Notification Settings</Button>
            </div>
          </WidgetLayout>
        </TabsContent>
      </Tabs>
    </div>
  )
}

