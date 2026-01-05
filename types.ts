
export interface Address {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  lat?: number;
  lng?: number;
}

export interface QuoteData {
  clientName: string;
  clientPhone: string;
  address: Address;
  panelCount: number;
  hasMaintenance: boolean;
  distanceKm: number;
  distanceType: 'routing' | 'estimated' | 'none';
  calculatedAt: Date | null;
}

export interface CalculationResult {
  pricePerPanel: number;
  cleaningSubtotal: number;
  travelFee: number;
  maintenanceFee: number;
  total: number;
  tier: string;
}
