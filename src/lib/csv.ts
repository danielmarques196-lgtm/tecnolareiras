// CSV para Excel em português: separador ';', BOM UTF-8, quebras de linha CRLF.
import { formatarNumero } from './formatos';

export const BOM = '\uFEFF';
export const SEPARADOR = ';';

export type Celula = string | number | null | undefined;

/** Põe aspas quando a célula tem separador, aspas ou quebra de linha. */
export function escaparCelula(v: Celula): string {
  if (v === null || v === undefined) return '';
  const t = typeof v === 'number' ? formatarNumeroCsv(v) : v;
  return /[";\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** Números para CSV: vírgula decimal, sem separador de milhares (o Excel lê melhor). */
export function formatarNumeroCsv(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return formatarNumero(n, 6).replace(/[\s\u00a0\u202f]/g, '');
}

export function gerarCsv(cabecalhos: string[], linhas: Celula[][]): string {
  const todas = [cabecalhos, ...linhas].map((l) => l.map(escaparCelula).join(SEPARADOR));
  return BOM + todas.join('\r\n') + '\r\n';
}

/**
 * Lê CSV com separador ';' (aspas opcionais, aspas duplicadas, quebras de linha dentro de aspas).
 * Remove o BOM se existir. Devolve uma lista de linhas (cada linha uma lista de células).
 */
export function lerCsv(texto: string, separador = SEPARADOR): string[][] {
  const t = texto.startsWith(BOM) ? texto.slice(1) : texto;
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = '';
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          celula += '"';
          i++;
        } else aspas = false;
      } else celula += c;
    } else if (c === '"') aspas = true;
    else if (c === separador) {
      linha.push(celula);
      celula = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = '';
    } else celula += c;
  }
  if (celula !== '' || linha.length) {
    linha.push(celula);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => c.trim() !== ''));
}
