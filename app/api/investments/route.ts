import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"

export async function POST(request: Request) {
  try {
    // Get current user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.set({ name, value: "", ...options })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    const userId = session.user.id

    console.log("Processing investment creation for user:", userId)

    // Parse form data
    const formData = await request.formData()
    const name = formData.get("name") as string
    const ticker = formData.get("ticker") as string
    const type = formData.get("type") as string
    const valueStr = formData.get("value") as string
    const costBasisStr = formData.get("cost_basis") as string
    const account = formData.get("account") as string

    console.log("Received investment data:", { name, ticker, type, valueStr, costBasisStr, account })

    // Validate required fields
    if (!name || !type) {
      console.error("Missing required fields")
      return NextResponse.json({ error: "Missing required fields: name and type are required" }, { status: 400 })
    }

    const value = parseFloat(valueStr)
    const costBasis = parseFloat(costBasisStr)

    if (isNaN(value) || isNaN(costBasis)) {
      console.error("Invalid numeric values")
      return NextResponse.json({ error: "Invalid value or cost basis" }, { status: 400 })
    }

    // Calculate allocation based on total portfolio value
    let allocation = 0
    try {
      // Get total portfolio value
      const { data: portfolioData, error: portfolioError } = await supabase
        .from("investments")
        .select("value")
        .eq("user_id", userId)
      
      if (!portfolioError && portfolioData) {
        const totalPortfolioValue = portfolioData.reduce((sum, investment) => sum + (investment.value || 0), 0) + value
        allocation = totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 100
      }
    } catch (allocError) {
      console.error("Error calculating allocation:", allocError)
      // Continue with allocation = 0 if calculation fails
    }

    // Insert into database
    try {
      // Check if investments table exists
      const { error: tableCheckError } = await supabase
        .from("investments")
        .select("id", { count: 'exact', head: true })
        .limit(1)
      
      // If table doesn't exist, create it
      if (tableCheckError && tableCheckError.code === "42P01") {
        console.log("Investments table doesn't exist, creating it...")
        
        // Create investments table
        const { error: createTableError } = await supabase.rpc('create_investments_table')
        
        if (createTableError) {
          console.error("Error creating investments table:", createTableError)
          return NextResponse.json({ error: "Failed to create investments table" }, { status: 500 })
        }
      }

      // Insert the investment
      const { data, error } = await supabase
        .from("investments")
        .insert({
          user_id: userId,
          name,
          ticker: ticker || null,
          type,
          value,
          cost_basis: costBasis,
          account,
          allocation,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) {
        console.error("Database error adding investment:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Update allocations for all investments
      await updateAllInvestmentAllocations(supabase, userId)

      // Revalidate the investments page
      revalidatePath("/investments")
      return NextResponse.json(data)
    } catch (dbError) {
      console.error("Error in database operation:", dbError)
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in investments API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to update allocations for all investments
async function updateAllInvestmentAllocations(supabase: any, userId: string) {
  try {
    // Get all investments
    const { data: investments, error } = await supabase
      .from("investments")
      .select("id, value")
      .eq("user_id", userId)
    
    if (error || !investments) {
      console.error("Error fetching investments for allocation update:", error)
      return
    }
    
    // Calculate total portfolio value
    const totalValue = investments.reduce((sum: number, investment: { id: string, value: number }) => sum + (investment.value || 0), 0)
    
    if (totalValue <= 0) return
    
    // Update each investment's allocation
    for (const investment of investments) {
      const allocation = (investment.value / totalValue) * 100
      
      await supabase
        .from("investments")
        .update({ 
          allocation,
          updated_at: new Date().toISOString()
        })
        .eq("id", investment.id)
        .eq("user_id", userId)
    }
  } catch (error) {
    console.error("Error updating investment allocations:", error)
  }
}

// GET endpoint to fetch investments
export async function GET(request: Request) {
  try {
    // Get current user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.set({ name, value: "", ...options })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    const userId = session.user.id

    // Get investments from database
    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error fetching investments:", error)
      
      // If the table doesn't exist, return empty array
      if (error.code === "42P01") {
        return NextResponse.json([])
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in investments GET API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
