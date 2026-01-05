
import { Address } from '../types';

export const fetchAddressByCep = async (cep: string): Promise<Partial<Address> | null> => {
  const sanitizedCep = cep.replace(/\D/g, '');
  if (sanitizedCep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${sanitizedCep}/json/`);
    const data = await response.json();

    if (data.erro) return null;

    return {
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      uf: data.uf,
      cep: data.cep
    };
  } catch (error) {
    console.error("Error fetching CEP:", error);
    return null;
  }
};
