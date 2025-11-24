"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useUserProfile } from "@/hooks/use-user-profile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfileDebug() {
  const [user, setUser] = useState<any>(null);
  const { profile, loading, error, refreshProfile } = useUserProfile(user);
  const supabase = createClientComponentClient();
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])
  
  const handleRefresh = async () => {
    try {
      // Call the refreshProfile function from the hook
      await refreshProfile();
      
      // Force a cache-busting reload of the profile image if it exists
      if (profile?.avatar_url) {
        const img = new Image();
        img.src = `${profile.avatar_url}&t=${new Date().getTime()}`;
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  const handleResetCategories = async () => {
    setResetting(true);
    setResetMessage('');
    try {
      const response = await fetch('/api/bills/reset-categories', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset categories');
      }
      setResetMessage('Bill categories have been reset successfully!');
    } catch (error) {
      setResetMessage(`Error: ${(error as Error).message}`);
    } finally {
      setResetting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Profile Debug</CardTitle>
        <CardDescription>Check if your profile image is loading correctly</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          {loading ? (
            <Skeleton className="h-24 w-24 rounded-full" />
          ) : (
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={profile?.avatar_url || ""} 
                alt="Profile" 
              />
              <AvatarFallback>
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 
                 user?.email ? user.email.charAt(0).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className="text-center">
            <p className="font-medium">{profile?.full_name || user?.email || "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          <p><strong>Profile ID:</strong> {profile?.id || "Not loaded"}</p>
          <p><strong>Avatar URL:</strong> {profile?.avatar_url || "None"}</p>
          <p><strong>Loading:</strong> {loading ? "Yes" : "No"}</p>
          <p><strong>Error:</strong> {error || "None"}</p>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch space-y-2">
        <Button onClick={handleRefresh} className="w-full">
          Refresh Profile
        </Button>
        <Button onClick={handleResetCategories} disabled={resetting} variant="destructive" className="w-full">
          {resetting ? 'Resetting...' : 'Reset Bill Categories'}
        </Button>
        {resetMessage && <p className="text-sm text-center text-muted-foreground pt-2">{resetMessage}</p>}
      </CardFooter>
    </Card>
  )
}
