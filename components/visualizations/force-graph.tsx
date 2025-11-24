"use client"

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface NetworkNode {
  id: string
  name: string
  value: number
  count: number
  categories: string[]
}

interface NetworkLink {
  source: string
  target: string
  value: number
  categories: string[]
}

interface NetworkData {
  nodes: NetworkNode[]
  links: NetworkLink[]
}

interface ForceGraphProps {
  data: NetworkData
  darkMode?: boolean
}

export function ForceGraph({ data, darkMode = false }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove()
    
    const width = svgRef.current.clientWidth
    const height = 500
    
    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      
    // Set up the simulation
    const simulation = d3.forceSimulation(data.nodes as any)
      .force("link", d3.forceLink(data.links as any)
        .id((d: any) => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1))
    
    // Create a color scale for categories
    const categoryColors = d3.scaleOrdinal(d3.schemeCategory10)
    
    // Create the links
    const link = svg.append("g")
      .attr("stroke", darkMode ? "#555" : "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value) * 1.5)
      .attr("stroke", d => categoryColors(d.categories[0]))
    
    // Create a tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "absolute bg-white dark:bg-gray-800 p-2 rounded shadow-lg text-sm pointer-events-none opacity-0 transition-opacity duration-200")
      .style("z-index", "1000")
    
    // Create the nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("mouseover", (event, d) => {
        tooltip.transition()
          .duration(200)
          .style("opacity", .9)
        
        tooltip.html(`
          <div class="font-medium">${d.name}</div>
          <div>Total spent: $${d.value.toFixed(2)}</div>
          <div>Transactions: ${d.count}</div>
          <div>Categories: ${d.categories.join(", ")}</div>
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px")
      })
      .on("mouseout", () => {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0)
      })
      .call(drag(simulation) as any)
    
    // Add circles to the nodes
    node.append("circle")
      .attr("r", d => Math.sqrt(d.value) / 5 + 5)
      .attr("fill", d => categoryColors(d.categories[0] || "Unknown"))
      .attr("stroke", darkMode ? "#fff" : "#333")
      .attr("stroke-width", 1.5)
    
    // Add labels to the nodes
    node.append("text")
      .attr("x", 0)
      .attr("y", d => -Math.sqrt(d.value) / 5 - 7)
      .attr("text-anchor", "middle")
      .attr("fill", darkMode ? "#fff" : "#333")
      .attr("font-size", "10px")
      .text(d => d.name)
    
    // Set up the simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => Math.max(10, Math.min(width - 10, d.source.x)))
        .attr("y1", (d: any) => Math.max(10, Math.min(height - 10, d.source.y)))
        .attr("x2", (d: any) => Math.max(10, Math.min(width - 10, d.target.x)))
        .attr("y2", (d: any) => Math.max(10, Math.min(height - 10, d.target.y)))
      
      node.attr("transform", (d: any) => `translate(${Math.max(10, Math.min(width - 10, d.x))},${Math.max(10, Math.min(height - 10, d.y))})`)
    })
    
    // Drag behavior
    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
      }
      
      function dragged(event: any) {
        event.subject.fx = event.x
        event.subject.fy = event.y
      }
      
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0)
        event.subject.fx = null
        event.subject.fy = null
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    }
    
    // Cleanup
    return () => {
      simulation.stop()
      tooltip.remove()
    }
  }, [data, darkMode])
  
  return (
    <svg 
      ref={svgRef} 
      className="w-full h-[500px]"
      style={{ 
        background: darkMode ? '#1f2937' : '#f9fafb',
        borderRadius: '0.375rem'
      }}
    />
  )
}
