"use client";

import { v4 as uuidv4 } from 'uuid';
import { createAuthClient, getCurrentUserClient } from '@/lib/services/auth-service';

/**
 * Watchlist Client Actions
 * Uses the centralized auth service for robust authentication
 */

// Get the current user directly from the client - returns null if not authenticated instead of throwing
export async function getClientUser() {
  try {
    // Use the API endpoint for more reliable authentication
    const response = await fetch('/api/auth/check');
    const data = await response.json();
    
    if (data.authenticated && data.user) {
      console.log("Authentication successful via API endpoint");
      return data.user;
    }
    
    // Fallback to the centralized auth service if API fails
    if (!data.authenticated) {
      try {
        const { user, error } = await getCurrentUserClient();
        
        if (user) {
          console.log("Authentication successful via auth service fallback");
          return user;
        }
        
        if (error) {
          console.warn("Authentication error in getClientUser:", error.message);
        }
      } catch (fallbackError) {
        console.error("Error in auth service fallback:", fallbackError);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Unexpected error in getClientUser:", error);
    return null;
  }
}

// Get watchlist items for the current user
export async function getClientWatchlistItems() {
  try {
    const supabase = createAuthClient();
    const user = await getClientUser();
    
    if (!user) {
      console.warn("No authenticated user found in getClientWatchlistItems");
      return [];
    }
    
    // Fetch watchlist items from Supabase
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
    console.error("Error in getClientWatchlistItems:", error);
    throw error;
  }
}

// Add an item to the watchlist
export async function addClientWatchlistItem(itemData: {
  ticker: string;
  name: string;
  price?: number;
  target_price?: number | null;
  notes?: string;
  sector?: string;
  price_alerts?: boolean;
  alert_threshold?: number | null;
}) {
  try {
    const supabase = createAuthClient();
    const user = await getClientUser();
    
    if (!user) {
      console.error("No authenticated user found in addClientWatchlistItem");
      return null;
    }
    
    // Validate required fields
    if (!itemData.ticker || !itemData.name) {
      throw new Error("Ticker and name are required fields");
    }
    
    // Check if the item already exists
    const { data: existingItems, error: checkError } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("ticker", itemData.ticker);
    
    if (checkError) {
      console.error("Error checking existing watchlist items:", checkError);
      throw checkError;
    }
    
    if (existingItems && existingItems.length > 0) {
      throw new Error(`${itemData.ticker} is already in your watchlist`);
    }
    
    // Generate a unique ID
    const id = uuidv4();
    
    // Prepare data for insertion
    const insertData = {
      id,
      user_id: user.id,
      ticker: itemData.ticker,
      name: itemData.name,
      price: itemData.price || 0,
      target_price: itemData.target_price || null,
      notes: itemData.notes || "",
      sector: itemData.sector || "Uncategorized",
      price_alerts: itemData.price_alerts || false,
      alert_threshold: itemData.alert_threshold || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert the item
    const { data, error } = await supabase
      .from("watchlist")
      .insert([insertData])
      .select();
    
    if (error) {
      console.error("Error adding item to watchlist:", error);
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error("Error in addClientWatchlistItem:", error);
    throw error;
  }
}

// Update a watchlist item
export async function updateClientWatchlistItem(id: string, updateData: {
  ticker?: string;
  name?: string;
  target_price?: number | null;
  notes?: string;
  sector?: string;
  price_alerts?: boolean;
  alert_threshold?: number | null;
}) {
  try {
    const supabase = createAuthClient();
    const user = await getClientUser();
    
    if (!user) {
      console.error("No authenticated user found in updateClientWatchlistItem");
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
    console.error("Error in updateClientWatchlistItem:", error);
    throw error;
  }
}

// Remove an item from the watchlist
export async function removeClientWatchlistItem(id: string) {
  try {
    const supabase = createAuthClient();
    const user = await getClientUser();
    
    if (!user) {
      console.error("No authenticated user found in removeClientWatchlistItem");
      return false;
    }
    
    if (!id) {
      throw new Error("Item ID is required");
    }
    
    // Delete the item
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    
    if (error) {
      console.error("Error removing from watchlist:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in removeClientWatchlistItem:", error);
    throw error;
  }
}
