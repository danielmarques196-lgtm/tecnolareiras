// Formatos portugueses: datas dd/mm/aaaa, vírgula decimal, unidades métricas.

/** 'AAAA-MM-DD' → 'dd/mm/aaaa'. Devolve '' para valores vazios. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Instante ISO → 'dd/mm/aaaa hh:mm' (hora local). */
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 'dd/mm/aaaa' (ou d/m/aaaa) → 'AAAA-MM-DD'; aceita também ISO. null se inválida. */
export function lerData(texto: string): string | null {
  const t = texto.trim();
  let a: number, m: number, d: number;
  let r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (r) {
    d = +r[1];
    m = +r[2];
    a = +r[3];
  } else if ((r = /^(\d{4})-(\d{2})-(\d{2})/.exec(t))) {
    a = +r[1];
    m = +r[2];
    d = +r[3];
  } else return null;
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return isoDeUTC(dt);
}

const fmtCache = new Map<string, Intl.NumberFormat>();
function fmt(min: number, max: number): Intl.NumberFormat {
  const k = `${min}-${max}`;
  let f = fmtCache.get(k);
  if (!f) {
    f = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: min, maximumFractionDigits: max });
    fmtCache.set(k, f);
  }
  return f;
}

/** Número com vírgula decimal e espaço como separador de milhares. '' para null. */
export function formatarNumero(n: number | null | undefined, casas = 2, minCasas = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return fmt(minCasas, casas).format(n);
}

/** Valor em euros: '1 234,50 €'. */
export function formatarEuros(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return `${fmt(2, 2).format(n)} €`;
}

/**
 * Lê um número escrito por uma pessoa: aceita vírgula ou ponto decimal e espaços.
 * '1 234,5' → 1234.5; '1.234,5' → 1234.5; '1.25' → 1.25; '' → null; texto inválido → null.
 */
export function lerNumero(texto: string | number | null | undefined): number | null {
  if (texto === null || texto === undefined) return null;
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : null;
  let t = texto.trim().replace(/[\s\u00a0\u202f]/g, '');
  if (t === '') return null;
  if (t.includes(',')) {
    // vírgula é decimal; pontos antes dela são milhares
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(t)) {
    // '1.234.567' (vários pontos) → milhares. Um só ponto é sempre decimal
    // ('1.250' = 1,25): no teclado numérico do telemóvel o ponto faz de vírgula.
    t = t.replace(/\./g, '');
  }
  if (!/^-?\d*\.?\d+$/.test(t) && !/^-?\d+\.$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// ---------- datas (sem fusos: trabalhamos com datas de calendário) ----------
function isoDeUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Data de hoje (local) em ISO 'AAAA-MM-DD'. */
export function hojeISO(agora = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

/** Soma dias a uma data ISO. */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return isoDeUTC(new Date(Date.UTC(a, m - 1, d + dias)));
}

/** N.º de dias de `de` até `ate` (positivo se `ate` for depois). */
export function diasEntre(de: string, ate: string): number {
  const ms = (iso: string) => {
    const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((ms(ate) - ms(de)) / 86_400_000);
}
