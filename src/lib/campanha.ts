// Indicadores da campanha (ano civil).
import type { Registo, Setor } from '../dados/modelo';

export interface Indicadores {
  registos: number;
  tratamentos: number;
  kgColhidos: number;
  m3Regados: number;
  custos: number;
  areaHa: number;
  /** null se a área total for 0/desconhecida. */
  custoPorHa: number | null;
}

export const doAno = <T extends { data: string }>(lista: T[], ano: number): T[] =>
  lista.filter((r) => r.data.startsWith(`${ano}-`));

export function areaTotal(setores: Setor[]): number {
  return setores.reduce((a, s) => a + (s.areaHa ?? 0), 0);
}

export function indicadoresCampanha(todos: Registo[], setores: Setor[], ano: number): Indicadores {
  const lista = doAno(todos, ano);
  let kg = 0;
  let m3 = 0;
  let custos = 0;
  let tratamentos = 0;
  for (const r of lista) {
    custos += r.custo ?? 0;
    if (r.tipo === 'tratamento') tratamentos++;
    else if (r.tipo === 'colheita') kg += r.dados.kg ?? 0;
    else if (r.tipo === 'rega') m3 += r.dados.volume ?? 0;
  }
  const area = areaTotal(setores);
  return {
    registos: lista.length,
    tratamentos,
    kgColhidos: kg,
    m3Regados: m3,
    custos,
    areaHa: area,
    custoPorHa: area > 0 ? custos / area : null,
  };
}

/** Anos com registos (mais o ano atual), do mais recente para o mais antigo. */
export function anosDisponiveis(datas: string[], anoAtual: number): number[] {
  return [...new Set([anoAtual, ...datas.map((d) => Number(d.slice(0, 4))).filter((a) => a > 1900)])].sort((a, b) => b - a);
}
