import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import * as z from "zod"

// Schema for tax impact predictions (frontend sends 'scenario' which maps to DB column 'financial_decision')
const taxImpactPredictionSchema = z.object({
  id: z.string().optional(),
  scenario: z.string().min(1),
  description: z.string().optional(),
  estimated_tax_impact: z.number().optional(),
  difference: z.number().optional(),
  current_tax_burden: z.number().optional(),
  predicted_tax_burden: z.number().optional(),
  notes: z.string().optional(),
})

// GET /api/tax/predictions/:id - Get a specific tax prediction
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id
    
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: "Prediction ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("tax_impact_predictions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching tax prediction:", error)
      return NextResponse.json({ error: "Tax prediction not found" }, { status: 404 })
    }
    
    // Enhance the response with the metadata from notes if available
    let enhancedResponse = data;
    
    // Try to parse metadata from notes if it exists
    if (data.notes && data.notes.startsWith('{')) {
      try {
        const metadata = JSON.parse(data.notes);
        enhancedResponse = {
          ...data,
          current_tax_burden: metadata.current_tax_burden,
          predicted_tax_burden: metadata.predicted_tax_burden,
          // Keep the original difference value or use estimated_tax_impact
          difference: data.estimated_tax_impact
        };
        console.log('Enhanced GET response with metadata:', enhancedResponse);
      } catch (e) {
        console.log('Could not parse metadata from notes:', e);
      }
    }

    return NextResponse.json(enhancedResponse)
  } catch (error) {
    console.error("Error in GET /api/tax/predictions/:id:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/tax/predictions/:id - Update a tax prediction
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id
    
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: "Prediction ID is required" }, { status: 400 })
    }

    const body = await request.json()
    
    // Log the received body for debugging
    console.log('Received update body:', JSON.stringify(body))

    // Use a more flexible approach for validation
    // Validate request body
    const result = taxImpactPredictionSchema.safeParse(body)
    if (!result.success) {
      console.error('Validation error:', result.error.format())
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify ownership
    const { data: existingPrediction, error: fetchError } = await supabase
      .from("tax_impact_predictions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingPrediction) {
      console.error("Failed to find tax prediction for update.", {
        userId: user.id,
        predictionIdFromUrl: id,
        predictionIdFrombody: body.id,
        error: fetchError,
      })
      return NextResponse.json({ error: "Tax prediction not found" }, { status: 404 })
    }

    // Prepare update data with only the columns that exist in the database
    // Based on the error message, we need to avoid current_tax_burden, predicted_tax_burden, and updated_at
    const { data: validatedData } = result;

    const metadata: Record<string, any> = {
      current_tax_burden: validatedData.current_tax_burden || 0,
      predicted_tax_burden: validatedData.predicted_tax_burden || 0,
    };

    if (validatedData.notes && validatedData.notes.trim() !== '') {
        metadata.user_notes = validatedData.notes;
    }

    const updateData = {
      financial_decision: validatedData.scenario,
      description: validatedData.description,
      estimated_tax_impact: validatedData.estimated_tax_impact ?? validatedData.difference,
      notes: JSON.stringify(metadata),
    };

    
    // Log the update data for debugging
    console.log('Update data being sent to database:', JSON.stringify(updateData))

    try {
      // Since we're having issues with the update operation,
      // let's use a delete and insert approach instead
      console.log('Using delete and insert approach instead of update')
      
      // First, check if the record exists and get its data
      const { data: existingData, error: checkError } = await supabase
        .from("tax_impact_predictions")
        .select('*')
        .eq("id", id)
        .eq("user_id", user.id)
        .single()
        
      if (checkError) {
        console.error("Error checking tax prediction:", checkError)
        return NextResponse.json({ error: `Failed to find tax prediction: ${checkError.message}` }, { status: 404 })
      }
      
      // Store the original ID to maintain consistency
      const originalId = existingData.id
      
      // Step 1: Delete the existing record
      const { error: deleteError } = await supabase
        .from("tax_impact_predictions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
      
      if (deleteError) {
        console.error("Error deleting tax prediction:", deleteError)
        return NextResponse.json({ error: `Failed to delete tax prediction: ${deleteError.message}` }, { status: 500 })
      }
      
      // Step 2: Insert a new record with the same ID
      const insertData = {
        id: originalId, // Use the same ID
        user_id: user.id,
        financial_decision: updateData.financial_decision,
        description: updateData.description,
        estimated_tax_impact: updateData.estimated_tax_impact,
        notes: updateData.notes
      }
      
      console.log('Inserting new record with data:', JSON.stringify(insertData))
      
      const { data: newRecord, error: insertError } = await supabase
        .from("tax_impact_predictions")
        .insert(insertData)
        .select()
        .single()
      
      if (insertError) {
        console.error("Error inserting tax prediction:", insertError)
        return NextResponse.json({ error: `Failed to insert tax prediction: ${insertError.message}` }, { status: 500 })
      }
      
      // Enhance the response with the metadata from notes if available
      let enhancedResponse = newRecord;
      
      // Try to parse metadata from notes if it exists
      if (newRecord.notes && newRecord.notes.startsWith('{')) {
        try {
          const metadata = JSON.parse(newRecord.notes);
          enhancedResponse = {
            ...newRecord,
            current_tax_burden: metadata.current_tax_burden,
            predicted_tax_burden: metadata.predicted_tax_burden,
            // Keep the original difference value
            difference: newRecord.estimated_tax_impact
          };
        } catch (e) {
          console.log('Could not parse metadata from notes:', e);
        }
      }
      
      // Always include the tax burden values from the original request
      // This ensures they're available even if the notes parsing fails
      enhancedResponse = {
        ...enhancedResponse,
        current_tax_burden: result.data.current_tax_burden || enhancedResponse.current_tax_burden,
        predicted_tax_burden: result.data.predicted_tax_burden || enhancedResponse.predicted_tax_burden,
        difference: result.data.difference || enhancedResponse.difference || enhancedResponse.estimated_tax_impact
      };
      
      return NextResponse.json(enhancedResponse)
    } catch (dbError) {
      console.error("Exception during database update:", dbError)
      return NextResponse.json({ error: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in PUT /api/tax/predictions/:id:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tax/predictions/:id - Delete a tax prediction
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id
    
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: "Prediction ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify ownership
    const { data: existingPrediction, error: fetchError } = await supabase
      .from("tax_impact_predictions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingPrediction) {
      return NextResponse.json({ error: "Tax prediction not found" }, { status: 404 })
    }

    // Delete the prediction
    const { error } = await supabase
      .from("tax_impact_predictions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting tax prediction:", error)
      return NextResponse.json({ error: "Failed to delete tax prediction" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tax/predictions/:id:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
