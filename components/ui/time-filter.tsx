"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export type TimeFilterValue = "1M" | "3M" | "6M" | "1Y" | "2Y" | "ALL"

interface TimeFilterProps {
  value: TimeFilterValue
  onValueChange: (value: TimeFilterValue) => void
}

export function TimeFilter({ value, onValueChange }: TimeFilterProps) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(val) => val && onValueChange(val as TimeFilterValue)}>
      <ToggleGroupItem value="1M" aria-label="1 Month">
        1M
      </ToggleGroupItem>
      <ToggleGroupItem value="3M" aria-label="3 Months">
        3M
      </ToggleGroupItem>
      <ToggleGroupItem value="6M" aria-label="6 Months">
        6M
      </ToggleGroupItem>
      <ToggleGroupItem value="1Y" aria-label="1 Year">
        1Y
      </ToggleGroupItem>
      <ToggleGroupItem value="2Y" aria-label="2 Years">
        2Y
      </ToggleGroupItem>
      <ToggleGroupItem value="ALL" aria-label="All Time">
        ALL
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

