"use client"

import React, { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User, X } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { NavItems } from "./nav-items"
import { MobileNav } from "@/components/mobile-nav"
import { navItems } from "@/lib/utils/navigation"

interface MainNavigationProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  navItems?: { title: string; href: string }[];
}

export function MainNavigation({
  className,
  isOpen = true,
  onClose,
  navItems: propNavItems,
}: MainNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const hasNavigated = useRef(false);

  // Track recently visited pages
  useEffect(() => {
    if (typeof window !== "undefined" && pathname) {
      try {
        // Get current page info
        const currentPageTitle = document.title || "Page"
        const currentPage = { title: currentPageTitle, href: pathname }
        
        // Get existing recent pages
        const storedPages = localStorage.getItem("recentPages")
        const recentPages = storedPages ? JSON.parse(storedPages) : []
        
        // Add current page to recent pages if not already there
        const pageExists = recentPages.some((page: any) => page.href === pathname)
        if (!pageExists && pathname !== "/login" && pathname !== "/register") {
          // Add to beginning and limit to 5 items
          const updatedPages = [currentPage, ...recentPages].slice(0, 5)
          localStorage.setItem("recentPages", JSON.stringify(updatedPages))
        }
      } catch (error) {
        console.error("Error updating recent pages:", error)
      }
    }
  }, [pathname]);

  // Remove the auto-close on pathname change
  // This will prevent the sidebar from closing immediately on navigation

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  // Prevent clicks inside the sidebar from closing it
  const handleSidebarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <aside 
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-background transition-all duration-300 ease-in-out",
        "w-64 border-r p-4 shadow-lg md:shadow-none",
        "md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}
      onClick={handleSidebarClick}
    >
      <div className="flex items-center justify-between mb-6 md:hidden">
        <Link href="/" className="flex flex-col items-start">
          <span className="inline-block font-bold text-xl">DripCheck</span>
          <span className="text-xs text-muted-foreground">Flaunting responsibly</span>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-muted">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mb-4"></div>

      <div className="overflow-y-auto flex-grow">
        {propNavItems ? (
          <ul className="space-y-1">
            {propNavItems.map((item, index) => (
              <li key={index}>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center py-2 px-3 text-sm rounded-md hover:bg-accent transition-colors duration-200",
                    pathname === item.href ? "bg-accent font-medium" : "text-muted-foreground"
                  )}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <NavItems items={navItems} onItemClick={() => window.innerWidth < 768 && onClose?.()} />
            </div>
            
            {/* Mobile Navigation */}
            <div className="md:hidden">
              <MobileNav 
                items={navItems} 
                onItemClick={() => {
                  // Only close if we're not already on the page
                  if (window.innerWidth < 768) {
                    setTimeout(() => onClose?.(), 100);
                  }
                }} 
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-auto pt-4 border-t">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User avatar" />
                  <AvatarFallback>GU</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
    </aside>
  )
}
