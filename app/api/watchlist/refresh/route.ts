import { NextRequest, NextResponse } from 'next/server'

// Simplified API route for watchlist price refresh
// This version doesn't require authentication and provides mock data

// Helper function to generate mock stock data for a ticker
function generateMockStockData(ticker: string) {
  // Generate deterministic but seemingly random values based on the ticker
  const symbolHash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const basePrice = 100 + (symbolHash % 900) / 10
  
  // Add some randomness to make it look like real-time updates
  const randomFactor = Math.random() * 0.1 - 0.05 // -5% to +5%
  const currentPrice = basePrice * (1 + randomFactor)
  
  // Calculate other values based on the current price
  const previousClose = basePrice * 0.99
  const change = currentPrice - previousClose
  const changePercent = (change / previousClose) * 100
  
  return {
    price: parseFloat(currentPrice.toFixed(2)),
    previous_close: parseFloat(previousClose.toFixed(2)),
    price_change: parseFloat(change.toFixed(2)),
    price_change_percent: parseFloat(changePercent.toFixed(2)),
    day_high: parseFloat((currentPrice * 1.02).toFixed(2)),
    day_low: parseFloat((currentPrice * 0.98).toFixed(2)),
    last_updated: new Date().toISOString()
  }
}

// POST endpoint to refresh watchlist prices
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    const { tickers } = body
    
    // If no tickers are provided but items are provided, use the tickers from the items
    if ((!tickers || !Array.isArray(tickers) || tickers.length === 0) && body.items && Array.isArray(body.items) && body.items.length > 0) {
      // Extract tickers from items
      const itemTickers = body.items.map((item: any) => item.ticker).filter(Boolean)
      if (itemTickers.length > 0) {
        // Use the tickers from items
        body.tickers = itemTickers
      } else {
        // Return empty success response for empty watchlist
        return NextResponse.json({ success: true, items: [] })
      }
    } else if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      // Return empty success response for empty watchlist
      return NextResponse.json({ success: true, items: [] })
    }
    
    // Get the items from the request body if provided, otherwise create mock items
    let items = body.items || tickers.map((ticker: string) => ({
      id: `mock-${ticker}-${Date.now()}`,
      ticker,
      name: `${ticker.toUpperCase()} Inc.`,
      price: 100,
      target_price: Math.random() > 0.5 ? 120 : null,
      notes: "",
      sector: ["Technology", "Healthcare", "Financial Services", "Consumer Cyclical"][Math.floor(Math.random() * 4)],
      price_alerts: Math.random() > 0.7,
      alert_threshold: Math.random() > 0.7 ? 110 : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    // Update each item with fresh mock data
    const updatedItems = items.map((item: any) => {
      const mockData = generateMockStockData(item.ticker)
      
      // Calculate if the price has reached or crossed the alert threshold
      const hasReachedAlertThreshold = 
        item.price_alerts && 
        item.alert_threshold !== null && 
        mockData.price >= item.alert_threshold
      
      // Return the updated item
      return {
        ...item,
        price: mockData.price,
        previous_close: mockData.previous_close,
        price_change: mockData.price_change,
        price_change_percent: mockData.price_change_percent,
        day_high: mockData.day_high,
        day_low: mockData.day_low,
        last_updated: mockData.last_updated,
        alert_triggered: hasReachedAlertThreshold
      }
    })
    
    // Return the updated items
    return NextResponse.json({ 
      success: true, 
      items: updatedItems 
    })
  } catch (error) {
    console.error("Error refreshing watchlist prices:", error)
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 })
  }
}
