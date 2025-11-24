"use client"

import { useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"

// Fix Leaflet marker icon issue
import { fixLeafletIcon } from "@/lib/utils"

interface MapComponentProps {
  heatmapData: Array<{
    lat: number
    lng: number
    intensity: number
    expense: {
      id: string
      description: string
      amount: number
      category: string
      date: string
      isImpulse: boolean
    }
  }>
  darkMode?: boolean
}

const MapComponent = ({ heatmapData, darkMode = false }: MapComponentProps) => {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    // Dynamically import Leaflet
    const L = require('leaflet')
    // Dynamically import Leaflet.heat
    require('leaflet.heat')
    
    // Fix Leaflet marker icon issue
    fixLeafletIcon()

    // Initialize map if it doesn't exist
    if (!mapRef.current && mapContainerRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([0, 0], 2)

      // Use different tile layers based on theme
      const tileLayer = darkMode
        ? L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
          })
        : L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          })

      tileLayer.addTo(mapRef.current)
    }

    // Return cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [darkMode])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || !mapRef.current || heatmapData.length === 0) return
    
    // Dynamically import Leaflet
    const L = require('leaflet')

    // Clear any existing layers
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) return // Keep the base tile layer
      layer.remove()
    })

    // Filter out any invalid coordinates
    const validData = heatmapData.filter(
      (point) => point.lat !== 0 && point.lng !== 0
    )

    if (validData.length === 0) return

    // Create markers for each expense location
    validData.forEach((point) => {
      const marker = L.marker([point.lat, point.lng])
        .addTo(mapRef.current!)
        .bindPopup(
          `<div>
            <strong>${point.expense.description}</strong>
            <p>Amount: $${point.expense.amount.toFixed(2)}</p>
            <p>Category: ${point.expense.category}</p>
            <p>Date: ${new Date(point.expense.date).toLocaleDateString()}</p>
            ${point.expense.isImpulse ? '<p class="text-yellow-500">Impulse Purchase</p>' : ''}
          </div>`
        )
    })

    // Create heatmap layer
    const heatData = validData.map((point) => [
      point.lat,
      point.lng,
      Math.min(point.intensity / 100, 1), // Normalize intensity
    ])

    // @ts-ignore - Leaflet.heat is not typed
    const heatLayer = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.4: "blue", 0.65: "lime", 1: "red" },
    }).addTo(mapRef.current)

    // Fit bounds to show all points
    const bounds = L.latLngBounds(validData.map((point) => [point.lat, point.lng]))
    mapRef.current.fitBounds(bounds, { padding: [50, 50] })

  }, [heatmapData, darkMode])

  return <div ref={mapContainerRef} className="h-full w-full" />
}

export default MapComponent
