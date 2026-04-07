// src/lib/geocoding.ts

export async function getAddressFromCoords(gpsString: string | null): Promise<string | null> {
  if (!gpsString) return null;

  try {
    // 1. Clean the string (handle "lat, lng" or "lat lng")
    const parts = gpsString.split(/[\s,]+/).map(p => p.trim());
    if (parts.length < 2) return null;
    
    const lat = parts[0];
    const lon = parts[1];

    // 2. Call OpenStreetMap Nominatim API
    // IMPORTANT: nominatim requires a User-Agent header
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'User-Agent': 'DTT-Management-App-David'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    
    // 3. Extract the most useful name (City, Town, or Suburb)
    const addr = data.address;
    const location = addr.suburb || addr.town || addr.city || addr.county || addr.state;
    const region = addr.region || addr.city_district || "";

    if (!location) return "Unknown Location";

    return region ? `${location}, ${region}` : location;
  } catch (error) {
    console.error("Geocoding Error:", error);
    return null;
  }
}