
export const ORIGIN_ADDRESS = "Estr. dos Bandeirantes, 3748 - Taquara, Rio de Janeiro - RJ, 22775-114";
export const ORIGIN_COORDS = { lat: -22.929848, lng: -43.376839 }; // Coordinates for Taquara address

export const PRICING_TIERS = {
  FIXED_LOW: { min: 1, max: 5, price: 280.00 }, // Valor total fixo
  TIER_6_9: { min: 6, max: 9, price: 50.00 }, // Por placa
  TIER_10_16: { min: 10, max: 16, price: 45.00 }, // Por placa
  TIER_17_PLUS: { min: 17, max: Infinity, price: 40.00 } // Por placa
};

export const TRAVEL_FEE_RULES = {
  FREE_KM: 50,
  PRICE_PER_KM: 3.00
};

export const MAINTENANCE_PRICE = 120.00;
