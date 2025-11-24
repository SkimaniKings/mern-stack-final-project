"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, UserCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { getAuthenticatedUser } from "@/lib/auth"
import { getClientSupabaseClient } from "@/lib/supabase/client"

interface UserAvatarProps {
  className?: string
  fallbackClassName?: string
  showFallbackOnError?: boolean
  size?: "sm" | "md" | "lg"
}

export function UserAvatar({
  className = "h-8 w-8",
  fallbackClassName = "h-4 w-4",
  showFallbackOnError = true,
  size = "md"
}: UserAvatarProps) {
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<{ avatar_url?: string, full_name?: string, email?: string } | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [imagePreloaded, setImagePreloaded] = useState(false)
  const supabase = getClientSupabaseClient()
  if (!supabase) {
    console.error('Supabase client not available')
    return null
  }

  // Size classes for the avatar
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10"
  }

  // Size classes for the fallback icon
  const fallbackSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  }

  // Preload the image when avatarUrl changes
  useEffect(() => {
    if (avatarUrl) {
      // Preload the image to ensure it's in the browser cache
      const img = new Image();
      img.src = avatarUrl;
      img.onload = () => {
        console.log('[UserAvatar] Image preloaded successfully:', avatarUrl);
        setImagePreloaded(true);
      };
      img.onerror = () => {
        console.error('[UserAvatar] Failed to preload image:', avatarUrl);
        setError(true);
      };
    }
  }, [avatarUrl]);
  
  // Fetch user profile data
  useEffect(() => {
    let isMounted = true
    const fetchProfile = async () => {
      try {
        console.log('[UserAvatar] Fetching user profile...')
        // Get authenticated user using the centralized auth method
        const user = await getAuthenticatedUser()
        if (!user) {
          console.log('[UserAvatar] No authenticated user found')
          return
        }
        
        if (isMounted) {
          console.log('[UserAvatar] User authenticated:', user.id)
          
          // First try to get the profile directly from the database
          const { data: dbProfile, error: dbError } = await supabase
            .from('users')
            .select('avatar_url, full_name, email')
            .eq('id', user.id)
            .single()
            
          if (dbProfile && !dbError && isMounted) {
            console.log('[UserAvatar] Profile data loaded from DB:', dbProfile)
            setProfileData(dbProfile)
            
            // If we have an avatar URL, use it
            if (dbProfile.avatar_url) {
              try {
                // Process the URL to ensure it's valid
                let processedUrl = dbProfile.avatar_url;
                
                // Remove any existing query parameters
                if (processedUrl.includes('?')) {
                  processedUrl = processedUrl.split('?')[0];
                }
                
                // Add a cache-busting parameter
                const timestamp = new Date().getTime();
                const urlWithCacheBusting = `${processedUrl}?t=${timestamp}`;
                
                if (isMounted) {
                  setAvatarUrl(urlWithCacheBusting);
                  console.log('[UserAvatar] Set avatar URL from DB:', urlWithCacheBusting);
                }
              } catch (avatarError) {
                console.error('[UserAvatar] Error processing avatar URL:', avatarError);
                // Still set the original URL as fallback
                if (isMounted) {
                  setAvatarUrl(dbProfile.avatar_url);
                }
              }
            }
          } else {
            // Fallback to API endpoint if DB query fails
            console.log('[UserAvatar] Falling back to API endpoint for profile data')
            const response = await fetch('/api/profile')
            
            if (response.ok && isMounted) {
              const data = await response.json()
              console.log('[UserAvatar] Profile data loaded from API:', data)
              setProfileData(data)
              
              // If we have an avatar URL, use it
              if (data.avatar_url) {
                try {
                  // Process the URL to ensure it's valid
                  let processedUrl = data.avatar_url;
                  
                  // Remove any existing query parameters
                  if (processedUrl.includes('?')) {
                    processedUrl = processedUrl.split('?')[0];
                  }
                  
                  // Add a cache-busting parameter
                  const timestamp = new Date().getTime();
                  const urlWithCacheBusting = `${processedUrl}?t=${timestamp}`;
                  
                  if (isMounted) {
                    setAvatarUrl(urlWithCacheBusting);
                    console.log('[UserAvatar] Set avatar URL from API:', urlWithCacheBusting);
                  }
                } catch (avatarError) {
                  console.error('[UserAvatar] Error processing avatar URL:', avatarError);
                  // Still set the original URL as fallback
                  if (isMounted) {
                    setAvatarUrl(data.avatar_url);
                  }
                }
              }
            } else if (isMounted) {
              console.error('[UserAvatar] Error fetching profile data from API:', response.status)
            }
          }
        } else if (isMounted) {
          console.log('[UserAvatar] No authenticated user found')
        }
      } catch (error) {
        console.error('[UserAvatar] Error fetching profile:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    fetchProfile()
    
    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false
    }
  }, [supabase])

  // Get initials for avatar fallback
  const getInitials = () => {
    if (profileData?.full_name) {
      const parts = profileData.full_name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
      }
      return profileData.full_name.charAt(0).toUpperCase()
    } else if (profileData?.email) {
      return profileData.email.charAt(0).toUpperCase()
    }
    return "U"
  }

  if (loading) {
    return <Skeleton className={`rounded-full ${className || sizeClasses[size]}`} />
  }

  return (
    <Avatar className={className || sizeClasses[size]}>
      {!loading && avatarUrl ? (
        <AvatarImage 
          src={avatarUrl} 
          alt="Profile" 
          onError={(e) => {
            console.error('[UserAvatar] Failed to load avatar image:', avatarUrl);
            // Try to display the image directly without cache busting
            const imgElement = e.target as HTMLImageElement;
            if (avatarUrl && avatarUrl.includes('?')) {
              const baseUrl = avatarUrl.split('?')[0];
              console.log('[UserAvatar] Retrying with base URL:', baseUrl);
              imgElement.src = baseUrl;
            } else {
              setError(true);
            }
          }}
        />
      ) : null}
      <AvatarFallback>
        {loading ? (
          <User className={fallbackClassName || fallbackSizeClasses[size]} />
        ) : error || !avatarUrl ? (
          <UserCircle className={fallbackClassName || fallbackSizeClasses[size]} />
        ) : (
          getInitials()
        )}
      </AvatarFallback>
    </Avatar>
  )
}
