"use client"

import { useState } from "react"
import { updateUserProfile } from "@/app/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/use-toast"
import { ProfileImageUpload } from "./profile-image-upload"

interface ProfileData {
  id: string
  username?: string
  full_name?: string
  email?: string
  avatar_url?: string
  phone?: string
}

interface ProfileFormProps {
  initialProfile: ProfileData | null
  onProfileUpdated?: (profile: ProfileData) => void
}

export function ProfileForm({ initialProfile, onProfileUpdated }: ProfileFormProps) {
  const [firstName, setFirstName] = useState(() => {
    if (initialProfile?.full_name) {
      const nameParts = initialProfile.full_name.split(" ")
      return nameParts[0] || ""
    }
    return ""
  })
  
  const [lastName, setLastName] = useState(() => {
    if (initialProfile?.full_name) {
      const nameParts = initialProfile.full_name.split(" ")
      return nameParts.slice(1).join(" ") || ""
    }
    return ""
  })
  
  const [phone, setPhone] = useState(initialProfile?.phone || "")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const result = await updateUserProfile({
        firstName,
        lastName,
        phone
      })
      
      if (result.success && result.profile) {
        toast({
          title: "Success",
          description: "Profile updated successfully"
        })
        
        // Call the callback if provided
        if (onProfileUpdated) {
          onProfileUpdated(result.profile)
        }
      } else {
        throw new Error(result.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

    const handleProfileImageUploaded = (url: string) => {
    if (initialProfile && onProfileUpdated) {
      // Create an updated profile object with the new avatar URL
      const updatedProfile = {
        ...initialProfile,
        avatar_url: url
      }
      
      // Call the callback with the updated profile
      onProfileUpdated(updatedProfile)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-4">
        <ProfileImageUpload
          avatarUrl={initialProfile?.avatar_url}
          fullName={initialProfile?.full_name}
          email={initialProfile?.email}
          userId={initialProfile?.id}
          onImageUploaded={handleProfileImageUploaded}
        />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first-name">First Name</Label>
            <Input 
              id="first-name" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last-name">Last Name</Label>
            <Input 
              id="last-name" 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            value={initialProfile?.email || ""}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input 
            id="phone" 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
          />
        </div>

        <Button 
          className="mt-4 w-full"
          onClick={handleSaveProfile}
          disabled={saving}
        >
          {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
