"use client"

import { useState, useEffect } from "react"
import { ArrowRightIcon, RefreshCwIcon } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrencyRates } from "@/app/actions/currency-rates"
import { CURRENCIES } from "@/lib/currencies"
import { formatCurrency } from "@/lib/utils"

// Mock historical data for the chart
const generateHistoricalData = (baseRate: number) => {
  const data = []
  const today = new Date()

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    // Add some random fluctuation to the rate
    const fluctuation = (Math.random() - 0.5) * 0.05
    const rate = baseRate * (1 + fluctuation)

    data.push({
      date: date.toISOString().split("T")[0],
      rate: Number.parseFloat(rate.toFixed(4)),
    })
  }

  return data
}

export function CurrencyConverter() {
  const [amount, setAmount] = useState<number>(100)
  const [fromCurrency, setFromCurrency] = useState<string>("USD")
  const [toCurrency, setToCurrency] = useState<string>("EUR")
  const [rates, setRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [historicalData, setHistoricalData] = useState<any[]>([])

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const ratesData = await getCurrencyRates()
        const formattedRates = ratesData.reduce((acc, rate) => {
          // The type definition for CurrencyRate is in @/types/income
          // and includes target_currency and rate.
          if (rate.target_currency) {
            acc[rate.target_currency] = rate.rate
          }
          return acc
        }, {} as Record<string, number>)

        // The base currency is USD, so its rate relative to itself is 1.
        if (!formattedRates.USD) {
          formattedRates.USD = 1
        }
        setRates(formattedRates)
      } catch (error) {
        console.error("Error fetching currency rates:", error)
        // Set empty rates on error to avoid breaking the app, but keep USD base.
        setRates({ USD: 1 })
      } finally {
        setLoading(false)
      }
    }

    fetchRates()
  }, [])

  useEffect(() => {
    if (!loading && rates[fromCurrency] && rates[toCurrency]) {
      // Calculate the conversion rate between the two currencies
      const baseRate = rates[toCurrency] / rates[fromCurrency]
      setHistoricalData(generateHistoricalData(baseRate))
    }
  }, [fromCurrency, toCurrency, rates, loading])

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const calculateConversion = () => {
    if (!rates[fromCurrency] || !rates[toCurrency]) return 0

    // Convert through USD (base currency)
    const amountInUSD = amount / rates[fromCurrency]
    const amountInTargetCurrency = amountInUSD * rates[toCurrency]

    return amountInTargetCurrency
  }

  const conversionRate = rates[fromCurrency] && rates[toCurrency] ? rates[toCurrency] / rates[fromCurrency] : 0

  const convertedAmount = calculateConversion()

  if (loading) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Currency Converter</CardTitle>
          <CardDescription>Convert between different currencies</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dashboard-card animate-in">
      <CardHeader>
        <CardTitle>Currency Converter</CardTitle>
        <CardDescription>Convert between different currencies</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-7 items-center">
            <div className="md:col-span-3 space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number.parseFloat(e.target.value) || 0)}
                className="finance-input"
              />
            </div>

            <div className="md:col-span-1 flex items-center justify-center">
              <Button variant="outline" size="icon" onClick={handleSwapCurrencies} className="rounded-full h-10 w-10">
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="text-sm font-medium">Converted Amount</label>
              <div className="finance-input flex items-center justify-between">
                <span className="font-medium">{formatCurrency(convertedAmount, toCurrency)}</span>
                <span className="text-sm text-muted-foreground">{toCurrency}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Currency</label>
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger className="finance-input">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Currency</label>
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="finance-input">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Exchange Rate History (30 days)</h3>
              <div className="flex items-center text-sm text-muted-foreground">
                <span>
                  1 {fromCurrency} = {conversionRate.toFixed(4)} {toCurrency}
                </span>
                <RefreshCwIcon className="ml-2 h-3 w-3" />
              </div>
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return `${date.getDate()}/${date.getMonth() + 1}`
                    }}
                  />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [value.toFixed(4), `${fromCurrency} to ${toCurrency}`]}
                    labelFormatter={(label) => {
                      const date = new Date(label)
                      return date.toLocaleDateString()
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

