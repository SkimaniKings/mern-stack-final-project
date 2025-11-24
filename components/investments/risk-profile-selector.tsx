import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface RiskProfile {
  id: string
  name: string
  description: string
  targetAllocations: {
    [key: string]: number
  }
  expectedReturn?: number
  expectedRisk?: number
}

interface RiskProfileSelectorProps {
  profiles: RiskProfile[]
  selectedProfile: RiskProfile
  onSelectProfile: (profile: RiskProfile) => void
}

export function RiskProfileSelector({
  profiles,
  selectedProfile,
  onSelectProfile,
}: RiskProfileSelectorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Risk Profile</CardTitle>
        <CardDescription>
          Select a risk profile that matches your investment goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={selectedProfile.id}
          onValueChange={(value) => {
            const profile = profiles.find((p) => p.id === value)
            if (profile) {
              onSelectProfile(profile)
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a risk profile" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-4">
          <h4 className="font-medium mb-2">{selectedProfile.name}</h4>
          <p className="text-sm text-muted-foreground">{selectedProfile.description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
