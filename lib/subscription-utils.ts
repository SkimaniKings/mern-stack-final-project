/**
 * Utility functions for subscriptions
 */

/**
 * Get CSS class for subscription card based on usage rating
 * 1-3: Red (low value)
 * 4-6: Blue (medium value)
 * 7-10: Green (high value)
 */
export function getUsageRatingColorClass(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return '';
  
  if (rating >= 1 && rating <= 3) {
    // Red for low value (1-3)
    return 'usage-rating-low';
  } else if (rating >= 4 && rating <= 6) {
    // Blue hex #0790A2 for medium value (4-6)
    return 'usage-rating-medium';
  } else if (rating >= 7 && rating <= 10) {
    // Green hex #07A213 for high value (7-10)
    return 'usage-rating-high';
  }
  
  return '';
}

/**
 * Format subscription frequency for display
 */
export function formatFrequency(frequency: string | undefined): string {
  if (!frequency) return 'Unknown';
  
  switch (frequency) {
    case 'weekly': return 'Weekly';
    case 'bi_weekly': return 'Bi-Weekly';
    case 'monthly': return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'semi_annual': return 'Semi-Annual';
    case 'annual': return 'Annual';
    case 'yearly': return 'Yearly';
    default: return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  }
}

/**
 * Get badge variant for subscription status
 */
export function getStatusBadgeVariant(status: string | undefined): string {
  if (!status) return 'secondary';
  
  switch (status) {
    case 'active': return 'success';
    case 'paused': return 'warning';
    case 'cancelled': return 'destructive';
    default: return 'secondary';
  }
}
