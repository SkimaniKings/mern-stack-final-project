"use client"

import { useState, useRef, useEffect } from "react"
import { uploadProfileImage } from "@/app/actions/upload-profile-image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface ProfileImageUploadProps {
  avatarUrl?: string
  fullName?: string
  email?: string
  userId?: string
  onImageUploaded?: (url: string) => void
}

export function ProfileImageUpload({ 
  avatarUrl, 
  fullName, 
  email,
  userId: propUserId,
  onImageUploaded 
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | undefined>(propUserId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  
  // Try to get the user ID if not provided as a prop
  useEffect(() => {
    if (!userId) {
      const fetchUserId = async () => {
        try {
          const { data } = await supabase.auth.getUser()
          if (data?.user?.id) {
            setUserId(data.user.id)
          }
        } catch (error) {
          console.error('Error fetching user ID:', error)
        }
      }
      
      fetchUserId()
    }
  }, [supabase, userId])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPEG, PNG, GIF, and WebP are allowed",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum size is 2MB",
        variant: "destructive"
      })
      return
    }

    // Submit the form
    if (formRef.current) {
      setUploading(true)
      try {
        formRef.current.requestSubmit()
      } catch (error) {
        console.error("Error submitting form:", error)
        setUploading(false)
      }
    }
  }

  const handleFormAction = async (formData: FormData) => {
    try {
      const result = await uploadProfileImage(formData)
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Profile picture updated successfully"
        })
        
        if (onImageUploaded && result.url) {
          onImageUploaded(result.url)
        }
        
        if (result.warning) {
          console.warn("Warning:", result.warning)
        }
      } else {
        throw new Error(result.error || "Failed to upload image")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Get initials for avatar fallback
  const getInitials = () => {
    if (fullName) {
      const parts = fullName.split(' ')
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
      }
      return fullName.charAt(0).toUpperCase()
    } else if (email) {
      return email.charAt(0).toUpperCase()
    }
    return "U"
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-24 w-24">
        <AvatarImage src={avatarUrl || "/placeholder-user.jpg"} alt="Profile" />
        <AvatarFallback>{getInitials()}</AvatarFallback>
      </Avatar>
      
      <form ref={formRef} action={handleFormAction} className="w-full">
        <input
          type="file"
          name="image"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
        />
        {userId && (
          <input 
            type="hidden"
            name="userId"
            value={userId}
          />
        )}
        
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          {uploading ? "Uploading..." : "Change Picture"}
        </Button>
      </form>
    </div>
  )
}
