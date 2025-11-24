import { NextRequest, NextResponse } from 'next/server'
import { DebtService } from '@/lib/debt/debt-service'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin, getCurrentUserId } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null
    
    // Get authenticated user ID from server-side Supabase
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required',
        error: 'Could not initialize Supabase client'
      }, { status: 401 })
    }
    
    try {
      // Get the authenticated user ID using the server-side client
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !user.id) {
        return NextResponse.json({
          success: false,
          message: 'Authentication required',
          error: 'User not authenticated'
        }, { status: 401 })
      }
      
      userId = user.id
      console.log(`Using authenticated user ID: ${userId}`)
    } catch (authError) {
      console.error('Error getting authenticated user:', authError)
      return NextResponse.json({
        success: false,
        message: 'Authentication error',
        error: authError instanceof Error ? authError.message : 'Unknown authentication error'
      }, { status: 401 })
    }
    
    console.log(`Fetching debts for user ${userId} using supabaseAdmin`)
    
    // Fetch debts for this user using direct query with supabaseAdmin
    // This bypasses RLS policies completely, similar to how we fixed the subscription system
    const { data: debts, error: supabaseError } = await supabaseAdmin
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    // Log the result for debugging
    console.log(`Fetched debts using supabaseAdmin:`, debts?.length || 0, 'debts found')
    
    // If no debts were found, try a more direct approach with a raw query
    if (!debts || debts.length === 0) {
      console.log('No debts found, trying direct SQL query')
      
      // Use a direct SQL query to fetch the debts
      const { data: sqlDebts, error: sqlError } = await supabaseAdmin
        .from('debts')
        .select('*')
        .filter('user_id', 'eq', userId)
        .order('created_at', { ascending: false })
      
      if (sqlError) {
        console.error('Error fetching debts with direct query:', sqlError)
      } else if (sqlDebts && sqlDebts.length > 0) {
        console.log(`Found ${sqlDebts.length} debts using direct query`)
        return NextResponse.json({
          success: true,
          message: 'Debts fetched successfully',
          debts: sqlDebts
        })
      } else {
        console.log('Still no debts found with direct query')
      }
    }
    
    // Check for errors first
    if (supabaseError) {
      console.error('Error fetching debts:', supabaseError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch debts',
        error: typeof supabaseError === 'object' && supabaseError !== null && 'message' in supabaseError 
          ? String(supabaseError.message) 
          : 'Unknown database error'
      }, { status: 500 })
    }
    
    // If no debts are found, return an empty array
    if (!debts || debts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No debts found',
        debts: []
      })
    }
    
    console.log('Successfully fetched debts via API:', { success: true, message: 'Debts fetched successfully', debts: debts })
    
    return NextResponse.json({
      success: true,
      message: 'Debts fetched successfully',
      debts: debts
    })
  } catch (error) {
    console.error('Unexpected error fetching debts:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      message: 'Unexpected error fetching debts'
    }, { status: 500 })
  }
}
