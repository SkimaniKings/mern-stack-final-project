"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Transaction } from "@/types/finance"

// We'll use Leaflet for the map - dynamically imported to avoid SSR issues

type SpendingHeatmapProps = {
  transactions: Transaction[]
}

export function SpendingHeatmap({ transactions }: SpendingHeatmapProps) {
  const [activeTab, setActiveTab] = useState("map")
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const heatLayerRef = useRef<any>(null)

  // Filter transactions with location data
  const geoTransactions = transactions.filter((t) => t.latitude && t.longitude && !t.is_income)

  // Initialize map when component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && mapRef.current && activeTab === "map") {
      // Dynamically import CSS
      require("leaflet/dist/leaflet.css");
      
      // Dynamic import to avoid SSR issues
      import("leaflet").then((L) => {
        // If map already initialized, return
        if (mapInstanceRef.current) return

        // Initialize map
        const map = L.map(mapRef.current).setView([39.8283, -98.5795], 4) // Center on US

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        // Save map instance
        mapInstanceRef.current = map

        // Add heat layer if we have transactions
        if (geoTransactions.length > 0) {
          import("leaflet.heat").then(() => {
            const points = geoTransactions.map((t) => [
              t.latitude,
              t.longitude,
              t.amount, // Use amount for intensity
            ])

            heatLayerRef.current = L.heatLayer(points, {
              radius: 25,
              blur: 15,
              maxZoom: 10,
              max: Math.max(...geoTransactions.map((t) => t.amount)),
            }).addTo(map)

            // Fit bounds to points
            if (points.length > 0) {
              const latLngs = points.map((p) => [p[0], p[1]])
              map.fitBounds(latLngs)
            }
          })
        }
      })
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current && activeTab !== "map") {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        heatLayerRef.current = null
      }
    }
  }, [activeTab, geoTransactions])

  // Update heat layer when transactions change
  useEffect(() => {
    if (mapInstanceRef.current && heatLayerRef.current && activeTab === "map") {
      const points = geoTransactions.map((t) => [t.latitude, t.longitude, t.amount])

      heatLayerRef.current.setLatLngs(points)
    }
  }, [geoTransactions, activeTab])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Spending Heatmap</CardTitle>
        <CardDescription>Visualize your spending patterns by location</CardDescription>
      </CardHeader>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="list">Location List</TabsTrigger>
          </TabsList>
        </div>
        <CardContent>
          <TabsContent value="map" className="mt-0 pt-4">
            {geoTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center p-4">
                <p className="text-muted-foreground">
                  No location data available. Add transactions with location to see your spending heatmap.
                </p>
              </div>
            ) : (
              <div ref={mapRef} className="h-[400px] w-full rounded-md overflow-hidden" />
            )}
          </TabsContent>
          <TabsContent value="list" className="mt-0 pt-4">
            {geoTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center p-4">
                <p className="text-muted-foreground">
                  No location data available. Add transactions with location to see your spending by location.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Group transactions by merchant and location */}
                  {Object.entries(
                    geoTransactions.reduce(
                      (acc, t) => {
                        const key = `${t.merchant_name || "Unknown"}-${t.latitude}-${t.longitude}`
                        if (!acc[key]) {
                          acc[key] = {
                            merchant: t.merchant_name || "Unknown",
                            latitude: t.latitude,
                            longitude: t.longitude,
                            totalSpent: 0,
                            count: 0,
                          }
                        }
                        acc[key].totalSpent += t.amount
                        acc[key].count += 1
                        return acc
                      },
                      {} as Record<string, any>,
                    ),
                  ).map(([key, data]) => (
                    <Card key={key} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="font-medium">{data.merchant}</div>
                        <div className="text-sm text-muted-foreground">Visits: {data.count}</div>
                        <div className="text-sm font-medium mt-1">Total Spent: ${data.totalSpent.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Lat: {data.latitude.toFixed(6)}, Lng: {data.longitude.toFixed(6)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}

