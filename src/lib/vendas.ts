// Colheita e vendas: receita, totais por setor e campanha, margem.
import { TODA_EXPLORACAO, type Entrega, type Registo, type Setor } from '../dados/modelo';
import { doAno } from './campanha';

/** kg vendáveis = entregues − quebras. */
export function kgLiquidos(e: Pick<Entrega, 'kg' | 'quebras'>): number {
  return Math.max(0, (e.kg ?? 0) - (e.quebras ?? 0));
}

/** Receita escrita à mão, ou (kg − quebras) × preço/kg. */
export function receitaEntrega(e: Pick<Entrega, 'kg' | 'quebras' | 'precoKg' | 'receita'>): number {
  if (e.receita !== null) return e.receita;
  return e.precoKg === null ? 0 : kgLiquidos(e) * e.precoKg;
}

/**
 * Custos da campanha por setor. Os custos de «Toda a exploração» repartem-se pela área
 * (ou em partes iguais se nenhum setor tiver área).
 */
export function custosPorSetor(registos: Registo[], setores: Setor[], ano: number): Map<string, number> {
  const m = new Map<string, number>(setores.map((s) => [s.id, 0]));
  const area = setores.reduce((a, s) => a + (s.areaHa ?? 0), 0);
  for (const r of doAno(registos, ano)) {
    const c = r.custo ?? 0;
    if (!c) continue;
    if (r.setorId === TODA_EXPLORACAO) {
      for (const s of setores) {
        const parte = area > 0 ? (s.areaHa ?? 0) / area : 1 / setores.length;
        m.set(s.id, (m.get(s.id) ?? 0) + c * parte);
      }
    } else m.set(r.setorId, (m.get(r.setorId) ?? 0) + c);
  }
  return m;
}

export interface Totais {
  kgEntregues: number;
  quebras: number;
  kgLiquidos: number;
  receita: number;
  custos: number;
  margem: number;
  areaHa: number | null;
  margemHa: number | null;
  margemKg: number | null;
  precoMedio: number | null;
}

function fechar(t: Omit<Totais, 'margem' | 'margemHa' | 'margemKg' | 'precoMedio'>): Totais {
  const margem = t.receita - t.custos;
  return {
    ...t,
    margem,
    margemHa: t.areaHa ? margem / t.areaHa : null,
    margemKg: t.kgLiquidos > 0 ? margem / t.kgLiquidos : null,
    precoMedio: t.kgLiquidos > 0 ? t.receita / t.kgLiquidos : null,
  };
}

export interface TotaisSetor extends Totais {
  setorId: string;
}

export function totaisCampanha(
  entregas: Entrega[],
  registos: Registo[],
  setores: Setor[],
  ano: number,
): { porSetor: TotaisSetor[]; total: Totais; calibres: { calibre: string; kg: number }[] } {
  const doAnoE = doAno(entregas, ano);
  const custos = custosPorSetor(registos, setores, ano);
  const ids = [...new Set([...setores.map((s) => s.id), ...doAnoE.map((e) => e.setorId)])];
  const porSetor = ids.map((id) => {
    const es = doAnoE.filter((e) => e.setorId === id);
    const s = setores.find((x) => x.id === id);
    return {
      setorId: id,
      ...fechar({
        kgEntregues: es.reduce((a, e) => a + (e.kg ?? 0), 0),
        quebras: es.reduce((a, e) => a + (e.quebras ?? 0), 0),
        kgLiquidos: es.reduce((a, e) => a + kgLiquidos(e), 0),
        receita: es.reduce((a, e) => a + receitaEntrega(e), 0),
        custos: custos.get(id) ?? 0,
        areaHa: s?.areaHa ?? null,
      }),
    };
  });
  const soma = (k: keyof Totais) => porSetor.reduce((a, t) => a + ((t[k] as number | null) ?? 0), 0);
  const area = setores.reduce((a, s) => a + (s.areaHa ?? 0), 0);
  const total = fechar({
    kgEntregues: soma('kgEntregues'),
    quebras: soma('quebras'),
    kgLiquidos: soma('kgLiquidos'),
    receita: soma('receita'),
    custos: soma('custos'),
    areaHa: area || null,
  });
  const cal = new Map<string, number>();
  for (const e of doAnoE) for (const c of e.calibres) if (c.calibre) cal.set(c.calibre, (cal.get(c.calibre) ?? 0) + c.kg);
  const calibres = [...cal].map(([calibre, kg]) => ({ calibre, kg })).sort((a, b) => b.kg - a.kg);
  return { porSetor: porSetor.filter((t) => t.kgEntregues || t.custos || t.receita), total, calibres };
}
