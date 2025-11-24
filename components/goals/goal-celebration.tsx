"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useWindowSize } from '@/lib/hooks/use-window-size'

// Dynamically import react-confetti to avoid SSR issues
const ReactConfetti = dynamic(() => import('react-confetti'), { ssr: false })

interface GoalCelebrationProps {
  isCompleted: boolean
  goalName: string
  onCelebrationEnd?: () => void
}

export function GoalCelebration({ isCompleted, goalName, onCelebrationEnd }: GoalCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const { width, height } = useWindowSize()

  useEffect(() => {
    if (isCompleted) {
      // Start the celebration
      setShowConfetti(true)
      setShowMessage(true)

      // Hide confetti after 8 seconds
      const confettiTimer = setTimeout(() => {
        setShowConfetti(false)
      }, 8000)

      // Hide message after 10 seconds
      const messageTimer = setTimeout(() => {
        setShowMessage(false)
        if (onCelebrationEnd) {
          onCelebrationEnd()
        }
      }, 10000)

      return () => {
        clearTimeout(confettiTimer)
        clearTimeout(messageTimer)
      }
    }
  }, [isCompleted, onCelebrationEnd])

  if (!isCompleted || (!showConfetti && !showMessage)) {
    return null
  }

  return (
    <>
      {showConfetti && (
        <ReactConfetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.15}
          colors={['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']}
        />
      )}
      
      {showMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white/90 dark:bg-gray-900/90 p-8 rounded-lg shadow-lg max-w-md text-center animate-bounce-slow pointer-events-auto">
            <h2 className="text-3xl font-bold mb-4 text-green-600 dark:text-green-500">
              Congratulations!
            </h2>
            <p className="text-xl mb-2">
              You've achieved your goal:
            </p>
            <p className="text-2xl font-bold mb-4">
              {goalName}
            </p>
            <div className="flex justify-center">
              <div className="animate-pulse">
                <span className="text-5xl">🎉</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
