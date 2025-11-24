import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin, getCurrentUserId } from "@/lib/supabase"

// Schema for bill category validation
const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().min(1, "Icon is required"),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
})

// GET /api/bills/categories - Get all bill categories
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure bill categories table exists
    await ensureBillCategoriesTableExists()
    
    // Get all categories (both default and user-created)
    const { data: categories, error } = await supabaseAdmin
      .from('bill_categories')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) {
      console.error("[BILL_CATEGORIES_GET]", error)
      
      // If table doesn't exist despite our attempt to create it, return empty array
      if (error.code === "42P01") {
        return NextResponse.json([])
      }
      
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return NextResponse.json(categories || [])
  } catch (error) {
    console.error("[BILL_CATEGORIES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// POST /api/bills/categories - Create a new bill category
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure bill categories table exists
    await ensureBillCategoriesTableExists()
    
    const body = await req.json()
    const validatedData = categorySchema.parse(body)
    
    // Check if category with same name already exists
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('bill_categories')
      .select('id')
      .ilike('name', validatedData.name)
      .maybeSingle()
    
    if (checkError && checkError.code !== "42P01") {
      console.error("[BILL_CATEGORIES_POST_CHECK]", checkError)
      return new NextResponse(`Database error: ${checkError.message}`, { status: 500 })
    }
    
    if (existingCategory) {
      return new NextResponse("Category with this name already exists", { status: 409 })
    }
    
    // Create the category
    const categoryData = {
      name: validatedData.name,
      color: validatedData.color,
      icon: validatedData.icon,
      description: validatedData.description,
      is_default: validatedData.isDefault,
      user_id: userId, // Track who created the category
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: category, error } = await supabaseAdmin
      .from('bill_categories')
      .insert(categoryData)
      .select()
      .single()
    
    if (error) {
      console.error("[BILL_CATEGORIES_POST]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    
    console.error("[BILL_CATEGORIES_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// PATCH /api/bills/categories - Update a bill category
export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    const body = await req.json()
    
    if (!body.id) {
      return new NextResponse("Category ID is required", { status: 400 })
    }
    
    const validatedData = categorySchema.parse(body)
    
    // Check if category exists
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('bill_categories')
      .select('id, is_default')
      .eq('id', body.id)
      .single()
    
    if (checkError) {
      console.error("[BILL_CATEGORIES_PATCH_CHECK]", checkError)
      
      if (checkError.code === "PGRST116") {
        return new NextResponse("Category not found", { status: 404 })
      }
      
      return new NextResponse(`Database error: ${checkError.message}`, { status: 500 })
    }
    
    // Don't allow editing default categories
    if (existingCategory.is_default) {
      return new NextResponse("Cannot modify default categories", { status: 403 })
    }
    
    // Update the category
    const categoryData = {
      name: validatedData.name,
      color: validatedData.color,
      icon: validatedData.icon,
      description: validatedData.description,
      updated_at: new Date().toISOString()
    }
    
    const { data: category, error } = await supabaseAdmin
      .from('bill_categories')
      .update(categoryData)
      .eq('id', body.id)
      .select()
      .single()
    
    if (error) {
      console.error("[BILL_CATEGORIES_PATCH]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    
    console.error("[BILL_CATEGORIES_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// DELETE /api/bills/categories - Delete a bill category
export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return new NextResponse("Category ID is required", { status: 400 })
    }
    
    // Check if category exists and is not a default category
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('bill_categories')
      .select('id, is_default')
      .eq('id', id)
      .single()
    
    if (checkError) {
      console.error("[BILL_CATEGORIES_DELETE_CHECK]", checkError)
      
      if (checkError.code === "PGRST116") {
        return new NextResponse("Category not found", { status: 404 })
      }
      
      return new NextResponse(`Database error: ${checkError.message}`, { status: 500 })
    }
    
    // Don't allow deleting default categories
    if (existingCategory.is_default) {
      return new NextResponse("Cannot delete default categories", { status: 403 })
    }
    
    // Check if category is in use
    const { count, error: countError } = await supabaseAdmin
      .from('bills')
      .select('id', { count: 'exact', head: true })
      .eq('category', existingCategory.id)
    
    if (countError) {
      console.error("[BILL_CATEGORIES_DELETE_COUNT]", countError)
      return new NextResponse(`Database error: ${countError.message}`, { status: 500 })
    }
    
    if (count && count > 0) {
      return new NextResponse("Cannot delete category that is in use by bills", { status: 409 })
    }
    
    // Delete the category
    const { error } = await supabaseAdmin
      .from('bill_categories')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error("[BILL_CATEGORIES_DELETE]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[BILL_CATEGORIES_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// Helper function to ensure bill categories table exists
async function ensureBillCategoriesTableExists() {
  try {
    // Check if bill_categories table exists
    const { error } = await supabaseAdmin
      .from('bill_categories')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (error && error.code === "42P01") {
      console.log("bill_categories table doesn't exist, creating it...")
      
      // Create bill_categories table using RPC
      const { error: createError } = await supabaseAdmin.rpc('create_bill_categories_table')
      
      if (createError) {
        console.error("Error creating bill_categories table:", createError)
      } else {
        console.log("Successfully created bill_categories table")
        
        // Insert default categories
        const defaultCategories = [
          { name: "Utilities", color: "#3b82f6", icon: "bolt", is_default: true, description: "Electricity, water, gas, etc." },
          { name: "Rent/Mortgage", color: "#ef4444", icon: "home", is_default: true, description: "Housing payments" },
          { name: "Insurance", color: "#10b981", icon: "shield", is_default: true, description: "Health, auto, home insurance" },
          { name: "Internet", color: "#6366f1", icon: "wifi", is_default: true, description: "Internet service provider" },
          { name: "Phone", color: "#f59e0b", icon: "phone", is_default: true, description: "Mobile and landline services" },
          { name: "Groceries", color: "#84cc16", icon: "shopping-cart", is_default: true, description: "Food and household supplies" },
          { name: "Transportation", color: "#8b5cf6", icon: "car", is_default: true, description: "Fuel, public transit, car payments" },
          { name: "Entertainment", color: "#ec4899", icon: "tv", is_default: true, description: "Streaming services, cable, etc." },
          { name: "Medical", color: "#06b6d4", icon: "heart", is_default: true, description: "Healthcare expenses" },
          { name: "Education", color: "#14b8a6", icon: "book", is_default: true, description: "Tuition, books, courses" }
        ]
        
        // Add created_at and updated_at to each category
        const now = new Date().toISOString()
        const categoriesWithTimestamps = defaultCategories.map(category => ({
          ...category,
          created_at: now,
          updated_at: now
        }))
        
        // Insert default categories
        await supabaseAdmin
          .from('bill_categories')
          .insert(categoriesWithTimestamps)
        
        console.log("Created default bill categories")
      }
    }
  } catch (error) {
    console.error("Error ensuring bill_categories table exists:", error)
    // Continue execution even if table creation fails
  }
}
