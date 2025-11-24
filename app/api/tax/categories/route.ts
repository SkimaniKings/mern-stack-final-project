import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin, getCurrentUserId } from "@/lib/supabase"

// Schema for tax category validation
const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  color: z.string().min(1, "Color is required"),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
})

// GET /api/tax/categories - Get all tax categories
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    try {
      // Try to ensure tax categories table exists
      await ensureTaxCategoriesTableExists()
      
      // Get all categories (both default and user-created)
      const { data: categories, error } = await supabaseAdmin
        .from('tax_categories')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) {
        console.error("[TAX_CATEGORIES_GET]", error)
        
        // If table doesn't exist despite our attempt to create it, return fallback categories
        if (error.code === "42P01") {
          return NextResponse.json(getDefaultCategories())
        }
        
        // For any other database error, return fallback categories
        console.warn("Database error, returning default categories", error)
        return NextResponse.json(getDefaultCategories())
      }
      
      return NextResponse.json(categories && categories.length > 0 ? categories : getDefaultCategories())
    } catch (error) {
      console.error("[TAX_CATEGORIES_GET] Error accessing database:", error)
      // Return fallback categories for any error
      return NextResponse.json(getDefaultCategories())
    }
  } catch (error) {
    console.error("[TAX_CATEGORIES_GET]", error)
    // Even in case of critical errors, return fallback categories
    return NextResponse.json(getDefaultCategories())
  }
}

// Helper function to get default tax categories
function getDefaultCategories() {
  return [
    { id: "1", name: "Housing", type: "deduction", color: "#3b82f6", is_default: true },
    { id: "2", name: "Charity", type: "deduction", color: "#10b981", is_default: true },
    { id: "3", name: "Healthcare", type: "deduction", color: "#ef4444", is_default: true },
    { id: "4", name: "Education", type: "deduction", color: "#f59e0b", is_default: true },
    { id: "5", name: "Business", type: "deduction", color: "#8b5cf6", is_default: true },
    { id: "6", name: "Other", type: "deduction", color: "#6b7280", is_default: true }
  ]
}

