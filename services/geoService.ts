
// Fix: Corrected import name from ORIG_COORDS to ORIGIN_COORDS to match constants.ts
import { ORIGIN_COORDS } from '../constants';

// Fix: Use the coordinates defined in ORIGIN_COORDS from constants
const ORIGIN_LAT = ORIGIN_COORDS.lat;
const ORIGIN_LNG = ORIGIN_COORDS.lng;

// Distance using Haversine formula (crow flies)
export const calculateHaversineDistance = (lat2: number, lon2: number): number => {
  const R = 6371; // km
  const dLat = (lat2 - ORIGIN_LAT) * Math.PI / 180;
  const dLon = (lon2 - ORIGIN_LNG) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(ORIGIN_LAT * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Get coordinates for an address using Nominatim
export const geocodeAddress = async (address: string): Promise<{ lat: number, lng: number } | null> => {
  try {
    const encoded = encodeURIComponent(address);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`);
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// Get driving distance using OSRM
export const getDrivingDistance = async (destLat: number, destLng: number): Promise<number | null> => {
  try {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${ORIGIN_LNG},${ORIGIN_LAT};${destLng},${destLat}?overview=false`);
    const data = await response.json();
    if (data.code === 'Ok' && data.routes.length > 0) {
      // OSRM returns distance in meters
      return data.routes[0].distance / 1000;
    }
    return null;
  } catch (error) {
    console.error("OSRM error:", error);
    return null;
  }
};
