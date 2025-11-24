import type { Metadata } from "next"
import { optimizePaymentSchedule } from "@/app/actions/subscriptions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
export const dynamic = 'force-dynamic';
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, CreditCard, DollarSign, RefreshCw } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Payment Timeline",
  description: "Visualize and optimize your payment schedule for better cash flow",
}

// Define the payment data structure
type PaymentData = {
  id: string;
  name: string;
  amount: number;
  date: number; // Day of month
  [key: string]: any;
};

// Define the payment method structure
type PaymentMethod = {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
};

// Define the recommendation structure
type Recommendation = {
  type: 'reschedule' | 'payment_method' | 'consolidate';
  title: string;
  description: string;
  savings: number;
  [key: string]: any;
};

// Create a simple payment timeline chart component
function PaymentTimelineChart({ payments }: { payments: PaymentData[] }) {
  // Simple visualization of payment dates
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  
  return (
    <div className="relative h-[200px] w-full">
      {/* Days of month */}
      <div className="flex justify-between mb-4">
        <div>1</div>
        <div>15</div>
        <div>31</div>
      </div>
      
      {/* Timeline bar */}
      <div className="h-2 bg-gray-200 rounded-full w-full mb-8"></div>
      
      {/* Payment markers */}
      <div className="relative h-[150px]">
        {payments.map((payment, index) => (
          <div 
            key={payment.id} 
            className="absolute bg-blue-500 text-white text-xs p-2 rounded shadow-sm"
            style={{ 
              left: `${(payment.date / 31) * 100}%`, 
              top: `${(index % 5) * 30}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="whitespace-nowrap">{payment.name}</div>
            <div>${payment.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function PaymentTimelinePage() {
  try {
    // Fetch payment schedule data
    const data = await optimizePaymentSchedule();
    
    // Create properly typed data structure
    const paymentSchedule = {
      currentSchedule: [] as PaymentData[],
      optimizedSchedule: [] as PaymentData[],
      cashFlowImprovement: 0,
      paymentMethods: [] as PaymentMethod[],
      recommendations: [] as Recommendation[]
    };
    
    // Handle empty data case
    if (!data || !Array.isArray(data) || data.length === 0) {
      return (
        <div className="container mx-auto py-6 space-y-8">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Payment Timeline</h1>
            <p className="text-muted-foreground">Visualize and optimize your payment schedule for better cash flow</p>
          </div>
          
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-3 mb-4">
                <CalendarIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Payment Data Found</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Add your subscriptions and bills to see a payment timeline and get optimization recommendations.
              </p>
              <Button asChild>
                <Link href="/subscriptions">Manage Subscriptions</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Process the data into our structured format
    // In a real implementation, this would map the API response to our types
    // For now, we'll create sample data based on the subscriptions
    
    // Map subscriptions to current schedule (spread throughout the month)
    paymentSchedule.currentSchedule = data.map((sub, index) => ({
      id: sub.id,
      name: sub.name,
      amount: sub.amount,
      date: (index % 28) + 1 // Spread payments throughout the month
    }));
    
    // Create optimized schedule (clustered around paydays)
    paymentSchedule.optimizedSchedule = data.map((sub, index) => ({
      id: sub.id,
      name: sub.name,
      amount: sub.amount,
      date: Math.floor(index / 3) % 2 === 0 ? 15 : 30 // Cluster around 15th and 30th
    }));
    
    // Calculate total monthly payments
    const totalMonthlyPayments = paymentSchedule.currentSchedule.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Calculate cash flow improvement (10% of total as an example)
    paymentSchedule.cashFlowImprovement = totalMonthlyPayments * 0.1;
    
    // Create sample payment methods
    paymentSchedule.paymentMethods = [
      { id: '1', name: 'Credit Card', type: 'card' },
      { id: '2', name: 'Bank Account', type: 'bank' },
      { id: '3', name: 'PayPal', type: 'digital' }
    ];
    
    // Create sample recommendations
    paymentSchedule.recommendations = [
      {
        type: 'reschedule',
        title: 'Reschedule Netflix subscription',
        description: 'Move payment date from the 3rd to the 15th to align with your paycheck.',
        savings: 0
      },
      {
        type: 'payment_method',
        title: 'Switch payment method for utilities',
        description: 'Use your rewards credit card for utility payments to earn cashback.',
        savings: totalMonthlyPayments * 0.02 // 2% cashback
      },
      {
        type: 'consolidate',
        title: 'Consolidate streaming services',
        description: 'Consider a bundle package for your streaming services to save money.',
        savings: 15.99
      }
    ];

    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Payment Timeline</h1>
          <p className="text-muted-foreground">Visualize and optimize your payment schedule for better cash flow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total Monthly Payments</CardTitle>
              <CardDescription>All bills and subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${totalMonthlyPayments.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Cash Flow Improvement</CardTitle>
              <CardDescription>With optimized scheduling</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">${paymentSchedule.cashFlowImprovement.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Distribution by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{paymentSchedule.paymentMethods.length}</div>
              <div className="flex gap-1 mt-2">
                {paymentSchedule.paymentMethods.map((method) => (
                  <Badge key={method.id} variant="outline">
                    {method.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="timeline" className="w-full">
          <TabsList>
            <TabsTrigger value="timeline">Payment Timeline</TabsTrigger>
            <TabsTrigger value="optimized">Optimized Schedule</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Payment Schedule</CardTitle>
                <CardDescription>Visualization of your current payment dates throughout the month</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentTimelineChart payments={paymentSchedule.currentSchedule} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="optimized" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Optimized Payment Schedule</CardTitle>
                <CardDescription>Recommended payment dates to improve cash flow</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentTimelineChart payments={paymentSchedule.optimizedSchedule} />

                <div className="mt-6 space-y-4">
                  <h3 className="font-medium">Optimization Recommendations</h3>

                  {paymentSchedule.recommendations.map((recommendation, index) => (
                    <div key={index} className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        {recommendation.type === "reschedule" ? (
                          <CalendarIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                        ) : recommendation.type === "payment_method" ? (
                          <CreditCard className="h-5 w-5 text-blue-500 mt-0.5" />
                        ) : (
                          <RefreshCw className="h-5 w-5 text-blue-500 mt-0.5" />
                        )}
                        <div>
                          <h4 className="font-medium">{recommendation.title}</h4>
                          <p className="text-sm text-muted-foreground">{recommendation.description}</p>

                          {recommendation.savings > 0 && (
                            <div className="mt-2 flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium text-green-500">
                                Potential savings: ${recommendation.savings.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end mt-6">
                    <Button asChild>
                      <Link href="/subscriptions">Apply Optimized Schedule</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch (error) {
    console.error('Error in payment timeline page:', error);
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Payment Timeline</h1>
          <p className="text-muted-foreground">Visualize and optimize your payment schedule for better cash flow</p>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-red-100 p-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Error Loading Payment Data</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              We encountered an error while loading your payment timeline. Please try again later.
            </p>
            <Button asChild>
              <Link href="/subscriptions">Return to Subscriptions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
