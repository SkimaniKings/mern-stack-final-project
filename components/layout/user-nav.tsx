"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getClientSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { User } from "@/lib/types/user"
import { updateLastActiveTimestamp } from "@/lib/services/user-service"

interface UserNavProps {
  user: User
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter()
  const supabase = getClientSupabaseClient()

  const handleSignOut = async () => {
    if (!supabase) {
      console.error("Failed to get Supabase client")
      return
    }
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  // Update last active timestamp when user opens dropdown
  const handleOpenDropdown = async () => {
    if (user && user.id) {
      await updateLastActiveTimestamp(user.id)
    }
  }
  


  return (
    <DropdownMenu onOpenChange={(open) => open && handleOpenDropdown()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          <UserAvatar size="md" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.user_metadata?.full_name || user.user_metadata?.username || user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

