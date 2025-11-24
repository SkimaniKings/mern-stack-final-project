"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ProfileForm } from "@/components/profile/profile-form"
import { WidgetLayout } from "@/components/dashboard/widget-layout"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProfileData {
  id: string
  username?: string
  full_name?: string
  email?: string
  avatar_url?: string
  phone?: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('Fetching profile data...')
        const response = await fetch("/api/profile")
        
        if (response.ok) {
          const profileData = await response.json()
          console.log('Profile data retrieved:', profileData)
          setProfile(profileData)
        } else {
          console.error('Failed to fetch profile data, status:', response.status)
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Error details:', errorData)
          
          toast({
            title: "Error",
            description: "Failed to load profile data",
            variant: "destructive"
          })
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

  // Handle profile updates
  const handleProfileUpdated = (updatedProfile: ProfileData) => {
    setProfile(updatedProfile)
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
      <h1 className="text-3xl font-bold">Profile</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <WidgetLayout title="Profile Picture">
            <div className="p-4">
              <ProfileForm 
                initialProfile={profile} 
                onProfileUpdated={handleProfileUpdated}
              />
            </div>
          </WidgetLayout>
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="personal">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-6">
              <WidgetLayout title="Personal Information">
                <div className="p-4">
                  <ProfileForm 
                    initialProfile={profile} 
                    onProfileUpdated={handleProfileUpdated}
                  />
                </div>
              </WidgetLayout>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <WidgetLayout title="Security Settings">
                <div className="space-y-4 p-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Password management is handled through Supabase Authentication. 
                      To reset your password, use the "Forgot Password" option on the login page.
                    </p>
                  </div>
                </div>
              </WidgetLayout>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

