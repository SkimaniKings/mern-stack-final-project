"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { seedInitialData } from "@/app/actions/seed-data"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface SeedDatabaseProps {
  userId: string
}

export function SeedDatabase({ userId }: SeedDatabaseProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSeed = async () => {
    try {
      setIsLoading(true)
      await seedInitialData(userId)
      toast({
        title: "Database seeded successfully",
        description: "Sample data has been added to your account.",
      })
    } catch (error) {
      console.error("Error seeding database:", error)
      toast({
        title: "Error seeding database",
        description: "An error occurred while adding sample data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleSeed} disabled={isLoading} variant="outline" size="sm">
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Seeding...
        </>
      ) : (
        "Seed fghf"
      )}
    </Button>
  )
}

