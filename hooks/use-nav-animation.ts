"use client"

import { useState, useEffect } from "react"

export function useNavAnimation() {
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  return {
    mounted,
    hovered,
    setHovered,
    isHovered: (id: string) => hovered === id,
  }
}

