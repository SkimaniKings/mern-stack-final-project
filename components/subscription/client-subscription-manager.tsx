'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Subscription } from '@/types/subscription';

// Local storage key for client-side subscriptions
const LOCAL_STORAGE_KEY = 'finance-hub-subscriptions';

// Client ID cookie name (same as used in ClientIdManager)
const CLIENT_ID_COOKIE = 'client-id';

export function useClientSubscriptions() {
  const [id, setId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Initialize client ID from cookie
  useEffect(() => {
    // Wait for the document to be fully loaded
    if (typeof document === 'undefined') return;
    
    try {
      // Get client ID from cookie using a safer approach
      const getCookieValue = (name: string): string | null => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
      };
      
      const id = getCookieValue(CLIENT_ID_COOKIE);
      
      if (id) {
        setId(id);
      } else {
        // Generate a new client ID if none exists
        const newId = uuidv4();
        setId(newId);
        
        // Set cookie with 1 year expiration
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        
        // Use a simple cookie format without JSON to avoid parsing issues
        document.cookie = `${CLIENT_ID_COOKIE}=${newId};expires=${expiryDate.toUTCString()};path=/;SameSite=Strict`;
      }
      
      // Also set the client ID in a header for API requests
      if (typeof window !== 'undefined') {
        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
          init = init || {};
          init.headers = init.headers || {};
          
          // Add the client ID to all API requests
          const headers = new Headers(init.headers);
          headers.append('X-Client-ID', id || '');
          init.headers = headers;
          
          return originalFetch(input, init);
        };
      }
    } catch (error) {
      console.error('Error setting up client ID:', error);
      // Generate a fallback ID if there's an error
      const fallbackId = uuidv4();
      setId(fallbackId);
    } finally {
      setIsLoaded(true);
    }
  }, []);
  
  // Get subscriptions from local storage
  const getLocalSubscriptions = (): Subscription[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!storedData) return [];
      
      const allSubscriptions = JSON.parse(storedData);
      
      // Filter subscriptions by client ID
      return allSubscriptions.filter((sub: Subscription) => sub.user_id === id);
    } catch (error) {
      console.error('Error getting local subscriptions:', error);
      return [];
    }
  };
  
  // Save a subscription to local storage
  const saveLocalSubscription = (subscription: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Subscription => {
    try {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      const allSubscriptions = storedData ? JSON.parse(storedData) : [];
      
      // Create a new subscription with client ID and generated ID
      const newSubscription: Subscription = {
        ...subscription,
        id: uuidv4(),
        user_id: id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add the new subscription to the array
      allSubscriptions.push(newSubscription);
      
      // Save back to local storage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSubscriptions));
      
      return newSubscription;
    } catch (error) {
      console.error('Error saving local subscription:', error);
      throw new Error('Failed to save subscription locally');
    }
  };
  
  // Update a subscription in local storage
  const updateLocalSubscription = (id: string, subscription: Partial<Subscription>): Subscription => {
    try {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!storedData) throw new Error('No subscriptions found');
      
      const allSubscriptions = JSON.parse(storedData);
      
      // Find the subscription to update
      const index = allSubscriptions.findIndex((sub: Subscription) => sub.id === id && sub.user_id === id);
      
      if (index === -1) throw new Error('Subscription not found');
      
      // Update the subscription
      const updatedSubscription = {
        ...allSubscriptions[index],
        ...subscription,
        updated_at: new Date().toISOString()
      };
      
      allSubscriptions[index] = updatedSubscription;
      
      // Save back to local storage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSubscriptions));
      
      return updatedSubscription;
    } catch (error) {
      console.error('Error updating local subscription:', error);
      throw new Error('Failed to update subscription locally');
    }
  };
  
  // Delete a subscription from local storage
  const deleteLocalSubscription = (id: string): void => {
    try {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!storedData) return;
      
      const allSubscriptions = JSON.parse(storedData);
      
      // Filter out the subscription to delete
      const filteredSubscriptions = allSubscriptions.filter(
        (sub: Subscription) => !(sub.id === id && sub.user_id === id)
      );
      
      // Save back to local storage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredSubscriptions));
    } catch (error) {
      console.error('Error deleting local subscription:', error);
      throw new Error('Failed to delete subscription locally');
    }
  };
  
  return {
    clientId: id,
    isLoaded,
    getLocalSubscriptions,
    saveLocalSubscription,
    updateLocalSubscription,
    deleteLocalSubscription
  };
}

// Component to ensure client ID is set
export default function ClientSubscriptionManager() {
  useClientSubscriptions();
  
  // This component doesn't render anything
  return null;
}
