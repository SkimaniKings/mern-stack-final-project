import type { CurrencyRate } from "@/types/income"

// Format currency with symbol
export function formatCurrency(amount: number, currency = "USD"): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CAD: "C$",
    AUD: "A$",
    CNY: "¥",
    INR: "₹",
    BRL: "R$",
    MXN: "Mex$",
    SGD: "S$",
    CHF: "CHF",
    HKD: "HK$",
    KRW: "₩",
    NZD: "NZ$",
  }

  const symbol = symbols[currency] || currency

  // Format based on currency
  if (currency === "JPY" || currency === "KRW") {
    // No decimal places for JPY and KRW
    return `${symbol}${Math.round(amount).toLocaleString()}`
  } else {
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

// Convert amount from one currency to another
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: CurrencyRate[],
): number {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount
  }

  // Find the latest rate for the currency pair
  const directRate = rates.find((rate) => rate.base_currency === fromCurrency && rate.target_currency === toCurrency)

  if (directRate) {
    return amount * directRate.rate
  }

  // Try reverse rate
  const reverseRate = rates.find((rate) => rate.base_currency === toCurrency && rate.target_currency === fromCurrency)

  if (reverseRate) {
    return amount / reverseRate.rate
  }

  // Try conversion through USD as a bridge
  const fromToUSD = rates.find((rate) => rate.base_currency === fromCurrency && rate.target_currency === "USD")

  const usdToTarget = rates.find((rate) => rate.base_currency === "USD" && rate.target_currency === toCurrency)

  if (fromToUSD && usdToTarget) {
    const amountInUSD = amount * fromToUSD.rate
    return amountInUSD * usdToTarget.rate
  }

  // If no conversion path found, return original amount
  console.warn(`No conversion rate found for ${fromCurrency} to ${toCurrency}`)
  return amount
}

// Get all available currencies from rates
export function getAvailableCurrencies(rates: CurrencyRate[]): string[] {
  const currencies = new Set<string>()

  rates.forEach((rate) => {
    currencies.add(rate.base_currency)
    currencies.add(rate.target_currency)
  })

  return Array.from(currencies).sort()
}

// Calculate effective exchange rate between two currencies
export function getEffectiveExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  rates: CurrencyRate[],
): number | null {
  // Direct rate
  const directRate = rates.find((rate) => rate.base_currency === fromCurrency && rate.target_currency === toCurrency)

  if (directRate) {
    return directRate.rate
  }

  // Reverse rate
  const reverseRate = rates.find((rate) => rate.base_currency === toCurrency && rate.target_currency === fromCurrency)

  if (reverseRate) {
    return 1 / reverseRate.rate
  }

  // USD bridge
  const fromToUSD = rates.find((rate) => rate.base_currency === fromCurrency && rate.target_currency === "USD")

  const usdToTarget = rates.find((rate) => rate.base_currency === "USD" && rate.target_currency === toCurrency)

  if (fromToUSD && usdToTarget) {
    return fromToUSD.rate * usdToTarget.rate
  }

  return null
}

