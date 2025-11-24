import { NextRequest, NextResponse } from 'next/server'

// Finnhub API base URL
const FINNHUB_API_URL = 'https://finnhub.io/api/v1'

// Mock company profile data for when the API is unavailable
const MOCK_PROFILE_DATA = {
  country: "US",
  currency: "USD",
  exchange: "NASDAQ",
  ipo: "1980-12-12",
  marketCapitalization: 2500.5,
  name: "Mock Company Inc.",
  phone: "123-456-7890",
  shareOutstanding: 13.5,
  ticker: "MOCK",
  weburl: "https://www.mockcompany.com",
  logo: "https://example.com/logo.png",
  finnhubIndustry: "Technology"
}

// Get company profile data from Finnhub
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 })
    }
    
    // Generate custom mock profile data based on the symbol
    const customMockProfile = {
      ...MOCK_PROFILE_DATA,
      ticker: symbol,
      name: `${symbol.toUpperCase()} Inc.`,
      weburl: `https://www.${symbol.toLowerCase()}.com`,
      // Generate a deterministic but seemingly random market cap based on the symbol
      marketCapitalization: Math.round(
        (symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 900 + 100) * 10
      ) / 10
    }
    
    // Assign industry based on first letter of symbol (just for mock data variety)
    const firstChar = symbol.charAt(0).toLowerCase()
    if (['a', 'b', 'c'].includes(firstChar)) {
      customMockProfile.finnhubIndustry = "Technology"
    } else if (['d', 'e', 'f'].includes(firstChar)) {
      customMockProfile.finnhubIndustry = "Healthcare"
    } else if (['g', 'h', 'i'].includes(firstChar)) {
      customMockProfile.finnhubIndustry = "Financial Services"
    } else if (['j', 'k', 'l'].includes(firstChar)) {
      customMockProfile.finnhubIndustry = "Consumer Cyclical"
    } else if (['m', 'n', 'o'].includes(firstChar)) {
      customMockProfile.finnhubIndustry = "Communication Services"
    } else if (['p', 'q', 'r'].includes(firstChar)) {
      customMockProfile.finnhubIndustry = "Industrials"
    } else if (['s', 't'].includes(firstChar)) {
      customMockProfile.finnhubIndustry = "Consumer Defensive"
    } else if (['u', 'v'].includes(firstChar)) {
      customMockProfile.finnhubIndustry = "Energy"
    } else if (['w', 'x'].includes(firstChar)) {
      customMockProfile.finnhubIndustry = "Basic Materials"
    } else if (['y'].includes(firstChar)) {
      customMockProfile.finnhubIndustry = "Real Estate"
    } else {
      customMockProfile.finnhubIndustry = "Utilities"
    }
    
    // Check if we should use real API or mock data
    const useRealApi = process.env.USE_REAL_FINNHUB_API === 'true'
    const apiKey = process.env.FINNHUB_API_KEY
    
    // If we're not using the real API or don't have an API key, return mock data
    if (!useRealApi || !apiKey) {
      console.log(`Using mock profile data for ${symbol}`)
      return NextResponse.json(customMockProfile)
    }
    
    // Try to fetch from the real API
    try {
      const response = await fetch(
        `${FINNHUB_API_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
        { 
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }
        }
      )
      
      // If the API call fails, use mock data
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Finnhub API error: ${response.status} ${response.statusText}`, errorText)
        return NextResponse.json(customMockProfile)
      }
      
      // If successful, return the real data
      const data = await response.json()
      
      // If the API returns an empty object, use mock data
      if (Object.keys(data).length === 0) {
        console.log(`Finnhub returned empty profile for ${symbol}, using mock data`)
        return NextResponse.json(customMockProfile)
      }
      
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    } catch (fetchError) {
      console.error('Error fetching from Finnhub API:', fetchError)
      return NextResponse.json(customMockProfile)
    }
  } catch (error) {
    console.error('Error processing company profile request:', error)
    return NextResponse.json(MOCK_PROFILE_DATA)
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
