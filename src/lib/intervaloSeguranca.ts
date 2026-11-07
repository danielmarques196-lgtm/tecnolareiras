import { diasEntre, somarDias } from './formatos';

/**
 * Primeiro dia em que se pode colher após um tratamento: data + IS + 1 dia.
 * null se o tratamento não tem intervalo de segurança.
 */
export function dataPodeColher(data: string, is: number | null): string | null {
  if (is === null || is <= 0) return null;
  return somarDias(data, Math.ceil(is) + 1);
}

export interface ISaDecorrer {
  setorId: string;
  /** Primeiro dia em que se pode colher (o mais tardio de todos os tratamentos do setor). */
  podeColher: string;
  diasEmFalta: number;
  /** Tratamento que determina a data. */
  registoId: string;
  produto: string;
  dataTratamento: string;
}

interface TratamentoIS {
  id: string;
  data: string;
  setorId: string;
  dados: { is: number | null; produto: string };
}

/**
 * Setores com intervalo de segurança a decorrer em `hoje`.
 * Se houver vários tratamentos no mesmo setor, vale o que termina mais tarde.
 * Um tratamento em "Toda a exploração" (`todaExploracao`) conta para todos os setores.
 */
export function setoresComISaDecorrer(
  tratamentos: TratamentoIS[],
  setorIds: string[],
  hoje: string,
  todaExploracao = '*',
): ISaDecorrer[] {
  const porSetor = new Map<string, ISaDecorrer>();
  for (const t of tratamentos) {
    const colher = dataPodeColher(t.data, t.dados.is);
    if (!colher || colher <= hoje) continue;
    const alvos = t.setorId === todaExploracao ? setorIds : [t.setorId];
    for (const s of alvos) {
      const atual = porSetor.get(s);
      if (!atual || colher > atual.podeColher) {
        porSetor.set(s, {
          setorId: s,
          podeColher: colher,
          diasEmFalta: diasEntre(hoje, colher),
          registoId: t.id,
          produto: t.dados.produto,
          dataTratamento: t.data,
        });
      }
    }
  }
  return [...porSetor.values()].sort((a, b) => b.podeColher.localeCompare(a.podeColher));
}
