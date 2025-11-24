import { NextResponse } from 'next/server'
import { getRecurringPatterns } from '@/app/actions/recurring-patterns'

/**
 * API route to get recurring expense patterns
 * Returns all detected recurring expense patterns
 */
export async function GET() {
  try {
    // Get all recurring patterns
    const patterns = await getRecurringPatterns()
    
    // Return the recurring expense patterns
    return NextResponse.json(patterns)
  } catch (error) {
    console.error('Error fetching recurring expense patterns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring expense patterns' },
      { status: 500 }
    )
  }
}
