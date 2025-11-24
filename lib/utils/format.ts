/**
 * Format a number as currency
 * @param value The number to format
 * @param currency The currency code (default: USD)
 * @param minimumFractionDigits Minimum fraction digits (default: 0)
 * @param maximumFractionDigits Maximum fraction digits (default: 0)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currency = 'USD',
  minimumFractionDigits = 0,
  maximumFractionDigits = 0
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

/**
 * Format a number as a percentage
 * @param value The number to format (e.g., 0.25 for 25%)
 * @param minimumFractionDigits Minimum fraction digits (default: 1)
 * @param maximumFractionDigits Maximum fraction digits (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  minimumFractionDigits = 1,
  maximumFractionDigits = 1
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

/**
 * Format a date as a string
 * @param date The date to format
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
}

/**
 * Format a number with commas
 * @param value The number to format
 * @param minimumFractionDigits Minimum fraction digits (default: 0)
 * @param maximumFractionDigits Maximum fraction digits (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  minimumFractionDigits = 0,
  maximumFractionDigits = 0
): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}
