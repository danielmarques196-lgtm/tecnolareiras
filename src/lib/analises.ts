// Análises de solo e de água: campos, leitura de valores com "<" / "n.d.", interpretação.
import type { AnaliseAgua, AnaliseSolo, Qualificadores } from '../dados/modelo';
import type { DefCampo, ValoresForm } from './formulario';
import { formatarNumero, lerNumero } from './formatos';

export interface Parametro {
  chave: string;
  nome: string;
  unidade: string;
}

const COMUNS: DefCampo[] = [
  { chave: 'data', rotulo: 'Data do boletim', tipo: 'data', obrigatorio: true, grupo: 'id' },
  { chave: 'laboratorio', rotulo: 'Laboratório', tipo: 'texto', grupo: 'id' },
  { chave: 'boletim', rotulo: 'N.º de boletim / amostra', tipo: 'texto', grupo: 'id' },
];

export const PARAMETROS_SOLO: (Parametro & { grupo: string })[] = [
  { chave: 'areia', nome: 'Areia', unidade: '%', grupo: 'Textura' },
  { chave: 'limo', nome: 'Limo', unidade: '%', grupo: 'Textura' },
  { chave: 'argila', nome: 'Argila', unidade: '%', grupo: 'Textura' },
  { chave: 'ph', nome: 'pH (H₂O)', unidade: '', grupo: 'Geral' },
  { chave: 'mo', nome: 'Matéria orgânica', unidade: '%', grupo: 'Geral' },
  { chave: 'ce', nome: 'Condutividade elétrica', unidade: 'dS/m', grupo: 'Geral' },
  { chave: 'p', nome: 'P assimilável', unidade: 'mg/kg', grupo: 'Assimiláveis' },
  { chave: 'k', nome: 'K assimilável', unidade: 'mg/kg', grupo: 'Assimiláveis' },
  { chave: 'mg', nome: 'Mg assimilável', unidade: 'mg/kg', grupo: 'Assimiláveis' },
  { chave: 'ca_troca', nome: 'Ca de troca', unidade: 'cmolc/kg', grupo: 'Bases de troca' },
  { chave: 'mg_troca', nome: 'Mg de troca', unidade: 'cmolc/kg', grupo: 'Bases de troca' },
  { chave: 'k_troca', nome: 'K de troca', unidade: 'cmolc/kg', grupo: 'Bases de troca' },
  { chave: 'na_troca', nome: 'Na de troca', unidade: 'cmolc/kg', grupo: 'Bases de troca' },
  { chave: 'ctc', nome: 'CTC', unidade: 'cmolc/kg', grupo: 'Bases de troca' },
  { chave: 'acidez', nome: 'Acidez titulável', unidade: 'cmolc/kg', grupo: 'Bases de troca' },
  { chave: 'fe', nome: 'Ferro (Fe)', unidade: 'mg/kg', grupo: 'Micronutrientes' },
  { chave: 'mn', nome: 'Manganês (Mn)', unidade: 'mg/kg', grupo: 'Micronutrientes' },
  { chave: 'zn', nome: 'Zinco (Zn)', unidade: 'mg/kg', grupo: 'Micronutrientes' },
  { chave: 'cu', nome: 'Cobre (Cu)', unidade: 'mg/kg', grupo: 'Micronutrientes' },
  { chave: 'b', nome: 'Boro (B)', unidade: 'mg/kg', grupo: 'Micronutrientes' },
];

export const PARAMETROS_AGUA: Parametro[] = [
  { chave: 'ph', nome: 'pH', unidade: '' },
  { chave: 'ce', nome: 'Condutividade elétrica', unidade: 'µS/cm' },
  { chave: 'fe', nome: 'Ferro (Fe)', unidade: 'mg/L' },
  { chave: 'mn', nome: 'Manganês (Mn)', unidade: 'mg/L' },
  { chave: 'nitratos', nome: 'Nitratos', unidade: 'mg/L' },
  { chave: 'ecoli', nome: 'E. coli', unidade: 'UFC/100 mL' },
  { chave: 'coliformes', nome: 'Coliformes totais', unidade: 'UFC/100 mL' },
];

export const AJUDA_VALOR = 'Pode escrever «<4» (abaixo do limite) ou «n.d.» (não detetável)';

