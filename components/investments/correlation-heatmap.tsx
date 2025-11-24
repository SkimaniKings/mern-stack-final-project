"use client"

import { useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CorrelationHeatmapProps {
  investments: any[]
  correlationMatrix: number[][]
}

export function CorrelationHeatmap({ investments, correlationMatrix }: CorrelationHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

  // Function to get color based on correlation value
  const getCorrelationColor = (value: number) => {
    if (value >= 0.8) return "bg-red-500"
    if (value >= 0.6) return "bg-orange-400"
    if (value >= 0.4) return "bg-yellow-300"
    if (value >= 0.2) return "bg-green-300"
    if (value >= 0) return "bg-green-500"
    if (value >= -0.2) return "bg-blue-300"
    if (value >= -0.4) return "bg-blue-400"
    return "bg-blue-500"
  }

  // Function to get text color based on background color
  const getTextColor = (value: number) => {
    if (value >= 0.6 || value <= -0.4) return "text-white"
    return "text-gray-800"
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex">
          {/* Empty top-left cell */}
          <div className="w-32 h-32 flex items-end justify-end p-2 text-xs text-muted-foreground">Correlation</div>

          {/* Column headers */}
          {investments.map((investment, index) => (
            <div key={`col-${index}`} className="w-16 h-32 flex items-center justify-center">
              <div className="transform -rotate-45 origin-center w-32 text-center truncate">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs font-medium cursor-help">{investment.name}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{investment.name}</p>
                      <p className="text-xs text-muted-foreground">{investment.ticker}</p>
                      <p className="text-xs text-muted-foreground">{investment.investment_type}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>

        {/* Rows */}
        {investments.map((investment, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex">
            {/* Row header */}
            <div className="w-32 h-16 flex items-center p-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs font-medium truncate cursor-help">{investment.name}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{investment.name}</p>
                    <p className="text-xs text-muted-foreground">{investment.ticker}</p>
                    <p className="text-xs text-muted-foreground">{investment.investment_type}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Cells */}
            {correlationMatrix[rowIndex].map((correlation, colIndex) => (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                className={`w-16 h-16 flex items-center justify-center ${getCorrelationColor(
                  correlation,
                )} ${getTextColor(correlation)} ${
                  hoveredCell?.row === rowIndex || hoveredCell?.col === colIndex ? "opacity-100" : "opacity-80"
                } ${rowIndex === colIndex ? "border-2 border-gray-800" : ""}`}
                onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                onMouseLeave={() => setHoveredCell(null)}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs font-medium">{correlation.toFixed(2)}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Correlation: {correlation.toFixed(2)}</p>
                      <p className="text-xs">Between:</p>
                      <p className="text-xs">{investments[rowIndex].name}</p>
                      <p className="text-xs">and</p>
                      <p className="text-xs">{investments[colIndex].name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="text-xs text-muted-foreground">Correlation Scale:</div>
        <div className="flex items-center">
          <div className="w-6 h-4 bg-blue-500"></div>
          <span className="text-xs mx-1">-1.0</span>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-4 bg-blue-300"></div>
          <span className="text-xs mx-1">-0.2</span>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-4 bg-green-500"></div>
          <span className="text-xs mx-1">0</span>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-4 bg-green-300"></div>
          <span className="text-xs mx-1">0.2</span>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-4 bg-yellow-300"></div>
          <span className="text-xs mx-1">0.4</span>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-4 bg-orange-400"></div>
          <span className="text-xs mx-1">0.6</span>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-4 bg-red-500"></div>
          <span className="text-xs mx-1">0.8</span>
        </div>
      </div>

      <div className="mt-2 text-xs text-center text-muted-foreground">
        Lower correlation (blue/green) indicates better diversification between investments
      </div>
    </div>
  )
}

