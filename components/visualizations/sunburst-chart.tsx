"use client"

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

// Define interfaces for our data structure
interface SunburstNode {
  name: string
  value: number
  color?: string
  children?: SunburstNode[]
}

interface SunburstChartProps {
  data: SunburstNode
  darkMode?: boolean
}

// Extend the d3 types to include the properties we need
interface PartitionedNode extends d3.HierarchyRectangularNode<SunburstNode> {
  x0: number
  x1: number
  y0: number
  y1: number
}

export default function SunburstChart({ data, darkMode = false }: SunburstChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{ content: string, x: number, y: number, visible: boolean }>({
    content: '',
    x: 0,
    y: 0,
    visible: false
  })
  
  useEffect(() => {
    if (!svgRef.current || !data) return
    
    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove()
    
    const width = svgRef.current.clientWidth
    const height = 400
    const radius = Math.min(width, height) / 2
    
    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`)
    
    // Create a color scale with custom colors from data when available
    const color = (d: d3.HierarchyNode<SunburstNode>) => {
      // If the node has a custom color defined, use it
      if (d.data.color) {
        return d.data.color;
      }
      // Otherwise use a default color scale
      return d3.schemeCategory10[d.data.name.charCodeAt(0) % 10];
    }
    
    // Create the partition layout
    const partition = d3.partition()
      .size([2 * Math.PI, radius])
    
    // Create the root hierarchy
    const root = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))
    
    // Generate the arcs
    const arc = d3.arc<any, PartitionedNode>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1)
    
    // Apply the partition layout
    partition(root)
    
    // Create the arcs
    svg.selectAll("path")
      .data(root.descendants().filter(d => d.depth))
      .join("path")
      .attr("fill", d => {
        // For depth 1 nodes (main categories), use their custom color
        if (d.depth === 1) {
          return color(d);
        }
        // For deeper nodes (merchants), use a shade of their parent category's color
        let parent = d.parent;
        if (parent) {
          while (parent.depth > 1 && parent.parent) parent = parent.parent;
          return color(parent);
        }
        return '#cccccc'; // Fallback color
      })
      .attr("fill-opacity", d => 1 - d.depth / 3)
      .attr("d", arc as any)
      .attr("stroke", darkMode ? "#1f2937" : "#fff")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        // Format the value as currency
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        })
        
        // Calculate percentage of total
        const percentage = ((d.value || 0) / (root.value || 1) * 100).toFixed(1)
        
        // Create tooltip content
        const content = `
          <div class="font-medium">${d.data.name}</div>
          <div>${formatter.format(d.value)}</div>
          <div>${percentage}% of total</div>
        `
        
        setTooltip({
          content,
          x: event.pageX,
          y: event.pageY,
          visible: true
        })
      })
      .on("mousemove", (event) => {
        setTooltip(prev => ({
          ...prev,
          x: event.pageX,
          y: event.pageY
        }))
      })
      .on("mouseout", () => {
        setTooltip(prev => ({
          ...prev,
          visible: false
        }))
      })
    
    // Add labels
    svg.selectAll("text")
      .data(root.descendants().filter(d => {
        const node = d as unknown as PartitionedNode;
        return d.depth && ((node.y1 - node.y0) * (node.x1 - node.x0) > 0.03);
      }))
      .join("text")
      .attr("transform", function(d) {
        const node = d as unknown as PartitionedNode;
        const x = (node.x0 + node.x1) / 2 * 180 / Math.PI;
        const y = (node.y0 + node.y1) / 2;
        const rotate = x - 90;
        return `rotate(${rotate}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .attr("text-anchor", "middle")
      .attr("fill", darkMode ? "#fff" : "#333")
      .text(d => d.data.name)
      .style("pointer-events", "none")
    
    // Add center circle with total
    svg.append("circle")
      .attr("r", radius * 0.15)
      .attr("fill", darkMode ? "#374151" : "#f3f4f6")
      .attr("stroke", darkMode ? "#4b5563" : "#e5e7eb")
    
    // Add total amount text
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("fill", darkMode ? "#fff" : "#333")
      .attr("dy", "-0.5em")
      .text("Total")
    
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", darkMode ? "#d1d5db" : "#6b7280")
      .attr("dy", "1em")
      .text(() => {
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        })
        return formatter.format(root.value || 0)
      })
    
  }, [data, darkMode])
  
  return (
    <>
      <svg 
        ref={svgRef} 
        className="w-full h-[400px]"
        style={{ 
          background: darkMode ? '#1f2937' : '#f9fafb',
          borderRadius: '0.375rem'
        }}
      />
      {tooltip.visible && (
        <div 
          className={`absolute bg-white dark:bg-gray-800 p-2 rounded shadow-lg text-sm pointer-events-none transition-opacity duration-200 ${tooltip.visible ? 'opacity-100' : 'opacity-0'}`}
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y - 28}px`,
            zIndex: 1000
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </>
  )
}
