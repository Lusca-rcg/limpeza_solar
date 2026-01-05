
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sun, 
  MapPin, 
  Phone, 
  User, 
  Calculator, 
  FileDown, 
  CheckCircle2, 
  Info,
  Truck,
  AlertCircle,
  Loader2,
  Navigation
} from 'lucide-react';
import { QuoteData, CalculationResult } from './types';
import { TRAVEL_FEE_RULES, MAINTENANCE_PRICE, ORIGIN_ADDRESS, PRICING_TIERS } from './constants';
import { getDrivingDistance, calculateHaversineDistance } from './services/geoService';
import { formatCurrency, formatPhone } from './utils/formatters';
import { generateQuotePdf } from './utils/pdfGenerator';

const LogoIcon = () => (
  <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-yellow-400 drop-shadow-md">
    <path d="M50 10C27.9 10 10 27.9 10 50C10 72.1 27.9 90 50 90C72.1 90 90 72.1 90 50" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
    <path d="M82 35L90 50L98 35" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M52 30L35 55H48L44 75L62 48H50L52 30Z" fill="currentColor"/>
  </svg>
);

const App: React.FC = () => {
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const [formData, setFormData] = useState<QuoteData>({
    clientName: '',
    clientPhone: '',
    address: {
      cep: 'S/N',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      lat: 0,
      lng: 0,
    },
    panelCount: 1,
    hasMaintenance: false,
    distanceKm: 0,
    distanceType: 'none',
    calculatedAt: null,
  });

  const [calcResult, setCalcResult] = useState<CalculationResult>({
    pricePerPanel: 0,
    cleaningSubtotal: 280,
    travelFee: 0,
    maintenanceFee: 0,
    total: 280,
    tier: '01 a 05 (Fixo)',
  });

  const calculatePricing = useCallback(() => {
    let pricePerPanel = 0;
    let cleaningSubtotal = 0;
    let tier = '';

    const count = formData.panelCount;

    if (count >= 1 && count <= 5) {
      cleaningSubtotal = PRICING_TIERS.FIXED_LOW.price;
      pricePerPanel = cleaningSubtotal / count; // Valor médio para referência
      tier = '01 a 05 (Fixo)';
    } else if (count >= 6 && count <= 9) {
      pricePerPanel = PRICING_TIERS.TIER_6_9.price;
      cleaningSubtotal = count * pricePerPanel;
      tier = '06 a 09';
    } else if (count >= 10 && count <= 16) {
      pricePerPanel = PRICING_TIERS.TIER_10_16.price;
      cleaningSubtotal = count * pricePerPanel;
      tier = '10 a 16';
    } else if (count >= 17) {
      pricePerPanel = PRICING_TIERS.TIER_17_PLUS.price;
      cleaningSubtotal = count * pricePerPanel;
      tier = 'Acima de 16';
    }

    const travelFee = formData.distanceKm > TRAVEL_FEE_RULES.FREE_KM 
      ? formData.distanceKm * TRAVEL_FEE_RULES.PRICE_PER_KM 
      : 0;

    const maintenanceFee = formData.hasMaintenance ? MAINTENANCE_PRICE : 0;
    const total = cleaningSubtotal + travelFee + maintenanceFee;

    setCalcResult({
      pricePerPanel,
      cleaningSubtotal,
      travelFee,
      maintenanceFee,
      total,
      tier,
    });
  }, [formData.panelCount, formData.distanceKm, formData.hasMaintenance]);

  useEffect(() => {
    calculatePricing();
  }, [calculatePricing]);

  const updateFromCoords = useCallback(async (lat: number, lng: number) => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    setLoadingGeo(true);
    setLoadingAddr(true);
    setError(null);

    try {
      const addrResp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const addrData = await addrResp.json();
      
      if (addrData && addrData.address) {
        const { road, house_number, suburb, city, town, village, state } = addrData.address;
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            logradouro: road || '',
            numero: house_number || prev.address.numero,
            bairro: suburb || '',
            cidade: city || town || village || '',
            uf: state ? (state.length === 2 ? state : state.substring(0, 2).toUpperCase()) : '',
          }
        }));
      }

      const drivingDist = await getDrivingDistance(lat, lng);
      if (drivingDist !== null) {
        setFormData(prev => ({ ...prev, distanceKm: drivingDist, distanceType: 'routing' }));
      } else {
        const haversineDist = calculateHaversineDistance(lat, lng);
        setFormData(prev => ({ ...prev, distanceKm: haversineDist, distanceType: 'estimated' }));
      }
    } catch (e) {
      console.error("Error updating from coords:", e);
      setError("Falha ao obter dados das coordenadas.");
    } finally {
      setLoadingGeo(false);
      setLoadingAddr(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.address.lat && formData.address.lng) {
        updateFromCoords(formData.address.lat, formData.address.lng);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [formData.address.lat, formData.address.lng, updateFromCoords]);

  const handleGenerateQuote = () => {
    if (!formData.clientName || formData.clientName.length < 2) {
      setError("Por favor, insira o nome completo do cliente.");
      return;
    }
    if (!formData.clientPhone || formData.clientPhone.replace(/\D/g, '').length < 10) {
      setError("Insira um telefone válido com DDD.");
      return;
    }
    if (!formData.address.lat || !formData.address.lng) {
      setError("Insira as coordenadas de Latitude e Longitude.");
      return;
    }
    if (formData.panelCount < 1) {
      setError("A quantidade mínima de placas é de 1 unidade.");
      return;
    }

    setError(null);
    setFormData(prev => ({ ...prev, calculatedAt: new Date() }));
    setShowSummary(true);
    
    setTimeout(() => {
      document.getElementById('quote-summary')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCoordChange = (field: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value);
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: numValue }
    }));
  };

  const handleAddressChange = (field: keyof typeof formData.address, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const inputClasses = "w-full rounded-lg border border-slate-300 bg-white p-2.5 text-black placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium";

  return (
    <div className="min-h-screen pb-12 bg-[#f1f5f9]">
      <header className="bg-blue-600 text-white py-8 px-4 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <Sun className="w-32 h-32" />
        </div>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 text-center md:text-left">
          <LogoIcon />
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">Solar Quote Pro</h1>
            <p className="text-blue-100 font-medium text-lg">Orçamentos por Coordenadas Geográficas</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-10">
          <h2 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2 border-b border-slate-100 pb-4">
            <Calculator className="w-6 h-6 text-blue-600" />
            Configuração do Orçamento
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <label className="block">
                <span className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-1 uppercase tracking-wider">
                  <User className="w-4 h-4" /> Nome do Cliente
                </span>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  className={inputClasses}
                  value={formData.clientName}
                  onChange={(e) => setFormData(p => ({ ...p, clientName: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-1 uppercase tracking-wider">
                  <Phone className="w-4 h-4" /> Telefone para Contato
                </span>
                <input
                  type="text"
                  placeholder="(21) 99999-9999"
                  className={inputClasses}
                  value={formData.clientPhone}
                  onChange={(e) => setFormData(p => ({ ...p, clientPhone: formatPhone(e.target.value) }))}
                />
              </label>
            </div>

            <div className="space-y-6">
              <label className="block">
                <span className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-1 uppercase tracking-wider">
                  <Sun className="w-4 h-4" /> Quantidade de Placas
                </span>
                <input
                  type="number"
                  min="1"
                  className={inputClasses}
                  value={formData.panelCount}
                  onChange={(e) => setFormData(p => ({ ...p, panelCount: parseInt(e.target.value) || 0 }))}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                   <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase">Faixa: {calcResult.tier}</span>
                   <span className="text-sm font-bold text-slate-700">
                    {formData.panelCount <= 5 ? formatCurrency(280) : `${formatCurrency(calcResult.pricePerPanel)} /unid`}
                   </span>
                </div>
              </label>

              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-300 transition-all hover:border-blue-400 group">
                <input
                  type="checkbox"
                  id="maintenance"
                  className="w-6 h-6 rounded cursor-pointer border-2 border-slate-300 bg-white appearance-none transition-all checked:bg-slate-900 checked:border-slate-900 relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-sm checked:after:font-black checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                  checked={formData.hasMaintenance}
                  onChange={(e) => setFormData(p => ({ ...p, hasMaintenance: e.target.checked }))}
                />
                <label htmlFor="maintenance" className="text-sm font-bold text-slate-800 cursor-pointer select-none flex-1">
                  Adicionar Manutenção Preventiva/Corretiva
                  <span className="block text-xs font-normal text-slate-500 mt-0.5 tracking-tight">Valor fixo adicional de {formatCurrency(MAINTENANCE_PRICE)}</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2 mt-4 pt-8 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-500" /> Coordenadas Geográficas do Local
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-tighter">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="-22.961689"
                    className={inputClasses}
                    onChange={(e) => handleCoordChange('lat', e.target.value)}
                  />
                  {loadingAddr && <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-3 bottom-3" />}
                </div>
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-tighter">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="-43.356483"
                    className={inputClasses}
                    onChange={(e) => handleCoordChange('lng', e.target.value)}
                  />
                </div>
              </div>

              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 Endereço Identificado (Auto)
              </h3>
              
              <div className="grid grid-cols-4 md:grid-cols-6 gap-5 opacity-80">
                <div className="col-span-4 md:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-tighter">Logradouro / Rua</label>
                  <input
                    type="text"
                    className={inputClasses}
                    value={formData.address.logradouro}
                    onChange={(e) => handleAddressChange('logradouro', e.target.value)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-tighter">Nº</label>
                  <input
                    type="text"
                    placeholder="123"
                    className={inputClasses}
                    value={formData.address.numero}
                    onChange={(e) => handleAddressChange('numero', e.target.value)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-tighter">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    className={`${inputClasses} text-center uppercase`}
                    value={formData.address.uf}
                    onChange={(e) => handleAddressChange('uf', e.target.value)}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-tighter">Cidade</label>
                  <input
                    type="text"
                    className={inputClasses}
                    value={formData.address.cidade}
                    onChange={(e) => handleAddressChange('cidade', e.target.value)}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-tighter">Bairro</label>
                  <input
                    type="text"
                    className={inputClasses}
                    value={formData.address.bairro}
                    onChange={(e) => handleAddressChange('bairro', e.target.value)}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-tighter">Complemento</label>
                  <input
                    type="text"
                    className={inputClasses}
                    value={formData.address.complemento}
                    onChange={(e) => handleAddressChange('complemento', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col md:flex-row items-stretch md:items-center justify-between p-6 bg-slate-900 text-white rounded-2xl gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl text-blue-400">
                {loadingGeo ? <Loader2 className="w-6 h-6 animate-spin" /> : <Truck className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distância Total Estimada</p>
                <p className="text-xl font-black">
                  {formData.distanceKm > 0 ? `${formData.distanceKm.toFixed(1)} km` : '--'}
                  {formData.distanceType === 'estimated' && <span className="ml-2 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full uppercase">Linha Reta</span>}
                </p>
              </div>
            </div>
            <div className="text-left md:text-right border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa de Deslocamento</p>
              <p className="text-2xl font-black text-blue-400">{formatCurrency(calcResult.travelFee)}</p>
              {formData.distanceKm > 50 && <p className="text-[10px] text-slate-400 font-medium">Acima de 50km: {formatCurrency(TRAVEL_FEE_RULES.PRICE_PER_KM)}/km integral</p>}
            </div>
          </div>

          {error && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-sm font-bold animate-pulse">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerateQuote}
            className="w-full mt-10 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
          >
            <CheckCircle2 className="w-6 h-6" />
            Gerar Orçamento Final
          </button>
        </div>

        {showSummary && (
          <div id="quote-summary" className="bg-white rounded-2xl shadow-2xl border-t-8 border-blue-600 p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase">Resumo</h2>
                <p className="text-slate-500 font-medium">Orçamento gerado em: {formData.calculatedAt?.toLocaleString('pt-BR')}</p>
              </div>
              <button
                onClick={() => generateQuotePdf(formData, calcResult)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg transition-all hover:-translate-y-1"
              >
                <FileDown className="w-6 h-6" />
                Baixar PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-l-4 border-blue-600 pl-3">Cliente</h4>
                  <p className="text-xl font-black text-slate-900">{formData.clientName}</p>
                  <p className="text-slate-600 font-bold text-lg">{formData.clientPhone}</p>
                  <div className="text-slate-500 text-sm mt-3 leading-relaxed font-medium">
                    {formData.address.logradouro}, {formData.address.numero}<br />
                    {formData.address.bairro}, {formData.address.cidade} - {formData.address.uf}<br />
                    Coordenadas: {formData.address.lat}, {formData.address.lng}
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Especificações do Serviço</h4>
                  <div className="flex items-center justify-between py-2 border-b border-slate-200/50">
                    <span className="text-slate-600 font-bold">Total de Placas:</span>
                    <span className="text-slate-900 font-black">{formData.panelCount} unid.</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600 font-bold">Valor Unitário:</span>
                    <span className="text-blue-600 font-black">
                      {formData.panelCount <= 5 ? "Valor Fixo" : formatCurrency(calcResult.pricePerPanel)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-3xl p-8 flex flex-col shadow-2xl">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Valores Detalhados</h4>
                
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Subtotal Limpeza</span>
                    <span className="font-bold">{formatCurrency(calcResult.cleaningSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Deslocamento</span>
                    <span className="font-bold">{formatCurrency(calcResult.travelFee)}</span>
                  </div>
                  {formData.hasMaintenance && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Manutenção Extra</span>
                      <span className="font-bold">{formatCurrency(calcResult.maintenanceFee)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col gap-1 items-end">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Total Investimento</span>
                  <span className="text-4xl font-black text-white">{formatCurrency(calcResult.total)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-2xl p-5 flex gap-4 border border-blue-100">
              <div className="bg-blue-600 text-white p-2 rounded-lg flex-shrink-0 h-fit">
                <Info className="w-5 h-5" />
              </div>
              <p className="text-sm text-blue-900 font-medium leading-relaxed">
                Este orçamento utiliza como ponto de origem nossa sede em: <strong className="text-blue-700">{ORIGIN_ADDRESS}</strong>.
                A distância calculada de {formData.distanceKm.toFixed(1)} km segue as normas de cobrança vigentes.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-16 text-center text-slate-500 text-xs px-4 border-t border-slate-200 pt-8 max-w-4xl mx-auto">
        <p className="font-bold text-slate-600 uppercase tracking-widest mb-2">Solar Quote Pro</p>
        <p>© {new Date().getFullYear()} - Sistema de Orçamento para Equipes de Vendas</p>
        <p className="mt-1 font-medium italic">Base Operacional: Taquara, Rio de Janeiro - RJ</p>
      </footer>
    </div>
  );
}

export default App;
