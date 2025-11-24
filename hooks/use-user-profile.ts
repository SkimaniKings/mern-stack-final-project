"use client"

import { useState, useEffect, useCallback } from "react"
import { User } from "@supabase/supabase-js"

interface ProfileData {
  id: string
  username?: string
  full_name?: string
  email?: string
  avatar_url?: string
  phone?: string
}

// Cache profile data to prevent unnecessary fetches
const profileCache = new Map<string, { data: ProfileData; timestamp: number }>()

// Cache expiration time: 5 minutes
const CACHE_EXPIRATION = 5 * 60 * 1000

export function useUserProfile(user: User | null) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Function to refresh the profile data
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check if we have a valid cached profile
      const cachedProfile = profileCache.get(user.id)
      const now = Date.now()
      
      if (cachedProfile && (now - cachedProfile.timestamp) < CACHE_EXPIRATION) {
        // Use cached profile if it's still valid
        setProfile(cachedProfile.data)
        setLoading(false)
        return
      }

      // Add cache-busting parameter to prevent browser caching
      const response = await fetch(`/api/profile?t=${now}`)
      
      if (response.ok) {
        const profileData = await response.json()
        
        // Add cache-busting parameter to avatar URL if it exists
        if (profileData.avatar_url) {
          // Check if the URL already has parameters
          const separator = profileData.avatar_url.includes('?') ? '&' : '?'
          profileData.avatar_url = `${profileData.avatar_url}${separator}t=${now}`
        }
        
        // Cache the profile data
        profileCache.set(user.id, { data: profileData, timestamp: now })
        
        setProfile(profileData)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to fetch profile data')
        console.error('Profile fetch error:', errorData)
      }
    } catch (err) {
      setError('Error fetching profile data')
      console.error("Error fetching profile data:", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Initial fetch and retry logic
  useEffect(() => {
    refreshProfile()
    
    // If there's an error, retry up to 3 times with increasing delay
    if (error && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1)
        refreshProfile()
      }, 1000 * (retryCount + 1)) // 1s, 2s, 3s delays
      
      return () => clearTimeout(timer)
    }
  }, [user, error, retryCount, refreshProfile])

  return { profile, loading, error, refreshProfile }
}
