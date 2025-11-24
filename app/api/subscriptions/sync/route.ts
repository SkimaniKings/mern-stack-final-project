import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the subscription data from the request
    const subscriptionData = await request.json();
    
    // Create a Supabase client with the correct cookie handling
    // Note: cookies() returns ReadonlyRequestCookies, not a Promise in Next.js 14
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore
    });
    
    // Try to get the user ID from various sources
    let userId = '00000000-0000-0000-0000-000000000000'; // Default fallback
    
    // Try to get from auth
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch (authError) {
      console.error('Error getting authenticated user:', authError);
    }
    
    // Try to get from headers if not authenticated
    const clientIdHeader = request.headers.get('x-client-id') || 
                          request.headers.get('X-Client-ID');
    if (!userId && clientIdHeader) {
      userId = clientIdHeader;
    }
    
    // Try to get from cookies
    if (!userId) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const clientIdMatch = cookieHeader.match(/client-id=([^;]+)/);
        if (clientIdMatch && clientIdMatch[1]) {
          userId = clientIdMatch[1];
        }
      }
    }
    
    // Insert the subscription into the database
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        ...subscriptionData,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error syncing subscription to database:', error);
      
      // If we get an RLS error, return a specific error message
      if (error.message.includes('row-level security') || error.code === 'PGRST301' || error.code === '42501') {
        return NextResponse.json({ 
          success: false, 
          error: 'Permission denied. Unable to save to database due to security policies.',
          code: 'RLS_ERROR'
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      subscription: data 
    });
  } catch (error: any) {
    console.error('Exception in subscription sync API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
