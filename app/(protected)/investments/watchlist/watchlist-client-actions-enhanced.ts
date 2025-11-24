"use client";

import { createAuthClient, getCurrentUserClient } from '@/lib/services/auth-service';
import { WatchlistItem } from './watchlist-content';

/**
 * Enhanced Watchlist Client Actions
 * Provides real-time data updates and price alerts functionality
 */

// Get the current user directly from the client
export async function getClientUser() {
  try {
    // Use the centralized auth service for authentication
    const { user, error } = await getCurrentUserClient();
    
    if (user) {
      console.log("Authentication successful via auth service");
      return user;
    }
    
    if (error) {
      console.warn("Authentication error in getClientUser:", error.message);
    }
    
    return null;
  } catch (error) {
    console.error("Unexpected error in getClientUser:", error);
    return null;
  }
}

// Get watchlist items with enhanced data
export async function getEnhancedWatchlistItems() {
  try {
    const supabase = createAuthClient();
    const user = await getClientUser();
    
    if (!user) {
      console.warn("No authenticated user found in getEnhancedWatchlistItems");
      return [];
    }
    
    // Fetch watchlist items from Supabase with all fields
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching watchlist items:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getEnhancedWatchlistItems:", error);
    throw error;
  }
}

// Refresh watchlist prices using the API
export async function refreshWatchlistPrices(items: WatchlistItem[]): Promise<WatchlistItem[]> {
  try {
    if (!items || items.length === 0) {
      return [];
    }
    
    // Extract tickers from watchlist items
    const tickers = items.map(item => item.ticker);
    
    // Call the API to refresh prices
    const response = await fetch('/api/watchlist/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tickers }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to refresh prices: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      return data.items;
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error refreshing watchlist prices:', error);
    // Return the original items if refresh fails
    return items;
  }
}

// Get watchlist items with active alerts
export async function getWatchlistAlerts(): Promise<WatchlistItem[]> {
  try {
    const supabase = createAuthClient();
    const user = await getClientUser();
    
    if (!user) {
      console.warn("No authenticated user found in getWatchlistAlerts");
      return [];
    }
    
    // Fetch watchlist items with active alerts
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
      .eq("price_alerts", true)
      .not("alert_threshold", "is", null)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching watchlist alerts:", error);
      throw error;
    }
    
    // Filter items where the price has reached or exceeded the alert threshold
    const triggeredAlerts = (data || []).filter(item => 
      item.price >= (item.alert_threshold || 0)
    );
    
    return triggeredAlerts;
  } catch (error) {
    console.error("Error in getWatchlistAlerts:", error);
    throw error;
  }
}

// Update a watchlist item with enhanced fields
export async function updateEnhancedWatchlistItem(id: string, updateData: {
  target_price?: number | null;
  notes?: string;
  sector?: string;
  price_alerts?: boolean;
  alert_threshold?: number | null;
  previous_close?: number | null;
  price_change?: number | null;
  price_change_percent?: number | null;
  day_high?: number | null;
  day_low?: number | null;
  last_updated?: string;
  alert_triggered?: boolean;
}) {
  try {
    const supabase = createAuthClient();
    const user = await getClientUser();
    
    if (!user) {
      console.error("No authenticated user found in updateEnhancedWatchlistItem");
      return null;
    }
    
    if (!id) {
      throw new Error("Item ID is required");
    }
    
    // Check if the item exists and belongs to the user
    const { data: existingItem, error: checkError } = await supabase
      .from("watchlist")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking watchlist item:", checkError);
      throw checkError;
    }
    
    if (!existingItem) {
      throw new Error("Item not found or access denied");
    }
    
    // Prepare update data
    const data = {
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    // Update the item
    const { data: updatedItem, error } = await supabase
      .from("watchlist")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select();
    
    if (error) {
      console.error("Error updating watchlist item:", error);
      throw error;
    }
    
    return updatedItem[0];
  } catch (error) {
    console.error("Error in updateEnhancedWatchlistItem:", error);
    throw error;
  }
}
