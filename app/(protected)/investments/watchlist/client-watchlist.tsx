"use client";

import { useState, useEffect, useRef } from "react";
import { WatchlistContent } from "./watchlist-content";
import { getClientWatchlistItems } from "./watchlist-client-actions";
import { WatchlistItem } from "./watchlist-content";

export function ClientWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to map API response items to WatchlistItem interface
  function mapWatchlistItems(items: any[]): WatchlistItem[] {
    console.log('Mapping watchlist items, raw data sample:', items.length > 0 ? items[0] : 'No items');
    return items.map((item: any) => {
      // Handle the field name mismatch between price_alerts and price_alert_enabled
      const hasPriceAlerts = Boolean(item.price_alert_enabled !== undefined ? item.price_alert_enabled : item.price_alerts || false);
      
      return {
        id: item.id,
        ticker: item.ticker,
        name: item.name,
        price: item.price || 0,
        target_price: item.target_price || null,
        notes: item.notes || "",
        sector: item.sector || "",
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
        // Use the resolved price alerts value
        price_alerts: hasPriceAlerts,
        alert_threshold: item.alert_threshold || null,
        // Add enhanced fields for real-time data
        previous_close: item.previous_close || null,
        price_change: item.price_change || null,
        price_change_percent: item.price_change_percent || null,
        day_high: item.day_high || null,
        day_low: item.day_low || null,
        last_updated: item.last_updated || new Date().toISOString(),
        alert_triggered: Boolean(item.alert_triggered || false)
      };
    });
  }
  
  // Handle authentication errors by redirecting to sign-in
  async function handleAuthError() {
    try {
      // Create a Supabase client directly
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase credentials are not properly configured");
        return false;
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.warn("Authentication failed, redirecting to sign-in");
        
        // Redirect to login page
        window.location.href = '/login';
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error handling authentication:", error);
      return false;
    }
  }
  
  // Use a ref to track if the component is mounted
  const isMounted = useRef(true);
  
  // Clean up the ref when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    async function fetchWatchlistItems() {
      if (!isMounted.current) return;
      
      try {
        console.log('Fetching watchlist items...');
        setLoading(true);
        
        // Fetch the authenticated user ID from the session API
        let userId;
        try {
          const sessionResponse = await fetch('/api/auth/session');
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.authenticated && sessionData.user?.id) {
              userId = sessionData.user.id;
              console.log('Using authenticated user ID:', userId);
            } else {
              console.warn('No authenticated user found, using localStorage ID');
              // Fall back to localStorage ID if not authenticated
              userId = localStorage.getItem('finance_user_id');
              if (!userId) {
                userId = crypto.randomUUID();
                localStorage.setItem('finance_user_id', userId);
                console.log('Generated new user ID:', userId);
              } else {
                console.log('Using existing localStorage user ID:', userId);
              }
            }
          } else {
            console.error('Failed to fetch session, using localStorage ID');
            // Fall back to localStorage ID if session API fails
            userId = localStorage.getItem('finance_user_id') || crypto.randomUUID();
            localStorage.setItem('finance_user_id', userId);
          }
        } catch (sessionError) {
          console.error('Error fetching session:', sessionError);
          // Fall back to localStorage ID if session API throws
          userId = localStorage.getItem('finance_user_id') || crypto.randomUUID();
          localStorage.setItem('finance_user_id', userId);
        }
        
        // Get items from localStorage
        let localStorageItems = [];
        const storedItems = localStorage.getItem('watchlist');
        if (storedItems) {
          try {
            const parsedItems = JSON.parse(storedItems);
            if (Array.isArray(parsedItems) && parsedItems.length > 0) {
              localStorageItems = parsedItems;
              console.log('Found items in localStorage:', localStorageItems.length);
            }
          } catch (e) {
            console.error('Error parsing localStorage items:', e);
          }
        }
        
        // Prepare the stored items to pass to the API
        let storedItemsHeader = '';
        if (localStorageItems.length > 0) {
          try {
            // Limit the size of the header by only including essential fields
            const essentialItems = localStorageItems.map((item: { id: string; ticker: string; name: string }) => ({
              id: item.id,
              ticker: item.ticker,
              name: item.name
            }));
            storedItemsHeader = JSON.stringify(essentialItems);
          } catch (e) {
            console.error('Error stringifying localStorage items:', e);
          }
        }
        
        // Fetch items from the API
        console.log('Fetching items from API...');
        const response = await fetch('/api/watchlist/items', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-User-ID': userId,
            'X-Stored-Items': storedItemsHeader,
            'X-Client-ID': userId,
            'X-Auth-User-ID': userId,
            // Add a client-id cookie in the header for non-authenticated users
            'Cookie': `client-id=${userId}`
          }
        });
        
        // Process API response or fall back to localStorage
        let apiItems = [];
        
        if (!response.ok) {
          console.warn(`API request failed with status ${response.status}`);
          // If API fails, we'll just use localStorage items
        } else {
          try {
            // Parse the response
            const data = await response.json();
            
            if (data.success) {
              apiItems = data.items || [];
              console.log('Fetched items from API:', apiItems.length);
              
              // If we got items from the API, update localStorage to match
              if (apiItems.length > 0) {
                try {
                  // Store the API items in localStorage for offline access
                  localStorage.setItem('watchlist_items', JSON.stringify(apiItems));
                  console.log('Updated localStorage with API items');
                } catch (storageError) {
                  console.error('Error updating localStorage:', storageError);
                }
              }
            } else {
              console.warn('API returned error:', data.error);
            }
          } catch (parseError) {
            console.error('Error parsing API response:', parseError);
          }
        }
        
        // Combine items from API and localStorage
        let combinedItems = [...apiItems];
        
        // Add localStorage items that aren't already in the API response
        if (localStorageItems.length > 0) {
          const apiItemIds = new Set(apiItems.map((item: any) => item.id));
          const uniqueLocalItems = localStorageItems.filter((item: any) => !apiItemIds.has(item.id));
          
          if (uniqueLocalItems.length > 0) {
            console.log('Adding unique localStorage items:', uniqueLocalItems.length);
            combinedItems = [...combinedItems, ...uniqueLocalItems];
          }
        }
        
        if (combinedItems.length === 0) {
          console.log('No watchlist items found');
          setItems([]);
        } else {
          console.log('Total combined items:', combinedItems.length);
          // Map the items using our helper function
          const mappedItems = mapWatchlistItems(combinedItems);
          setItems(mappedItems);
        }
      } catch (error) {
        console.error("Error fetching watchlist items:", error);
        
        // Provide a user-friendly error message
        setError("Unable to load your watchlist. Please try signing in again.");
      } finally {
        setLoading(false);
      }
    }

    fetchWatchlistItems();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
          <p className="text-muted-foreground mt-2">Monitor potential investment opportunities</p>
        </div>
        <div className="p-8 text-center">
          <p>Loading watchlist data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
          <p className="text-muted-foreground mt-2">Monitor potential investment opportunities</p>
        </div>
        <div className="p-8 text-center">
          <p className="text-red-500">{error}</p>
          <WatchlistContent initialItems={[]} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
        <p className="text-muted-foreground mt-2">Monitor potential investment opportunities</p>
      </div>
      <WatchlistContent initialItems={items} />
    </div>
  );
}
