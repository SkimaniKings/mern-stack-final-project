import { NextRequest, NextResponse } from 'next/server'

// Finnhub API base URL
const FINNHUB_API_URL = 'https://finnhub.io/api/v1'

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

// Search for stocks by name or symbol
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }
    
    // Generate custom mock search results based on the query
    const customMockResults = {
      count: 3,
      result: [
        {
          description: `${query.toUpperCase()} INC`,
          displaySymbol: query.toUpperCase().substring(0, 4),
          symbol: query.toUpperCase().substring(0, 4),
          type: "Common Stock"
        },
        {
          description: `${query.toUpperCase()} HOLDINGS`,
          displaySymbol: `${query.toUpperCase().substring(0, 3)}H`,
          symbol: `${query.toUpperCase().substring(0, 3)}H`,
          type: "Common Stock"
        },
        {
          description: `GLOBAL ${query.toUpperCase()} ETF`,
          displaySymbol: `G${query.toUpperCase().substring(0, 3)}`,
          symbol: `G${query.toUpperCase().substring(0, 3)}`,
          type: "ETF"
        }
      ]
    }
    
    // Check if we should use real API or mock data
    const useRealApi = process.env.USE_REAL_FINNHUB_API === 'true'
    const apiKey = process.env.FINNHUB_API_KEY
    
    // If we're not using the real API or don't have an API key, return mock data
    if (!useRealApi || !apiKey) {
      console.log(`Using mock search results for "${query}"`)
      return NextResponse.json(customMockResults)
    }
    
    // Try to fetch from the real API
    try {
      console.log(`Searching Finnhub for "${query}" with API key: ${apiKey?.substring(0, 3)}...`);
      const response = await fetch(
        `${FINNHUB_API_URL}/search?q=${encodeURIComponent(query)}&token=${apiKey}`,
        { 
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }
        }
      )
      
      // If the API call fails, use mock data
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Finnhub API error: ${response.status} ${response.statusText}`, errorText)
        return NextResponse.json(customMockResults)
      }
      
      // If successful, return the real data
      const data = await response.json()
      console.log(`Finnhub search results for "${query}":`, data);
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    } catch (fetchError) {
      console.error('Error fetching from Finnhub API:', fetchError)
      return NextResponse.json(customMockResults)
    }
  } catch (error) {
    console.error('Error processing stock search request:', error)
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
