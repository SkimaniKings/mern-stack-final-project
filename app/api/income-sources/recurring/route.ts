import { NextResponse } from 'next/server'
import { getIncomeSources } from '@/app/actions/income-sources'

/**
 * API route to get recurring income sources
 * Filters out one-time income sources
 */
export async function GET() {
  try {
    // Get all income sources
    const incomeSources = await getIncomeSources()
    
    // Filter for recurring income (exclude one-time sources and those with end dates)
    const recurringIncome = incomeSources.filter(source => {
      // Exclude one-time payments
      if (source.frequency === 'one-time') return false;
      
      // Exclude sources with end dates that have passed
      if (source.end_date) {
        const endDate = new Date(source.end_date);
        const today = new Date();
        if (endDate < today) return false;
      }
      
      // Include primary salary and other recurring income
      return source.type === 'primary' || 
             source.type === 'passive' || 
             source.frequency === 'monthly' || 
             source.frequency === 'bi-weekly' || 
             source.frequency === 'weekly';
    })
    
    // Return only recurring income sources
    return NextResponse.json(recurringIncome)
  } catch (error) {
    console.error('Error fetching recurring income sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring income sources' },
      { status: 500 }
    )
  }
}
