"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { 
  Home, 
  CreditCard, 
  PiggyBank, 
  BarChart3, 
  Receipt, 
  Calendar, 
  DollarSign, 
  Wallet, 
  BellRing, 
  Target, 
  Settings, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Landmark, 
  Calculator, 
  Shield, 
  Repeat 
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Define the icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  CreditCard,
  PiggyBank,
  BarChart3,
  Receipt,
  Calendar,
  DollarSign,
  Wallet,
  BellRing,
  Target,
  Settings,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  Landmark,
  Calculator,
  Shield,
  Repeat,
}

interface MobileNavProps {
  items: { 
    title: string; 
    iconName?: string;
    items?: { 
      title: string; 
      href: string; 
      iconName?: string;
      badge?: string;
    }[];
  }[];
  onItemClick?: () => void;
}

export function MobileNav({ items, onItemClick }: MobileNavProps) {
  const pathname = usePathname()
  const [recentPages, setRecentPages] = useState<Array<{ title: string; href: string }>>([])
  const [mounted, setMounted] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  // Get recently visited pages from localStorage (if available)
  useEffect(() => {
    // This ensures the component is only rendered on the client side
    setMounted(true)
    
    try {
      const storedPages = localStorage.getItem("recentPages")
      if (storedPages) {
        setRecentPages(JSON.parse(storedPages))
      }
    } catch (error) {
      console.error("Error getting recent pages:", error)
    }
  }, [])

  // Handle navigation and update recent pages
  const handleNavigation = (href: string, title: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation() // Prevent event bubbling to parent elements
    }
    
    // Only proceed if it's a different page
    if (pathname !== href) {
      // Update recent pages
      const newRecentPages = [
        { title, href },
        ...recentPages.filter((page) => page.href !== href).slice(0, 4) // Keep only 5 recent pages
      ]
      
      try {
        localStorage.setItem('recentPages', JSON.stringify(newRecentPages))
      } catch (error) {
        console.error('Error saving recent pages:', error)
      }
      
      // Navigate first
      window.location.href = href
      
      // Then close the sidebar after a small delay
      if (onItemClick) {
        setTimeout(() => {
          onItemClick()
        }, 50)
      }
    }
  }

  // If not mounted yet (server-side), render a simpler version to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <Accordion 
          type="multiple" 
          className="w-full"
          defaultValue={items.map((_, index) => `item-${index}`)}
        >
          {items.map((group, index) => {
            const Icon = group.iconName ? iconMap[group.iconName] : null;
            const isGroupActive = group.items?.some(item => pathname === item.href);
            
            return (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className={cn(
                  "border-b border-border/40 last:border-b-0",
                  isGroupActive ? "bg-accent/30" : ""
                )}
              >
                <AccordionTrigger 
                  className={cn(
                    "flex items-center py-3 px-3 transition-all hover:bg-accent/30 rounded-md",
                    isGroupActive ? "font-medium" : ""
                  )}
                >
                  <div className="flex items-center">
                    {Icon && <Icon className="mr-3 h-4 w-4" />}
                    <span>{group.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-2">
                  <div className="flex flex-col space-y-1 pl-6">
                    {group.items?.map((item, itemIndex) => {
                      const ItemIcon = item.iconName ? iconMap[item.iconName] : null;
                      const isActive = pathname === item.href;
                      
                      return (
                        <div
                          key={itemIndex}
                          onClick={(e) => {
                            e.preventDefault()
                            handleNavigation(item.href, item.title)
                          }}
                          className={cn(
                            'flex items-center px-4 py-2 text-sm font-medium transition-colors rounded-md group hover:bg-accent hover:text-accent-foreground cursor-pointer',
                            pathname === item.href
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          <div className="flex items-center">
                            {ItemIcon && <ItemIcon className="mr-3 h-4 w-4" />}
                            <span>{item.title}</span>
                          </div>
                          {item.badge && (
                            <Badge variant="outline" className="ml-auto text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Recently visited pages section - only rendered on client side */}
      {recentPages.length > 0 && (
        <div className="mb-4 px-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">Recently Visited</h3>
          <div className="flex flex-wrap gap-2 px-2">
            {recentPages.slice(0, 3).map((page: { title: string; href: string }) => (
              <div
                key={page.href}
                onClick={(e) => {
                  e.preventDefault()
                  handleNavigation(page.href, page.title)
                }}
                className={cn(
                  'flex items-center px-4 py-2 text-sm font-medium transition-colors rounded-md group hover:bg-accent hover:text-accent-foreground cursor-pointer',
                  pathname === page.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                )}
              >
                <div className="flex items-center">
                  <span>{page.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main navigation */}
      <Accordion 
        type="multiple" 
        className="w-full"
        defaultValue={items.map((_, index) => `item-${index}`)}
      >
        {items.map((group, index) => {
          const Icon = group.iconName ? iconMap[group.iconName] : null;
          // Check if any item in this group is active
          const isGroupActive = group.items?.some(item => pathname === item.href);
          
          return (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className={cn(
                "border-b border-border/40 last:border-b-0",
                isGroupActive ? "bg-accent/30" : ""
              )}
            >
              <AccordionTrigger 
                className={cn(
                  "flex items-center py-3 px-3 transition-all hover:bg-accent/30 rounded-md",
                  isGroupActive ? "font-medium" : ""
                )}
                onClick={(e) => {
                  // Only toggle accordion if clicking the trigger itself, not a navigation item
                  const target = e.target as HTMLElement;
                  if (target.closest('a, button, [role="button"]')) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <div className="flex items-center">
                  {Icon && <Icon className="mr-3 h-4 w-4" />}
                  <span>{group.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2">
                <div className="flex flex-col space-y-1 pl-6">
                  {group.items?.map((item, itemIndex) => {
                    const ItemIcon = item.iconName ? iconMap[item.iconName] : null;
                    const isActive = pathname === item.href;
                    
                    return (
                      <div
                        key={itemIndex}
                        onClick={(e) => handleNavigation(item.href, item.title, e)}
                        className={cn(
                          'flex items-center px-4 py-2 text-sm font-medium transition-colors rounded-md group hover:bg-accent hover:text-accent-foreground cursor-pointer',
                          pathname === item.href
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        <div className="flex items-center">
                          {ItemIcon && <ItemIcon className="mr-3 h-4 w-4" />}
                          <span>{item.title}</span>
                        </div>
                        {item.badge && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
