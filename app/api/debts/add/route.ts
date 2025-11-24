import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentUserId } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    // Get the debt data from the request
    const debtData = await request.json()
    
    if (!debtData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Debt data is required',
        message: 'Failed to add debt: No debt data provided'
      }, { status: 400 })
    }
    
    // Get authenticated user from server-side
    let userId = null
    
    // Get authenticated user from Supabase auth
    try {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !user.id) {
        return NextResponse.json({
          success: false,
          message: 'Authentication required',
          error: 'User not authenticated'
        }, { status: 401 })
      }
      
      userId = user.id
      console.log(`Server: Using authenticated user ID: ${userId}`)
    } catch (authError) {
      console.error('Server: Error getting authenticated user from Supabase:', authError)
      return NextResponse.json({
        success: false,
        message: 'Authentication error',
        error: authError instanceof Error ? authError.message : 'Unknown authentication error'
      }, { status: 401 })
    }
    
    console.log(`Adding debt for user ${userId} using supabaseAdmin`)
    
    // Generate a UUID for the debt
    const debtId = crypto.randomUUID()
    
    // Add the debt to the database using direct insert with supabaseAdmin
    // This bypasses RLS policies completely, similar to how we fixed the subscription system
    const { data, error } = await supabaseAdmin
      .from('debts')
      .insert({
        id: debtId,
        user_id: userId,
        name: debtData.name,
        type: debtData.type || 'personal_loan',
        current_balance: debtData.current_balance || 0,
        principal: debtData.principal || debtData.current_balance || 0,
        interest_rate: debtData.interest_rate || 0,
        minimum_payment: debtData.minimum_payment || 0,
        loan_term: debtData.loan_term || 0,
        due_date: debtData.due_date,
        payment_frequency: debtData.payment_frequency || 'monthly',
        status: debtData.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
    
    // Log the result for debugging
    console.log('Insert debt result:', data, error)
    
    if (error) {
      console.error('Error adding debt:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        message: 'Failed to add debt'
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debt added successfully',
      debt: data[0]
    })
  } catch (error) {
    console.error('Unexpected error adding debt:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      message: 'Unexpected error adding debt'
    }, { status: 500 })
  }
}
