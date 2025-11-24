// Geocoding utility functions

// Interface for location search results
export interface LocationResult {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  id: string; // Add unique ID field
}

/**
 * Search for locations by name using the Nominatim OpenStreetMap API
 * 
 * @param query The location name to search for
 * @returns Promise with array of location results
 */
export async function searchLocationByName(query: string): Promise<LocationResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }
  
  try {
    // Using Nominatim OpenStreetMap API for geocoding (free and open source)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Dripcheck/1.0' // Required by Nominatim usage policy
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Map the response to our LocationResult interface with unique IDs
    return data.map((item: any) => {
      const displayName = item.display_name.split(',')[0];
      // Create a unique ID by combining the name with coordinates
      const uniqueId = `${displayName}-${item.lat}-${item.lon}`;
      
      return {
        name: displayName,
        address: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        id: uniqueId
      };
    });
  } catch (error) {
    console.error('Error searching for location:', error);
    return [];
  }
}

/**
 * Get a human-readable address from coordinates using reverse geocoding
 * 
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise with the address string or null if not found
 */
export async function getAddressFromCoordinates(
  latitude: number, 
  longitude: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Dripcheck/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.error('Error getting address from coordinates:', error);
    return null;
  }
}
