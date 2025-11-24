"use client"

import { useState } from "react"
import { ResponsiveTreeMap } from "@nivo/treemap"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

interface TreemapNode {
  id: string
  name: string
  value: number
  color: string
  children?: TreemapNode[]
  parentId?: string
}

function transformToTreemapData(categories: any[], parentId?: string): TreemapNode[] {
  return categories.map(category => ({
    id: category.name,
    name: category.name,
    value: category.amount,
    color: getColorByHealth(category.percentage),
    parentId,
    children: category.subcategories
      ? transformToTreemapData(category.subcategories, category.name)
      : undefined,
  }))
}

function getColorByHealth(percentage: number): string {
  if (percentage > 90) return "#ef4444" // Red - over budget
  if (percentage > 75) return "#f97316" // Orange - warning
  if (percentage > 50) return "#eab308" // Yellow - caution
  return "#22c55e" // Green - healthy
}

export function InteractiveTreemap({ data, onCategoryClick }: {
  data: {
    categories: any[]
    totalBudget: number
  }
  onCategoryClick?: (category: any) => void
}) {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [focusedNode, setFocusedNode] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)

  const treemapData = {
    id: "root",
    name: "Budget",
    children: transformToTreemapData(data.categories),
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleNodeClick = (node: any) => {
    if (node.data.children) {
      setFocusedNode(focusedNode === node.id ? null : node.id)
    }
    
    const category = data.categories.find(c => c.name === node.id)
    if (category && onCategoryClick) {
      onCategoryClick(category)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Budget Allocation</CardTitle>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRotate}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Rotate View</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="h-[500px]"
          style={{
            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            transition: "transform 0.3s ease",
          }}
        >
          <ResponsiveTreeMap
            data={treemapData}
            identity="name"
            value="value"
            valueFormat=">$,.2f"
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            labelSkipSize={12}
            labelTextColor={{ from: "color", modifiers: [["darker", 1.2]] }}
            parentLabelPosition="left"
            parentLabelTextColor={{ from: "color", modifiers: [["darker", 2]] }}
            borderColor={{ from: "color", modifiers: [["darker", 0.1]] }}
            nodeOpacity={0.9}
            animate={true}
            motionConfig="gentle"
            onClick={handleNodeClick}
            tooltip={({ node }) => {
              // Cast the node data to include our custom properties
              const nodeData = node.data as any;
              
              return (
                <div className="bg-white p-2 shadow rounded">
                  <strong>{nodeData.name}</strong>
                  <br />
                  Amount: ${node.value.toLocaleString()}
                  <br />
                  {nodeData.parentId && `Category: ${nodeData.parentId}`}
                </div>
              );
            }}
            theme={{
              tooltip: {
                container: {
                  background: "white",
                  color: "black",
                  fontSize: "12px",
                },
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
