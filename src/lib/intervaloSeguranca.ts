import { somarDias } from './formatos';

/**
 * Primeiro dia em que se pode colher após um tratamento: data + IS + 1 dia.
 * null se o tratamento não tem intervalo de segurança.
 */
export function dataPodeColher(data: string, is: number | null): string | null {
  if (is === null || is <= 0) return null;
  return somarDias(data, Math.ceil(is) + 1);
}