function defsParametros(ps: (Parametro & { grupo?: string })[]): DefCampo[] {
  return ps.map((p) => ({
    chave: p.chave,
    rotulo: p.nome,
    tipo: 'texto' as const, // texto para aceitar "<4" e "n.d."; validado em validarAnalise
    unidade: p.unidade || undefined,
    grupo: p.grupo ? `g-${p.grupo}` : `g-${Math.floor(ps.indexOf(p) / 2)}`,
  }));
}

export const DEFS_SOLO: DefCampo[] = [...COMUNS, ...defsParametros(PARAMETROS_SOLO), { chave: 'notas', rotulo: 'Notas', tipo: 'textoLongo' }];
export const DEFS_AGUA: DefCampo[] = [...COMUNS, ...defsParametros(PARAMETROS_AGUA), { chave: 'notas', rotulo: 'Notas', tipo: 'textoLongo' }];

// ---------- valores com qualificador ----------
export interface ValorAnalise {
  valor: number | null;
  qual?: '<' | 'nd';
}

/** "5,81" → 5.81; "<4" → {4, '<'}; "n.d."/"nd"/"ND" → {null, 'nd'}; "" → null. undefined = inválido. */
export function lerValorAnalise(texto: string): ValorAnalise | undefined {
  const t = texto.trim();
  if (t === '') return { valor: null };
  if (/^n\.?\s*d\.?$/i.test(t) || /^não\s+detet[aá]vel$/i.test(t)) return { valor: null, qual: 'nd' };
  const m = /^<\s*(.+)$/.exec(t);
  if (m) {
    const n = lerNumero(m[1]);
    return n === null ? undefined : { valor: n, qual: '<' };
  }
  const n = lerNumero(t);
  return n === null ? undefined : { valor: n };
}

export function formatarValorAnalise(valor: number | null | undefined, qual?: '<' | 'nd', casas = 3): string {
  if (qual === 'nd') return 'n.d.';
  if (valor === null || valor === undefined) return '';
  return `${qual === '<' ? '<' : ''}${formatarNumero(valor, casas)}`;
}

type Analise = AnaliseSolo | AnaliseAgua;

export function analiseParaForm(defs: DefCampo[], a: Partial<Analise>): ValoresForm {
  const f: ValoresForm = {};
  const obj = a as Record<string, unknown>;
  const q: Qualificadores = a.qualificadores ?? {};
  for (const d of defs) {
    const v = obj[d.chave];
    if (d.chave in q || typeof v === 'number') f[d.chave] = formatarValorAnalise(v as number | null, q[d.chave], 6).replace(/[\s  ]/g, '');
    else f[d.chave] = v === null || v === undefined ? '' : String(v);
  }
  return f;
}

/** Erros por campo; os parâmetros aceitam número, "<n" e "n.d.". */
export function validarAnalise(defs: DefCampo[], params: Parametro[], f: ValoresForm): Record<string, string> {
  const e: Record<string, string> = {};
  for (const d of defs) if (d.obrigatorio && !(f[d.chave] ?? '').trim()) e[d.chave] = 'Campo obrigatório';
  for (const p of params) {
    const v = lerValorAnalise(f[p.chave] ?? '');
    if (v === undefined) e[p.chave] = 'Valor inválido (ex.: 5,81, <4 ou n.d.)';
    else if (v.valor !== null && v.valor < 0) e[p.chave] = 'Não pode ser negativo';
  }
  return e;
}

/** Texto do formulário → campos da análise (parâmetros + qualificadores + identificação). */
export function formParaAnalise(defs: DefCampo[], params: Parametro[], f: ValoresForm): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const qualificadores: Qualificadores = {};
  const chavesParam = new Set(params.map((p) => p.chave));
  for (const d of defs) {
    const t = (f[d.chave] ?? '').trim();
    if (chavesParam.has(d.chave)) {
      const v = lerValorAnalise(t) ?? { valor: null };
      out[d.chave] = v.valor;
      if (v.qual) qualificadores[d.chave] = v.qual;
    } else out[d.chave] = t;
  }
  out.qualificadores = qualificadores;
  return out;
}

