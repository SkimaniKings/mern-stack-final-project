"use client";

import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";

/**
 * ClientIdManager - A component that ensures a persistent client ID exists
 * This helps with identifying non-authenticated users across sessions
 */
export function ClientIdManager() {
  useEffect(() => {
    // Check if client-id cookie exists
    let clientId = Cookies.get("client-id");
    
    // If no client ID exists, create one and store it
    if (!clientId) {
      clientId = uuidv4();
      
      // Set the cookie with a long expiration (1 year)
      Cookies.set("client-id", clientId, { 
        expires: 365, 
        path: "/",
        sameSite: "strict"
      });
      
      console.log("Generated new persistent client ID:", clientId);
    }
    
    // Set the client ID in localStorage as well for redundancy
    localStorage.setItem("client-id", clientId);
    
    // Add the client ID to all API requests via headers
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      init = init || {};
      init.headers = init.headers || {};
      
      // Add the client ID to the headers
      const headers = new Headers(init.headers);
      headers.append("client-id", clientId);
      
      init.headers = headers;
      
      return originalFetch(input, init);
    };
    
    return () => {
      // Restore original fetch when component unmounts
      window.fetch = originalFetch;
    };
  }, []);
  
  // This component doesn't render anything
  return null;
}