// POST /api/tax/categories - Create a new tax category
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Ensure tax categories table exists
    await ensureTaxCategoriesTableExists()
    
    const body = await req.json()
    const validatedData = categorySchema.parse(body)
    
    // Check if category with same name already exists
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('tax_categories')
      .select('id')
      .ilike('name', validatedData.name)
      .maybeSingle()
    
    if (checkError && checkError.code !== "42P01") {
      console.error("[TAX_CATEGORIES_POST_CHECK]", checkError)
      return NextResponse.json({ error: `Database error: ${checkError.message}` }, { status: 500 })
    }
    
    if (existingCategory) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 409 })
    }
    
    // Create the category
    const categoryData = {
      name: validatedData.name,
      type: validatedData.type,
      color: validatedData.color,
      description: validatedData.description,
      is_default: validatedData.isDefault,
      user_id: userId, // Track who created the category
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: category, error } = await supabaseAdmin
      .from('tax_categories')
      .insert(categoryData)
      .select()
      .single()
    
    if (error) {
      console.error("[TAX_CATEGORIES_POST]", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }
    
    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    
    console.error("[TAX_CATEGORIES_POST]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// PATCH /api/tax/categories - Update a tax category
export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await req.json()
    
    if (!body.id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 })
    }
    
    const validatedData = categorySchema.parse(body)
    
    // Check if category exists
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('tax_categories')
      .select('id, is_default')
      .eq('id', body.id)
      .single()
    
    if (checkError) {
      console.error("[TAX_CATEGORIES_PATCH_CHECK]", checkError)
      
      if (checkError.code === "PGRST116") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
      
      return NextResponse.json({ error: `Database error: ${checkError.message}` }, { status: 500 })
    }
    
    // Don't allow editing default categories
    if (existingCategory.is_default) {
      return NextResponse.json({ error: "Cannot modify default categories" }, { status: 403 })
    }
    
    // Update the category
    const categoryData = {
      name: validatedData.name,
      type: validatedData.type,
      color: validatedData.color,
      description: validatedData.description,
      updated_at: new Date().toISOString()
    }
    
    const { data: category, error } = await supabaseAdmin
      .from('tax_categories')
      .update(categoryData)
      .eq('id', body.id)
      .select()
      .single()
    
    if (error) {
      console.error("[TAX_CATEGORIES_PATCH]", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }
    
    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    
    console.error("[TAX_CATEGORIES_PATCH]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// DELETE /api/tax/categories - Delete a tax category
export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 })
    }
    
    // Check if category exists and is not a default category
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('tax_categories')
      .select('id, is_default')
      .eq('id', id)
      .single()
    
    if (checkError) {
      console.error("[TAX_CATEGORIES_DELETE_CHECK]", checkError)
      
      if (checkError.code === "PGRST116") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
      
      return NextResponse.json({ error: `Database error: ${checkError.message}` }, { status: 500 })
    }
    
    // Don't allow deleting default categories
    if (existingCategory.is_default) {
      return NextResponse.json({ error: "Cannot delete default categories" }, { status: 403 })
    }
    
    // Check if category is in use
    const { count, error: countError } = await supabaseAdmin
      .from('tax_entries')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', existingCategory.id)
    
    if (countError && countError.code !== "42P01") {
      console.error("[TAX_CATEGORIES_DELETE_COUNT]", countError)
      return new NextResponse(`Database error: ${countError.message}`, { status: 500 })
    }
    
    if (count && count > 0) {
      return NextResponse.json({ error: "Cannot delete category that is in use by tax entries" }, { status: 409 })
    }
    
    // Delete the category
    const { error } = await supabaseAdmin
      .from('tax_categories')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error("[TAX_CATEGORIES_DELETE]", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }
    
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[TAX_CATEGORIES_DELETE]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// Helper function to ensure tax categories table exists
async function ensureTaxCategoriesTableExists() {
  try {
    // Check if tax_categories table exists
    const { error } = await supabaseAdmin
      .from('tax_categories')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (error && error.code === "42P01") {
      console.log("tax_categories table doesn't exist, creating it...")
      
      // Create tax_categories table using RPC
      const { error: createError } = await supabaseAdmin.rpc('create_tax_categories_table')
      
      if (createError) {
        console.error("Error creating tax_categories table:", createError)
        
        // If RPC doesn't exist, create the table directly
        try {
          const createTableSQL = `
            CREATE TABLE tax_categories (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              color TEXT NOT NULL,
              description TEXT,
              is_default BOOLEAN DEFAULT FALSE,
              user_id UUID REFERENCES auth.users(id),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            ALTER TABLE tax_categories ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Users can view default tax categories and their own"
              ON tax_categories FOR SELECT
              USING (is_default = true OR auth.uid() = user_id);
            
            CREATE POLICY "Users can insert their own tax categories"
              ON tax_categories FOR INSERT
              WITH CHECK (auth.uid() = user_id);
            
            CREATE POLICY "Users can update their own tax categories"
              ON tax_categories FOR UPDATE
              USING (auth.uid() = user_id AND is_default = false);
            
            CREATE POLICY "Users can delete their own tax categories"
              ON tax_categories FOR DELETE
              USING (auth.uid() = user_id AND is_default = false);
          `
          
          await supabaseAdmin.rpc('exec_sql', { sql: createTableSQL })
          console.log("Created tax_categories table directly")
        } catch (directCreateError) {
          console.error("Error creating tax_categories table directly:", directCreateError)
          return
        }
      }
      
      console.log("Successfully created tax_categories table")
      
      // Insert default categories
      const defaultCategories = [
        { name: "Business Expenses", type: "deduction", color: "#4CAF50", is_default: true, description: "Expenses related to running a business" },
        { name: "Charitable Donations", type: "deduction", color: "#2196F3", is_default: true, description: "Donations to qualified charitable organizations" },
        { name: "Medical Expenses", type: "deduction", color: "#F44336", is_default: true, description: "Qualifying medical and dental expenses" },
        { name: "Education Expenses", type: "deduction", color: "#9C27B0", is_default: true, description: "Tuition, fees, and other education costs" },
        { name: "Retirement Contributions", type: "deduction", color: "#FF9800", is_default: true, description: "Contributions to qualified retirement accounts" },
        { name: "Mortgage Interest", type: "deduction", color: "#607D8B", is_default: true, description: "Interest paid on home mortgages" },
        { name: "State and Local Taxes", type: "deduction", color: "#795548", is_default: true, description: "State income, sales, and property taxes" },
        { name: "Home Office", type: "deduction", color: "#8BC34A", is_default: true, description: "Expenses for using part of your home for business" },
        { name: "Investment Income", type: "income", color: "#3F51B5", is_default: true, description: "Income from investments like dividends and capital gains" },
        { name: "Rental Income", type: "income", color: "#009688", is_default: true, description: "Income from rental properties" },
        { name: "Self-Employment Income", type: "income", color: "#FF5722", is_default: true, description: "Income from self-employment or freelance work" },
        { name: "Wages and Salary", type: "income", color: "#673AB7", is_default: true, description: "Income from employment" }
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
        .from('tax_categories')
        .insert(categoriesWithTimestamps)
      
      console.log("Created default tax categories")
    }
  } catch (error) {
    console.error("Error ensuring tax_categories table exists:", error)
    // Continue execution even if table creation fails
  }
}

// Helper function to create the stored procedure for creating tax categories table
async function createTaxCategoriesTableFunction() {
  try {
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION create_tax_categories_table()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        CREATE TABLE IF NOT EXISTS tax_categories (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          color TEXT NOT NULL,
          description TEXT,
          is_default BOOLEAN DEFAULT FALSE,
          user_id UUID REFERENCES auth.users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        ALTER TABLE tax_categories ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view default tax categories and their own"
          ON tax_categories FOR SELECT
          USING (is_default = true OR auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own tax categories"
          ON tax_categories FOR INSERT
          WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own tax categories"
          ON tax_categories FOR UPDATE
          USING (auth.uid() = user_id AND is_default = false);
        
        CREATE POLICY "Users can delete their own tax categories"
          ON tax_categories FOR DELETE
          USING (auth.uid() = user_id AND is_default = false);
      END;
      $$;
    `
    
    await supabaseAdmin.rpc('exec_sql', { sql: createFunctionSQL })
    console.log("Created create_tax_categories_table function")
  } catch (error) {
    console.error("Error creating create_tax_categories_table function:", error)
  }
}
