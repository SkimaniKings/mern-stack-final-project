"use client"

import { useEffect, useRef } from "react"
import { type Goal, getGoals } from "@/app/actions/goals"
import { useQuery } from "@tanstack/react-query"
import * as d3 from "d3"

export function GoalNetworkDiagram() {
  const svgRef = useRef<SVGSVGElement>(null)

  // Fetch goals data
  const { data } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { goals } = await getGoals()
      return goals || []
    },
  })

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // Create nodes for each goal
    const nodes = data.map((goal: Goal) => ({
      id: goal.id,
      name: goal.name,
      category: goal.category,
      priority: goal.priority,
      amount: goal.target_amount,
      progress: goal.target_amount > 0 ? goal.current_amount / goal.target_amount : 0,
    }))

    // Create links between goals based on category relationships
    const links: { source: string; target: string; value: number }[] = []

    // Group goals by category
    const goalsByCategory = data.reduce((acc: Record<string, Goal[]>, goal: Goal) => {
      if (!acc[goal.category]) {
        acc[goal.category] = []
      }
      acc[goal.category].push(goal)
      return acc
    }, {})

    // Create links between goals in the same category
    Object.values(goalsByCategory).forEach((categoryGoals) => {
      if (categoryGoals.length > 1) {
        for (let i = 0; i < categoryGoals.length; i++) {
          for (let j = i + 1; j < categoryGoals.length; j++) {
            links.push({
              source: categoryGoals[i].id,
              target: categoryGoals[j].id,
              value: 1,
            })
          }
        }
      }
    })

    // Create a force simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d: any) => Math.sqrt(d.amount) / 10 + 20),
      )

    // Create links
    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.sqrt(d.value))

    // Create nodes
    const node = svg.append("g").selectAll("g").data(nodes).enter().append("g")

    // Add circles to nodes
    node
      .append("circle")
      .attr("r", (d: any) => Math.sqrt(d.amount) / 10 + 15)
      .attr("fill", (d: any) => {
        // Color based on progress
        const r = Math.floor(255 * (1 - d.progress))
        const g = Math.floor(255 * d.progress)
        const b = 100
        return `rgb(${r}, ${g}, ${b})`
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)

    // Add labels to nodes
    node
      .append("text")
      .text((d: any) => (d.name.length > 10 ? d.name.substring(0, 10) + "..." : d.name))
      .attr("x", 0)
      .attr("y", (d: any) => Math.sqrt(d.amount) / 10 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#4b5563")

    // Add tooltips
    node
      .append("title")
      .text(
        (d: any) =>
          `${d.name}\nCategory: ${d.category}\nPriority: ${d.priority}\nProgress: ${(d.progress * 100).toFixed(0)}%`,
      )

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    })

    // Add drag behavior
    node.call(
      d3
        .drag()
        .on("start", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on("drag", (event, d: any) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on("end", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        }) as any,
    )
  }, [data])

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}

