"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
  Repeat,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { navItems } from "@/lib/utils/navigation"
import { NetWorthIcon, FinancialEducationIcon } from "@/components/ui/custom-icons"

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

interface NavItem {
  title: string;
  href: string;
  iconName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  title: string;
  iconName?: string;
  items: NavItem[];
}

interface NavItemsProps {
  className?: string;
  items?: NavGroup[];
  onItemClick?: () => void;
}

export function NavItems({ className, items: propItems, onItemClick }: NavItemsProps) {
  const items = propItems || navItems;
  const pathname = usePathname()

  return (
    <Accordion 
      type="multiple" 
      className={cn("space-y-1", className)}
      defaultValue={items.map((_, index) => `item-${index}`)} // Open all by default on desktop
    >
      {items.map((group, index) => {
        const Icon = iconMap[group.iconName || ""]
        // Check if any item in this group is active
        const isGroupActive = group.items?.some((item: NavItem) => pathname === item.href)
        
        return (
          <AccordionItem 
            key={index} 
            value={`item-${index}`}
            className={cn(
              "border-b-0 transition-colors duration-200",
              isGroupActive ? "bg-accent/50" : ""
            )}
          >
            <AccordionTrigger 
              className={cn(
                "flex items-center py-2 px-1 transition-all hover:bg-accent/30 rounded-md",
                isGroupActive ? "font-medium" : ""
              )}
            >
              <div className="flex items-center">
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                <span>{group.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-2">
              <div className="flex flex-col space-y-1 pl-6">
                {group.items.map((item: NavItem, itemIndex: number) => {
                  // Support both iconName and custom icon component
                  let ItemIcon = item.icon || iconMap[item.iconName || ""]
                  const isActive = pathname === item.href
                  
                  return (
                    <div
                      key={`${item.href}-${itemIndex}`}
                      onClick={(e) => {
                        e.preventDefault();
                        // Navigate first
                        window.location.href = item.href;
                        // Then close the sidebar after a small delay
                        if (onItemClick) {
                          setTimeout(() => onItemClick(), 50);
                        }
                      }}
                      className={cn(
                        'flex items-center px-4 py-2 text-sm font-medium transition-colors rounded-md group hover:bg-accent hover:text-accent-foreground cursor-pointer',
                        isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <div className="flex items-center">
                        {ItemIcon && <ItemIcon className="mr-2 h-4 w-4" />}
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <Badge variant="outline" className="ml-auto">
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
  )
}