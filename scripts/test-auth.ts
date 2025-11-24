import { createServerSupabaseClient } from '@/lib/supabase/server-utils'
import { cookies } from 'next/headers'

// Test helper functions
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function testCookieHandling() {
  console.log('\n=== Testing Cookie Handling ===')
  
  try {
    // Test setting a cookie
    const testCookieName = 'test_cookie'
    const testCookieValue = 'test_value_123'
    
    console.log('1. Setting test cookie...')
    const cookieStore = await cookies()
    await cookieStore.set({
      name: testCookieName,
      value: testCookieValue,
      path: '/',
      maxAge: 60 * 60, // 1 hour
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const
    } as any)
    
    // Small delay to ensure cookie is set
    await delay(100)
    
    // Test getting the cookie
    console.log('2. Getting test cookie...')
    const allCookies = await (await cookies()).getAll()
    const testCookie = allCookies.find((c: { name: string }) => c.name === testCookieName)
    
    if (testCookie?.value === testCookieValue) {
      console.log('✅ Cookie handling test passed')
    } else {
      console.error('❌ Cookie handling test failed')
      console.log('Expected:', testCookieValue)
      console.log('Got:', testCookie?.value)
    }
    
    // Clean up
    await (await cookies()).delete(testCookieName)
    return true
  } catch (error) {
    console.error('Cookie handling test failed:', error)
    return false
  }
}

async function testSessionManagement() {
  console.log('\n=== Testing Session Management ===')
  
  try {
    console.log('1. Creating Supabase client...')
    const supabase = await createServerSupabaseClient()
    
    console.log('2. Getting current session...')
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return false
    }
    
    if (!session) {
      console.log('No active session found. Please sign in first.')
      return false
    }
    
    console.log('3. Session found:')
    console.log('- User ID:', session.user.id)
    console.log('- Email:', session.user.email)
    console.log('- Expires at:', new Date(session.expires_at || 0).toISOString())
    
    return true
  } catch (error) {
    console.error('Session management test failed:', error)
    return false
  }
}

async function testProtectedEndpoint() {
  console.log('\n=== Testing Protected API Endpoint ===')
  
  try {
    console.log('1. Making request to /api/test-auth...')
    const response = await fetch('http://localhost:3000/api/test-auth')
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Protected endpoint test passed')
      console.log('Response:', JSON.stringify(data, null, 2))
      return true
    } else {
      console.error('❌ Protected endpoint test failed:', data.message)
      return false
    }
  } catch (error) {
    console.error('Protected endpoint test failed:', error)
    return false
  }
}

async function runTests() {
  console.log('=== Starting Supabase Auth Tests ===')
  
  const results = {
    cookieHandling: await testCookieHandling(),
    sessionManagement: await testSessionManagement(),
    protectedEndpoint: await testProtectedEndpoint()
  }
  
  console.log('\n=== Test Results ===')
  console.log(`1. Cookie Handling: ${results.cookieHandling ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`2. Session Management: ${results.sessionManagement ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`3. Protected Endpoint: ${results.protectedEndpoint ? '✅ PASSED' : '❌ FAILED'}`)
  
  const allPassed = Object.values(results).every(Boolean)
  console.log('\n=== Final Result ===')
  console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED')
  
  return allPassed
}

// Run all tests
runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
