"use client"

import React, { RefObject } from "react"
import Link from "next/link"
import { Menu, Bell } from "lucide-react"
import LevelProgress from "@/components/gamification/LevelProgress"
import StreakCounter from "@/components/gamification/StreakCounter"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserAvatar } from "@/components/user/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { NotificationBell } from "@/components/notifications/notification-bell"

interface TopNavigationProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
  menuButtonRef?: RefObject<HTMLButtonElement>;
}

export function TopNavigation({ 
  onMenuToggle, 
  isSidebarOpen,
  menuButtonRef 
}: TopNavigationProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="mr-2 h-8 w-8 md:hidden hover:bg-muted transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              onMenuToggle();
            }}
            aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          <Link href="/" className="flex flex-col items-start">
            <span className="hidden md:inline-block font-bold text-xl">DripCheck</span>
            <span className="md:hidden inline-block font-bold text-xl">DripCheck</span>
            <span className="text-xs text-muted-foreground">Flaunting responsibly</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <LevelProgress className="w-28" />
            <StreakCounter />
            <div className="hidden md:block mr-2">
              <ThemeToggle />
            </div>
            <NotificationBell />
          </div>
          
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                <UserAvatar size="md" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel>
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
