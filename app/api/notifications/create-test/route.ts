import { NextResponse } from "next/server";
import { 
  notifyWatchlistAlert, 
  notifyBudgetAlert, 
  notifyExpenseReminder, 
  notifyBillReminder, 
  notifyInvestmentUpdate 
} from "@/lib/notifications";

export async function GET() {
  try {
    // Create a test notification of each type
    const results = await Promise.all([
      // Watchlist alert
      notifyWatchlistAlert({
        ticker: "AAPL",
        companyName: "Apple Inc.",
        currentPrice: 185.25,
        targetPrice: 180.00,
        isAboveTarget: true
      }),
      
      // Budget alert
      notifyBudgetAlert({
        category: "Entertainment",
        budgetAmount: 200,
        spentAmount: 160,
        percentage: 80,
        isOverBudget: false
      }),
      
      // Expense reminder
      notifyExpenseReminder({
        expenseName: "Car Insurance",
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days from now
        amount: 125.50,
        isDue: false,
        daysUntilDue: 3
      }),
      
      // Bill reminder
      notifyBillReminder({
        billName: "Electricity",
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days from now
        amount: 87.35,
        isDue: false,
        daysUntilDue: 5
      }),
      
      // Investment update
      notifyInvestmentUpdate({
        investmentName: "S&P 500 Index Fund",
        type: "performance",
        amount: 250.75,
        percentageChange: 2.5,
        isPositive: true
      })
    ]);
    
    // Count successful notifications
    const successCount = results.filter(result => result.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Created ${successCount} test notifications`,
      results
    });
  } catch (error) {
    console.error("Error creating test notifications:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
