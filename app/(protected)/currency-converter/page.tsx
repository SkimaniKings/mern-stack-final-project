import type { Metadata } from "next"
import { CurrencyConverter } from "@/components/income/currency-converter"

export const metadata: Metadata = {
  title: "Currency Converter",
  description: "Convert between different currencies",
}

export default function CurrencyConverterPage() {
  return (
    <div className="flex flex-col space-y-8 animate-in">
      <div className="finance-section-header">
        <h2 className="finance-section-title">Currency Converter</h2>
      </div>

      <CurrencyConverter />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-medium mb-2">Why Use Currency Conversion?</h3>
          <p className="text-muted-foreground">
            Currency conversion helps you manage international income sources, investments, and expenses in a unified
            way. Track your global finances in your preferred currency.
          </p>
        </div>

        <div className="dashboard-card p-6">
          <h3 className="text-lg font-medium mb-2">Real-Time Exchange Rates</h3>
          <p className="text-muted-foreground">
            Our currency converter uses up-to-date exchange rates to ensure accurate conversions between major world
            currencies.
          </p>
        </div>

        <div className="dashboard-card p-6">
          <h3 className="text-lg font-medium mb-2">Historical Rate Tracking</h3>
          <p className="text-muted-foreground">
            View 30-day historical exchange rate trends to make informed decisions about when to convert your money.
          </p>
        </div>
      </div>
    </div>
  )
}

