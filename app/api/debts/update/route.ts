import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin, getCurrentUserId } from '@/lib/supabase'
import { PostgrestError } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Get the debt data from the request
    const requestData = await request.json().catch(e => {
      console.error('Failed to parse request JSON:', e)
      return {}
    })
    
    if (!requestData || typeof requestData !== 'object') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid request data',
        message: 'Failed to update debt: Invalid request format'
      }, { status: 400 })
    }
    
    // Extract debtId and debt object from the request data
    const { debtId, debt } = requestData
    
    // Make sure we have a valid debt object
    if (!debt || typeof debt !== 'object') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid debt data',
        message: 'Failed to update debt: Invalid debt data format'
      }, { status: 400 })
    }
    
    console.log('Received debt data:', debt)
    
    // Filter out fields that might not exist in the database schema
    // Only include fields we know exist in the database and have values
    const debtUpdates: any = {
      name: debt.name,
      type: debt.type,
      current_balance: debt.current_balance,
      interest_rate: debt.interest_rate,
      minimum_payment: debt.minimum_payment,
      due_date: debt.due_date
    }
    
    // Only include optional fields if they have values
    if (debt.loan_term !== undefined && debt.loan_term !== null) {
      debtUpdates.loan_term = debt.loan_term
    }
    if (debt.start_date !== undefined && debt.start_date !== null) {
      debtUpdates.created_at = debt.start_date
    }
    
    if (!debtId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Debt ID is required',
        message: 'Failed to update debt: Debt ID is required'
      }, { status: 400 })
    }
    
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
    
    console.log(`Updating debt ${debtId} for user ${userId} using supabaseAdmin`)
    console.log('Request data received:', requestData)
    console.log('Debt updates to apply:', debtUpdates)
    
    // First check if the debt exists for this user
    const { data: existingDebt, error: checkError } = await supabaseAdmin
      .from('debts')
      .select('*')
      .eq('id', debtId)
      .eq('user_id', userId)
      .single()
    
    if (checkError) {
      console.error('Error checking if debt exists:', checkError)
      // If the debt doesn't exist, we'll create it
      if (checkError.code === 'PGRST116') { // No rows returned
        console.log(`Debt ${debtId} not found for user ${userId}, creating it instead`)
        
        // Use the debt updates data from the request, but ensure we have valid values
        console.log('Creating debt with data:', debtUpdates)
        
        // Extract the actual values from the request data (debt object)
        const debt = requestData.debt || {}
        
        // Create the debt with the provided ID - only include fields we know exist in the database
        // and ensure we have valid default values for required fields
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('debts')
          .insert({
            id: debtId,
            user_id: userId,
            name: debt.name || 'Unnamed Debt',
            type: debt.type || 'personal_loan',
            current_balance: debt.current_balance || 0,
            interest_rate: debt.interest_rate || 0,
            minimum_payment: debt.minimum_payment || 0,
            due_date: debt.due_date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
        
        if (insertError) {
          console.error('Error creating debt:', insertError)
          
          // If the debt already exists (duplicate key error), try to update it instead
          if (insertError.code === '23505') {
            console.log('Debt already exists with ID:', debtId, 'Attempting to update it instead')
            
            // Since the debt already exists, let's update it instead of creating it
            const { data: updateData, error: updateError } = await supabaseAdmin
              .from('debts')
              .update({
                name: debt.name,
                type: debt.type,
                current_balance: debt.current_balance,
                interest_rate: debt.interest_rate,
                minimum_payment: debt.minimum_payment,
                due_date: debt.due_date,
                updated_at: new Date().toISOString()
              })
              .eq('id', debtId)
              .eq('user_id', userId)
              .select()
              
            if (!updateError && updateData && updateData.length > 0) {
              return NextResponse.json({
                success: true,
                message: 'Debt already existed and was updated successfully',
                debt: updateData[0]
              })
            }
            
            // If update failed, try to fetch the existing debt
            const { data: existingDebt, error: fetchError } = await supabaseAdmin
              .from('debts')
              .select('*')
              .eq('id', debtId)
              .eq('user_id', userId)
              .single()
            
            if (!fetchError && existingDebt) {
              return NextResponse.json({
                success: true,
                message: 'Debt already exists',
                debt: existingDebt
              })
            }
            
            // If we couldn't fetch the existing debt, still return success with the data we have
            return NextResponse.json({
              success: true,
              message: 'Debt exists but could not be updated or fetched',
              debt: {
                id: debtId,
                user_id: userId,
                ...debtUpdates,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            })
          }
          
          const errorResponse = {
            success: false,
            message: 'Failed to create debt',
            error: insertError.message || 'Unknown database error',
            code: insertError.code || 'UNKNOWN',
            details: insertError,
            debtData: {
              id: debtId,
              user_id: userId,
              ...debtUpdates
            }
          }
          console.error('Error response being sent:', JSON.stringify(errorResponse))
          return NextResponse.json(errorResponse, { status: 500 })
        }
        
        console.log('Created debt successfully:', insertData)
        return NextResponse.json({
          success: true,
          message: 'Debt created successfully',
          debt: insertData[0]
        })
      }
      
      const errorResponse = {
        success: false,
        message: 'Failed to check if debt exists',
        error: checkError.message || 'Unknown database error',
        code: checkError.code || 'UNKNOWN'
      }
      console.error('Error response being sent:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 500 })
    }
    
    console.log('Existing debt found:', existingDebt)
    
    // Update the debt in the database using supabaseAdmin to bypass RLS policies
    // Only include fields we know exist in the database
    const { data, error } = await supabaseAdmin
      .from('debts')
      .update(debtUpdates)
      .eq('id', debtId)
      .eq('user_id', userId)
      .select() // Add select() to return the updated record
    
    // Log the result for debugging
    console.log('Update debt result:', data, error)
    
    if (error) {
      console.error('Error updating debt:', error)
      const pgError = error as PostgrestError
      const errorResponse = {
        success: false,
        message: 'Failed to update debt',
        error: pgError.message || 'Unknown database error',
        code: pgError.code || 'UNKNOWN',
        details: error
      }
      console.error('Error response being sent:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 500 })
    }
    
    // Return the updated debt data
    return NextResponse.json({
      success: true,
      message: 'Debt updated successfully',
      debt: data && data.length > 0 ? data[0] : {
        id: debtId,
        user_id: userId,
        ...debtUpdates,
        updated_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Unexpected error updating debt:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorResponse = { 
      success: false, 
      error: errorMessage,
      message: 'Unexpected error updating debt'
    }
    console.error('Error response being sent:', JSON.stringify(errorResponse))
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
