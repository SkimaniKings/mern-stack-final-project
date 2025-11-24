import { NextRequest, NextResponse } from 'next/server'

// Finnhub API base URL
const FINNHUB_API_URL = 'https://finnhub.io/api/v1'

// Mock data for when the API is unavailable
const MOCK_STOCK_DATA = {
  c: 150.25, // Current price
  h: 152.50, // High price of the day
  l: 148.30, // Low price of the day
  o: 149.80, // Open price of the day
  pc: 148.50, // Previous close price
  d: 1.75,   // Change
  dp: 1.18   // Percent change
}

// Mock search results
const MOCK_SEARCH_RESULTS = {
  count: 3,
  result: [
    {
      description: "TESLA INC",
      displaySymbol: "TSLA",
      symbol: "TSLA",
      type: "Common Stock"
    },
    {
      description: "APPLE INC",
      displaySymbol: "AAPL",
      symbol: "AAPL",
      type: "Common Stock"
    },
    {
      description: "MICROSOFT CORP",
      displaySymbol: "MSFT",
      symbol: "MSFT",
      type: "Common Stock"
    }
  ]
}

// Get stock quote data from Finnhub
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 })
    }
    
    const apiKey = process.env.FINNHUB_API_KEY
    
    if (!apiKey) {
      console.error('Finnhub API key not found in environment variables')
      // Return mock data for development if API key is not available
      return NextResponse.json(MOCK_STOCK_DATA)
    }
    
    // Fetch quote data from Finnhub
    try {
      const response = await fetch(
        `${FINNHUB_API_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
        { 
          cache: 'no-store', // Disable caching to ensure fresh data
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Finnhub API error: ${response.status} ${response.statusText}`, errorText)
        // Return mock data instead of throwing an error
        return NextResponse.json(MOCK_STOCK_DATA)
      }
      
      const data = await response.json()
      
      // Add CORS headers
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    } catch (fetchError) {
      console.error('Error fetching from Finnhub API:', fetchError)
      // Return mock data if the API call fails
      return NextResponse.json(MOCK_STOCK_DATA)
    }
  } catch (error) {
    console.error('Error processing stock data request:', error)
    // Return mock data even if there's an error in processing
    return NextResponse.json(MOCK_STOCK_DATA)
  }
}

// Search for stocks by name or symbol
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = body.query
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }
    
    const apiKey = process.env.FINNHUB_API_KEY
    
    if (!apiKey) {
      console.error('Finnhub API key not found in environment variables')
      // Return mock data for development if API key is not available
      return NextResponse.json(MOCK_SEARCH_RESULTS)
    }
    
    // Search for symbols using Finnhub
    try {
      const response = await fetch(
        `${FINNHUB_API_URL}/search?q=${encodeURIComponent(query)}&token=${apiKey}`,
        { 
          cache: 'no-store', // Disable caching to ensure fresh data
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Finnhub API error: ${response.status} ${response.statusText}`, errorText)
        // Return mock data instead of throwing an error
        return NextResponse.json(MOCK_SEARCH_RESULTS)
      }
      
      const data = await response.json()
      
      // Add CORS headers
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    } catch (fetchError) {
      console.error('Error fetching from Finnhub API:', fetchError)
      // Return mock data if the API call fails
      return NextResponse.json(MOCK_SEARCH_RESULTS)
    }
  } catch (error) {
    console.error('Error processing stock search request:', error)
    // Return mock data even if there's an error in processing
    return NextResponse.json(MOCK_SEARCH_RESULTS)
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
