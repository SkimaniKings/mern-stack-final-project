"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getBillCategories } from "@/app/actions/bill-categories"

interface BillCategorySelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function BillCategorySelector({
  value,
  onChange,
  placeholder = "Select bill category",
  className,
}: BillCategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true)
        const { categories: fetchedCategories } = await getBillCategories()
        setCategories(fetchedCategories || [])
      } catch (error) {
        console.error("Error loading bill categories:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
  }, [])

  const selectedCategory = categories.find((category) => category.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={loading}
        >
          {loading
            ? "Loading categories..."
            : value && selectedCategory
            ? selectedCategory.name
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => {
                    onChange(category.id === value ? "" : category.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category.name}
                </CommandItem>
              ))}
            </CommandGroup>
            
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
