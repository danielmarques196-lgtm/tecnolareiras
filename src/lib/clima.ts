// Clima (Open-Meteo, gratuito, sem chave): previsão a 7 dias, precipitação, temperatura e ETo FAO-56.
import { somarDias } from './formatos';

export interface Localizacao {
  latitude: number;
  longitude: number;
  nome: string;
}

/** Predefinição até o utilizador indicar a localização da herdade (Definições). */
export const LOCALIZACAO_PREDEFINIDA: Localizacao = { latitude: 39.2362, longitude: -8.6859, nome: 'Santarém (predefinição)' };

/** Dias para trás pedidos à API (máximo da Open-Meteo: 92), para a ETo desde a última rega. */
export const DIAS_PASSADOS = 92;
export const DIAS_PREVISAO = 7;
/** Atualiza automaticamente se a cache tiver mais do que isto. */
export const VALIDADE_CACHE_MS = 3 * 60 * 60 * 1000;

export function urlOpenMeteo({ latitude, longitude }: Pick<Localizacao, 'latitude' | 'longitude'>): string {
  const p = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration',
    timezone: 'Europe/Lisbon',
    past_days: String(DIAS_PASSADOS),
    forecast_days: String(DIAS_PREVISAO + 1),
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

export interface Dia {
  data: string;
  tmax: number | null;
  tmin: number | null;
  chuva: number | null; // mm
  eto: number | null; // mm
}

interface RespostaOpenMeteo {
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
    et0_fao_evapotranspiration?: (number | null)[];
  };
}

/** Converte a resposta da API numa lista de dias. Lança erro se o formato não for o esperado. */
export function lerDias(resposta: unknown): Dia[] {
  const d = (resposta as RespostaOpenMeteo)?.daily;
  if (!d?.time || !Array.isArray(d.time)) throw new Error('Resposta da Open-Meteo sem dados diários.');
  const v = (a: (number | null)[] | undefined, i: number) => (a && typeof a[i] === 'number' ? a[i] : null);
  return d.time.map((data, i) => ({
    data,
    tmax: v(d.temperature_2m_max, i),
    tmin: v(d.temperature_2m_min, i),
    chuva: v(d.precipitation_sum, i),
    eto: v(d.et0_fao_evapotranspiration, i),
  }));
}

/** Próximos dias a partir de hoje (inclusive). */
export function previsao(dias: Dia[], hoje: string, n = DIAS_PREVISAO): Dia[] {
  return dias.filter((d) => d.data >= hoje).slice(0, n);
}

/** Época de rega: março a outubro. */
export function emEpocaDeRega(hoje: string): boolean {
  const mes = Number(hoje.slice(5, 7));
  return mes >= 3 && mes <= 10;
}

export interface Balanco {
  desde: string; // data da última rega
  dias: number; // dias com dados contados
  eto: number; // mm acumulados
  chuva: number; // mm acumulados
  /** Os dados disponíveis não cobrem todo o período (rega há mais de 92 dias). */
  incompleto: boolean;
}

/**
 * ETo e chuva acumuladas desde a última rega: soma dos dias depois da rega até hoje (inclusive).
 * 1 mm = 10 m³/ha.
 */
export function etoDesdeRega(dias: Dia[], ultimaRega: string, hoje: string): Balanco {
  const janela = dias.filter((d) => d.data > ultimaRega && d.data <= hoje);
  const primeiro = dias[0]?.data;
  return {
    desde: ultimaRega,
    dias: janela.length,
    eto: janela.reduce((a, d) => a + (d.eto ?? 0), 0),
    chuva: janela.reduce((a, d) => a + (d.chuva ?? 0), 0),
    incompleto: !primeiro || primeiro > somarDias(ultimaRega, 1),
  };
}

export const mmParaM3Ha = (mm: number) => mm * 10;
