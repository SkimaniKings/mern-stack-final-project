'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip } from "@/components/ui/tooltip"
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CorrelationHeatmapProps {
  assets: string[]
  correlationMatrix: number[][]
}

export function CorrelationHeatmap({ assets, correlationMatrix }: CorrelationHeatmapProps) {
  // Handle empty data
  if (!assets || assets.length === 0 || !correlationMatrix || correlationMatrix.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Correlation</CardTitle>
          <CardDescription>
            See how your investments correlate with each other
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-muted-foreground mb-2">No correlation data available.</p>
          <p className="text-sm text-muted-foreground">Add at least two investments to your portfolio to see correlation analysis.</p>
        </CardContent>
      </Card>
    )
  }
  // Generate color based on correlation value
  const getColor = (value: number) => {
    // Red for negative correlation, blue for positive
    if (value < 0) {
      const intensity = Math.min(255, Math.round(255 * Math.abs(value)))
      return `rgb(${intensity}, 0, 0)`
    } else {
      const intensity = Math.min(255, Math.round(255 * value))
      return `rgb(0, 0, ${intensity})`
    }
  }

  // Get text color based on background color intensity
  const getTextColor = (value: number) => {
    return Math.abs(value) > 0.5 ? 'white' : 'black'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Correlation</CardTitle>
        <CardDescription>
          See how your investments correlate with each other
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 border"></th>
                {assets.map((asset, index) => (
                  <th key={index} className="p-2 border text-sm font-medium">
                    {asset}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="p-2 border font-medium text-sm">{asset}</td>
                  {correlationMatrix[rowIndex]?.map((value, colIndex) => (
                    <TooltipProvider key={colIndex}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <td 
                            className="p-2 border text-center" 
                            style={{ 
                              backgroundColor: getColor(value),
                              color: getTextColor(value)
                            }}
                          >
                            {value.toFixed(2)}
                          </td>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{assets[rowIndex]} ↔ {assets[colIndex]}</p>
                          <p>Correlation: {value.toFixed(2)}</p>
                          <p className="text-xs mt-1">
                            {value > 0.7 ? 'Strong positive correlation' :
                             value > 0.3 ? 'Moderate positive correlation' :
                             value > 0 ? 'Weak positive correlation' :
                             value > -0.3 ? 'Weak negative correlation' :
                             value > -0.7 ? 'Moderate negative correlation' :
                             'Strong negative correlation'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p><span className="inline-block w-3 h-3 bg-blue-700 mr-2"></span> Strong positive correlation (assets move together)</p>
          <p><span className="inline-block w-3 h-3 bg-blue-300 mr-2"></span> Weak positive correlation</p>
          <p><span className="inline-block w-3 h-3 bg-red-300 mr-2"></span> Weak negative correlation</p>
          <p><span className="inline-block w-3 h-3 bg-red-700 mr-2"></span> Strong negative correlation (assets move in opposite directions)</p>
        </div>
      </CardContent>
    </Card>
  )
}
