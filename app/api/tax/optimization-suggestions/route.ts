import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // Get all tax optimization suggestions for the user
  const { data: suggestions, error } = await supabase
    .from("tax_optimization_suggestions")
    .select("*")
    .eq("user_id", user.id)
    .order("suggestion_date", { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(suggestions || [])
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  try {
    // Get user's income sources
    const { data: incomeSources, error: incomeError } = await supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
    
    if (incomeError) {
      return NextResponse.json({ error: incomeError.message }, { status: 500 })
    }
    
    // Get user's deductions
    const { data: deductions, error: deductionsError } = await supabase
      .from("deductions")
      .select("*")
      .eq("user_id", user.id)
    
    if (deductionsError) {
      return NextResponse.json({ error: deductionsError.message }, { status: 500 })
    }
    
    // Calculate total income
    const totalIncome = incomeSources?.reduce((sum, source) => {
      let annualAmount = Number(source.amount);
      
      // Convert to annual amount based on frequency
      switch (source.frequency) {
        case 'monthly':
          annualAmount *= 12;
          break;
        case 'weekly':
          annualAmount *= 52;
          break;
        case 'bi-weekly':
          annualAmount *= 26;
          break;
        case 'annually':
          // Already annual
          break;
        case 'one-time':
          // Count as is for the current year
          break;
      }
      
      return sum + annualAmount;
    }, 0) || 0;
    
    // Generate optimization suggestions based on income and existing deductions
    const suggestions = [];
    
    // Check for retirement contributions
    const hasRetirementDeduction = deductions?.some(d => 
      d.name?.toLowerCase().includes('401k') || 
      d.name?.toLowerCase().includes('ira') ||
      d.name?.toLowerCase().includes('retirement')
    );
    
    if (!hasRetirementDeduction && totalIncome > 30000) {
      const potentialSavings = Math.min(totalIncome * 0.15, 6000);
      suggestions.push({
        user_id: user.id,
        suggestion: "Consider contributing to a retirement account like a 401(k) or IRA to reduce taxable income",
        potential_savings: potentialSavings,
        suggestion_date: new Date().toISOString().split('T')[0]
      });
    }
    
    // Check for health savings account
    const hasHSA = deductions?.some(d => 
      d.name?.toLowerCase().includes('hsa') || 
      d.name?.toLowerCase().includes('health savings')
    );
    
    if (!hasHSA && totalIncome > 40000) {
      suggestions.push({
        user_id: user.id,
        suggestion: "If eligible, contribute to a Health Savings Account (HSA) for tax-free healthcare expenses",
        potential_savings: 1500,
        suggestion_date: new Date().toISOString().split('T')[0]
      });
    }
    
    // Check for charitable contributions
    const hasCharitableDeduction = deductions?.some(d => 
      d.name?.toLowerCase().includes('charity') || 
      d.name?.toLowerCase().includes('donation')
    );
    
    if (!hasCharitableDeduction && totalIncome > 50000) {
      const potentialSavings = totalIncome * 0.02;
      suggestions.push({
        user_id: user.id,
        suggestion: "Consider charitable donations which can be tax-deductible if you itemize deductions",
        potential_savings: potentialSavings,
        suggestion_date: new Date().toISOString().split('T')[0]
      });
    }
    
    // Check for educational expenses
    if (totalIncome > 30000 && totalIncome < 90000) {
      suggestions.push({
        user_id: user.id,
        suggestion: "You may qualify for the Lifetime Learning Credit for educational expenses",
        potential_savings: 2000,
        suggestion_date: new Date().toISOString().split('T')[0]
      });
    }
    
    // Check for self-employment
    const hasSelfEmployment = incomeSources?.some(source => 
      source.type === 'freelance' || source.type === 'passive'
    );
    
    if (hasSelfEmployment) {
      suggestions.push({
        user_id: user.id,
        suggestion: "As a self-employed individual, consider a SEP IRA or Solo 401(k) for higher retirement contribution limits",
        potential_savings: 5000,
        suggestion_date: new Date().toISOString().split('T')[0]
      });
    }
    
    // Save suggestions to the database
    if (suggestions.length > 0) {
      const { error: saveError } = await supabase
        .from("tax_optimization_suggestions")
        .insert(suggestions);
      
      if (saveError) {
        console.error("Error saving tax suggestions:", saveError);
        // Continue without failing if save fails
      }
    }
    
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error generating tax optimization suggestions:", error);
    return NextResponse.json({ error: "Error generating tax optimization suggestions" }, { status: 500 });
  }
}