// ---------- séries para gráficos ----------
export interface Ponto {
  data: string;
  valor: number;
  menor?: boolean; // abaixo do limite de quantificação (valor = limite)
}

export function serieParametro(analises: Analise[], chave: string): Ponto[] {
  return analises
    .map((a) => {
      const v = (a as unknown as Record<string, number | null>)[chave];
      const q = a.qualificadores?.[chave];
      return v === null || v === undefined || q === 'nd' ? null : { data: a.data, valor: v, ...(q === '<' ? { menor: true } : {}) };
    })
    .filter((p): p is Ponto => p !== null)
    .sort((a, b) => a.data.localeCompare(b.data));
}

// ---------- interpretação ----------
/** Classe textural USDA (nomes em português) a partir de % areia, limo e argila. */
export function classeTextura(areia: number | null, limo: number | null, argila: number | null): string | null {
  if (areia === null || limo === null || argila === null) return null;
  const soma = areia + limo + argila;
  if (soma < 95 || soma > 105) return null;
  const [s, si, c] = [areia, limo, argila].map((v) => (v * 100) / soma);
  if (si + 1.5 * c < 15) return 'Arenoso';
  if (si + 2 * c < 30) return 'Areno-franco';
  if (c >= 40 && si >= 40) return 'Argilo-limoso';
  if (c >= 40 && s <= 45) return 'Argiloso';
  if (c >= 35 && s > 45) return 'Argilo-arenoso';
  if (c >= 27 && c < 40 && s <= 20) return 'Franco-argilo-limoso';
  if (c >= 27 && c < 40 && s > 20 && s <= 45) return 'Franco-argiloso';
  if (c >= 20 && c < 35 && si < 28 && s > 45) return 'Franco-argilo-arenoso';
  if (si >= 80 && c < 12) return 'Limoso';
  if ((si >= 50 && c >= 12 && c < 27) || (si >= 50 && si < 80 && c < 12)) return 'Franco-limoso';
  if (c >= 7 && c < 27 && si >= 28 && si < 50 && s <= 52) return 'Franco';
  return 'Franco-arenoso';
}

/** Classe do pH(H₂O) do solo (escala usada pelo LQARS). */
export function classePhSolo(ph: number | null): string | null {
  if (ph === null) return null;
  if (ph <= 4.5) return 'hiperácido';
  if (ph <= 5.5) return 'ácido';
  if (ph <= 6.5) return 'pouco ácido';
  if (ph <= 7.5) return 'neutro';
  if (ph <= 8.5) return 'pouco alcalino';
  return 'alcalino';
}

export type NivelRisco = 'baixo' | 'moderado' | 'severo';

export interface Limiar {
  valor: number;
  rotulo: string;
}

/**
 * Risco de entupimento de gotejadores (Nakayama & Bucks, 1986) e restrição de uso pela salinidade
 * (Ayers & Westcot, FAO 29: CE em µS/cm). `limiares` serve para as linhas de referência dos gráficos.
 */
export const RISCO_AGUA: Record<string, { limiares: [number, number]; descricao: string }> = {
  fe: { limiares: [0.1, 1.5], descricao: 'Entupimento (ferro)' },
  mn: { limiares: [0.1, 1.5], descricao: 'Entupimento (manganês)' },
  ph: { limiares: [7, 8], descricao: 'Entupimento (precipitados)' },
  ce: { limiares: [700, 3000], descricao: 'Salinidade' },
};

export function riscoAgua(chave: string, valor: number | null, qual?: '<' | 'nd'): NivelRisco | null {
  const r = RISCO_AGUA[chave];
  if (!r || valor === null || qual === 'nd') return null;
  const [moderado, severo] = r.limiares;
  if (qual === '<' && valor <= moderado) return 'baixo';
  if (valor > severo) return 'severo';
  if (valor >= moderado) return 'moderado';
  return 'baixo';
}

export function limiaresGrafico(chave: string): Limiar[] {
  const r = RISCO_AGUA[chave];
  if (!r) return [];
  return [
    { valor: r.limiares[0], rotulo: `risco moderado (${formatarNumero(r.limiares[0])})` },
    { valor: r.limiares[1], rotulo: `risco severo (${formatarNumero(r.limiares[1])})` },
  ];
}
