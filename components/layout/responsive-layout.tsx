"use client"

import React, { useState, useEffect, useRef } from "react"
import { MainNavigation } from "@/components/layout/main-navigation"
import { TopNavigation } from "@/components/layout/top-navigation"

export function ResponsiveLayout({ 
  children
}: { 
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  
  // Close sidebar when window resizes to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking on the menu button (that's handled by the toggle)
      if (menuButtonRef.current && menuButtonRef.current.contains(event.target as Node)) {
        return;
      }
      
      // Only close if clicking outside the sidebar
      if (
        isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        window.innerWidth < 768
      ) {
        setIsSidebarOpen(false)
      }
    }

    // Use mousedown to catch the event before any navigation happens
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSidebarOpen])

  // Add overlay when sidebar is open on mobile
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [isSidebarOpen])

  // Handle menu toggle with debounce to prevent accidental double-clicks
  const handleMenuToggle = () => {
    setIsSidebarOpen(prev => !prev)
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Navigation - visible on all screen sizes */}
      <TopNavigation 
        onMenuToggle={handleMenuToggle} 
        isSidebarOpen={isSidebarOpen} 
        menuButtonRef={menuButtonRef}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation - fixed on mobile, visible on desktop */}
        <div ref={sidebarRef} className="md:w-64 flex-shrink-0">
          <MainNavigation 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)}
            className="md:h-[calc(100vh-3.5rem)]" 
          />
        </div>
        
        {/* Overlay for mobile when sidebar is open */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden" 
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto w-full">
          <main className="p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
