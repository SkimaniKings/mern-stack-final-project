import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

interface Deduction {
  id: string;
  name: string;
  amount: number;
}

interface SimulationResult {
  baseSalary: number;
  deductions: {
    preTax: Deduction[];
    postTax: Deduction[];
  };
  taxes: {
    total: number;
    brackets: {
      rate: string;
      amount: number;
      incomeRange: string;
    }[];
  };
  estimatedTakeHome: number;
  id?: string;
}

// Default US federal tax brackets for 2024 (fallback if database has no data)
const DEFAULT_TAX_BRACKETS = [
  { income_from: 0, income_to: 11600, tax_rate: 10 },
  { income_from: 11600, income_to: 47150, tax_rate: 12 },
  { income_from: 47150, income_to: 100525, tax_rate: 22 },
  { income_from: 100525, income_to: 191950, tax_rate: 24 },
  { income_from: 191950, income_to: 243725, tax_rate: 32 },
  { income_from: 243725, income_to: 609350, tax_rate: 35 },
  { income_from: 609350, income_to: null, tax_rate: 37 }
];

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error("Unauthorized user attempted to use paycheck simulation")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await request.json()
    console.log("Received simulation request:", body)
    
    const { baseSalary, deductions, taxInfo } = body
    const country = taxInfo?.country || "US"
    const region = taxInfo?.region || "Federal"
    
    if (!baseSalary || isNaN(Number(baseSalary))) {
      console.error("Invalid base salary provided:", baseSalary)
      return NextResponse.json({ error: "Valid base salary is required" }, { status: 400 })
    }
    
    // Ensure required tables exist
    await ensureTablesExist(supabase)
    
    // Get tax brackets for the specified country and region
    let taxBrackets = null;
    let taxError = null;
    
    try {
      const result = await supabase
        .from("tax_brackets")
        .select("*")
        .eq("country", country)
        .eq("region", region)
        .order("income_from", { ascending: true });
      
      taxBrackets = result.data;
      taxError = result.error;
    } catch (error) {
      console.error("Error querying tax brackets:", error);
      // Continue with fallback brackets
    }
    
    if (taxError) {
      console.error("Error fetching tax brackets:", taxError);
      // Continue with fallback brackets
    }
    
    console.log(`Found ${taxBrackets?.length || 0} tax brackets for ${country}/${region}`);
    
    // Use fallback tax brackets if none found in database
    if (!taxBrackets || taxBrackets.length === 0) {
      console.log("Using default tax brackets as fallback");
      taxBrackets = DEFAULT_TAX_BRACKETS;
      
      // Try to insert default tax brackets if table exists but is empty
      if (taxError === null) {
        try {
          const defaultBracketsWithCountry = DEFAULT_TAX_BRACKETS.map(bracket => ({
            ...bracket,
            country: "US",
            region: "Federal"
          }));
          
          await supabase
            .from("tax_brackets")
            .insert(defaultBracketsWithCountry);
            
          console.log("Inserted default tax brackets into database");
        } catch (insertError) {
          console.error("Error inserting default tax brackets:", insertError);
        }
      }
    }
    
    // Calculate pre-tax deductions
    const preTaxDeductions = deductions?.preTax || []
    const totalPreTaxDeductions = preTaxDeductions.reduce((sum: number, deduction: Deduction) => sum + Number(deduction.amount), 0)
    
    // Calculate taxable income
    const taxableIncome = Number(baseSalary) - totalPreTaxDeductions
    
    console.log(`Base salary: ${baseSalary}, Pre-tax deductions: ${totalPreTaxDeductions}, Taxable income: ${taxableIncome}`)
    
    // Calculate taxes based on brackets
    let totalTax = 0
    let appliedBrackets = []
    
    if (taxBrackets && taxBrackets.length > 0) {
      let remainingIncome = taxableIncome
      
      for (const bracket of taxBrackets) {
        const bracketMin = Number(bracket.income_from)
        const bracketMax = bracket.income_to ? Number(bracket.income_to) : Infinity
        const rate = Number(bracket.tax_rate) / 100
        
        if (remainingIncome <= 0) break
        
        const incomeInBracket = Math.min(remainingIncome, bracketMax - bracketMin)
        
        if (incomeInBracket > 0) {
          const taxForBracket = incomeInBracket * rate
          totalTax += taxForBracket
          
          appliedBrackets.push({
            rate: `${bracket.tax_rate}%`,
            amount: taxForBracket,
            incomeRange: `$${bracketMin.toLocaleString()} - ${bracketMax === Infinity ? '∞' : '$' + bracketMax.toLocaleString()}`
          })
          
          remainingIncome -= incomeInBracket
        }
      }
    } else {
      // This should never happen now with the fallback brackets, but keeping as extra safety
      const estimatedTaxRate = 0.25 // 25% as a fallback
      totalTax = taxableIncome * estimatedTaxRate
      
      appliedBrackets.push({
        rate: "25% (estimated)",
        amount: totalTax,
        incomeRange: "All income"
      })
      
      console.log("No tax brackets found, using fallback 25% rate")
    }
    
    // Calculate post-tax deductions
    const postTaxDeductions = deductions?.postTax || []
    const totalPostTaxDeductions = postTaxDeductions.reduce((sum: number, deduction: Deduction) => sum + Number(deduction.amount), 0)
    
    // Calculate estimated take-home pay
    const estimatedTakeHome = taxableIncome - totalTax - totalPostTaxDeductions
    
    console.log(`Total tax: ${totalTax}, Post-tax deductions: ${totalPostTaxDeductions}, Take-home: ${estimatedTakeHome}`)
    
    // Prepare the simulation result
    const simulationResult: SimulationResult = {
      baseSalary: Number(baseSalary),
      deductions: {
        preTax: preTaxDeductions,
        postTax: postTaxDeductions
      },
      taxes: {
        total: totalTax,
        brackets: appliedBrackets
      },
      estimatedTakeHome
    }
    
    // Try to save the simulation
    try {
      const { data: savedSimulation, error: saveError } = await supabase
        .from("paycheck_simulations")
        .insert({
          user_id: user.id,
          base_salary: baseSalary,
          deductions: {
            preTax: preTaxDeductions,
            postTax: postTaxDeductions
          },
          taxes: {
            total: totalTax,
            brackets: appliedBrackets
          },
          estimated_take_home: estimatedTakeHome,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (saveError) {
        console.error("Error saving simulation:", saveError);
        // Continue without failing if save fails
      } else if (savedSimulation) {
        simulationResult.id = savedSimulation.id;
        console.log("Saved simulation with ID:", savedSimulation.id);
      }
    } catch (saveError) {
      console.error("Error during save attempt:", saveError);
      // Continue without failing if save fails
    }
    
    console.log("Returning simulation result:", simulationResult);
    return NextResponse.json(simulationResult)
    
  } catch (error) {
    console.error("Paycheck simulation error:", error)
    return NextResponse.json({ error: "Error processing paycheck simulation" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Ensure required tables exist
    await ensureTablesExist(supabase)
    
    // Get the user's saved simulations
    const { data: simulations, error } = await supabase
      .from("paycheck_simulations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
    
    if (error) {
      console.error("Error fetching saved simulations:", error)
      
      // If table doesn't exist, return empty array
      if (error.code === "42P01") {
        return NextResponse.json([])
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(simulations || [])
  } catch (error) {
    console.error("Error fetching paycheck simulations:", error)
    return NextResponse.json({ error: "Error fetching paycheck simulations" }, { status: 500 })
  }
}

// Helper function to ensure required tables exist
async function ensureTablesExist(supabase: any) {
  try {
    // Check if tax_brackets table exists
    const { error: taxBracketsError } = await supabase
      .from("tax_brackets")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (taxBracketsError && taxBracketsError.code === "42P01") {
      // Create tax_brackets table using RPC
      await supabase.rpc('create_tax_brackets_table')
      console.log("Created tax_brackets table")
      
      // Insert default tax brackets
      const defaultBracketsWithCountry = DEFAULT_TAX_BRACKETS.map(bracket => ({
        ...bracket,
        country: "US",
        region: "Federal"
      }));
      
      await supabase
        .from("tax_brackets")
        .insert(defaultBracketsWithCountry);
        
      console.log("Inserted default tax brackets into database");
    }
    
    // Check if paycheck_simulations table exists
    const { error: simulationsError } = await supabase
      .from("paycheck_simulations")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (simulationsError && simulationsError.code === "42P01") {
      // Create paycheck_simulations table using RPC
      await supabase.rpc('create_paycheck_simulations_table')
      console.log("Created paycheck_simulations table")
    }
  } catch (error) {
    console.error("Error ensuring tables exist:", error)
    // Continue execution even if table creation fails
  }
}
