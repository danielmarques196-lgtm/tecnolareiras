// Lógica do caderno de campo: filtros, quantidades, exportação CSV.
import {
  NOMES_TIPO,
  TODA_EXPLORACAO,
  type DadosTratamento,
  type Registo,
  type Setor,
  type TipoRegisto,
} from '../dados/modelo';
import { gerarCsv, type Celula } from './csv';
import { formatarData, formatarNumero } from './formatos';
import { dataPodeColher } from './intervaloSeguranca';

export interface Filtros {
  tipo: TipoRegisto | '';
  setorId: string; // '' = todos
  de: string; // ISO ou ''
  ate: string; // ISO ou ''
}

export const FILTROS_VAZIOS: Filtros = { tipo: '', setorId: '', de: '', ate: '' };

/** Ordena por data (mais recente primeiro; empate: último criado primeiro). */
export function ordenarRegistos<T extends { data: string; criadoEm: string }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm));
}

export function filtrarRegistos(lista: Registo[], f: Filtros): Registo[] {
  return ordenarRegistos(
    lista.filter(
      (r) =>
        (!f.tipo || r.tipo === f.tipo) &&
        (!f.setorId || r.setorId === f.setorId) &&
        (!f.de || r.data >= f.de) &&
        (!f.ate || r.data <= f.ate),
    ),
  );
}

/** Área de um setor, ou soma de todos para "Toda a exploração". */
export function areaDoSetor(setorId: string, setores: Setor[]): number | null {
  if (setorId === TODA_EXPLORACAO) {
    const areas = setores.map((s) => s.areaHa).filter((a): a is number => a !== null);
    return areas.length ? areas.reduce((a, b) => a + b, 0) : null;
  }
  return setores.find((s) => s.id === setorId)?.areaHa ?? null;
}

/**
 * Quantidade total de produto gasta num tratamento.
 * L/ha, kg/ha → dose × área. mL/hL, g/hL, % → concentração × calda total.
 */
export function quantidadeTotalProduto(
  d: Pick<DadosTratamento, 'dose' | 'unidade' | 'calda' | 'areaTratada'>,
): { valor: number; unidade: 'L' | 'kg' } | null {
  const { dose, unidade, calda, areaTratada: area } = d;
  if (dose === null || area === null) return null;
  switch (unidade) {
    case 'L/ha':
      return { valor: dose * area, unidade: 'L' };
    case 'kg/ha':
      return { valor: dose * area, unidade: 'kg' };
  }
  if (calda === null) return null;
  const hl = (calda * area) / 100; // hectolitros de calda
  switch (unidade) {
    case 'mL/hL':
      return { valor: (dose * hl) / 1000, unidade: 'L' };
    case 'g/hL':
      return { valor: (dose * hl) / 1000, unidade: 'kg' };
    case '%':
      return { valor: (dose / 100) * calda * area, unidade: 'L' };
  }
  return null;
}

/** Nome do setor para relatórios. */
function nomeSetor(id: string, setores: Setor[]): string {
  if (id === TODA_EXPLORACAO) return 'Toda a exploração';
  return setores.find((s) => s.id === id)?.nome ?? '';
}

// ---------- Exportação geral (mesmas colunas da importação da app anterior) ----------
export const COLUNAS_CSV = [
  'data', 'tipo', 'setor', 'produto', 'substancia', 'apv', 'alvo', 'dose', 'unidade', 'calda', 'is',
  'aplicador', 'equipamento', 'modo', 'volume', 'horas', 'h2o2', 'operacao', 'horasMO', 'intensidade',
  'descricao', 'kg', 'destino', 'calibre', 'custo', 'notas',
] as const;

/** Uma linha do CSV geral (chave → valor). */
export function linhaCsv(r: Registo, setores: Setor[]): Record<(typeof COLUNAS_CSV)[number], Celula> {
  const l = Object.fromEntries(COLUNAS_CSV.map((c) => [c, ''])) as Record<(typeof COLUNAS_CSV)[number], Celula>;
  l.data = formatarData(r.data);
  l.tipo = NOMES_TIPO[r.tipo];
  l.setor = nomeSetor(r.setorId, setores);
  l.custo = r.custo;
  l.notas = r.notas;
  switch (r.tipo) {
    case 'tratamento': {
      const d = r.dados;
      Object.assign(l, {
        produto: d.produto, substancia: d.substancia, apv: d.apv, alvo: d.alvo, dose: d.dose,
        unidade: d.unidade, calda: d.calda, is: d.is, aplicador: d.aplicador, equipamento: d.equipamento,
      });
      break;
    }
    case 'adubacao':
      Object.assign(l, { produto: r.dados.produto, dose: r.dados.quantidade, unidade: r.dados.unidade, modo: r.dados.modo });
      break;
    case 'rega':
      Object.assign(l, { volume: r.dados.volume, horas: r.dados.duracao, h2o2: r.dados.h2o2 });
      break;
    case 'operacao':
      Object.assign(l, { operacao: r.dados.operacao, horasMO: r.dados.horasMO, descricao: r.dados.descricao });
      break;
    case 'observacao':
      Object.assign(l, { alvo: r.dados.praga, intensidade: r.dados.intensidade, descricao: r.dados.descricao });
      break;
    case 'colheita':
      Object.assign(l, { kg: r.dados.kg, destino: r.dados.destino, calibre: r.dados.calibre });
      break;
  }
  return l;
}

export function csvRegistos(lista: Registo[], setores: Setor[]): string {
  return gerarCsv(
    [...COLUNAS_CSV],
    ordenarRegistos(lista).map((r) => {
      const l = linhaCsv(r, setores);
      return COLUNAS_CSV.map((c) => l[c]);
    }),
  );
}

// ---------- Registo de aplicação de produtos fitofarmacêuticos ----------
export const COLUNAS_TRATAMENTOS = [
  'Data da aplicação',
  'Parcela / setor',
  'Cultura',
  'Área tratada (ha)',
  'Produto comercial',
  'N.º APV',
  'Substância ativa',
  'Inimigo / finalidade',
  'Dose',
  'Unidade da dose',
  'Volume de calda (L/ha)',
  'Quantidade total de produto',
  'Unidade',
  'Intervalo de segurança (dias)',
  'Colheita permitida a partir de',
  'Aplicador',
  'N.º de aplicador habilitado',
  'Equipamento',
  'Observações',
] as const;

export type Tratamento = Extract<Registo, { tipo: 'tratamento' }>;

export function eTratamento(r: Registo): r is Tratamento {
  return r.tipo === 'tratamento';
}

/** Linhas do registo de tratamentos, por ordem cronológica (como no caderno em papel). */
export function linhasTratamentos(lista: Registo[], setores: Setor[]): Celula[][] {
  return lista
    .filter(eTratamento)
    .sort((a, b) => a.data.localeCompare(b.data) || a.criadoEm.localeCompare(b.criadoEm))
    .map((r) => {
      const d = r.dados;
      const s = setores.find((x) => x.id === r.setorId);
      const cultura =
        r.setorId === TODA_EXPLORACAO
          ? [...new Set(setores.map((x) => x.cultura).filter(Boolean))].join(', ')
          : [s?.cultura, s?.variedade].filter(Boolean).join(' — ');
      const q = quantidadeTotalProduto(d);
      const colher = dataPodeColher(r.data, d.is);
      return [
        formatarData(r.data), nomeSetor(r.setorId, setores), cultura, d.areaTratada, d.produto, d.apv,
        d.substancia, d.alvo, d.dose, d.unidade, d.calda, q?.valor ?? null, q?.unidade ?? '', d.is,
        colher ? formatarData(colher) : '', d.aplicador, d.numAplicador, d.equipamento, r.notas,
      ];
    });
}

export function csvTratamentos(lista: Registo[], setores: Setor[]): string {
  return gerarCsv([...COLUNAS_TRATAMENTOS], linhasTratamentos(lista, setores));
}

/** Texto curto que descreve o registo na lista (ex.: "40,5 m³ · 3 h · H₂O₂ 1,2 L"). */
export function resumoRegisto(r: Registo): string {
  const n = (v: number | null, u: string, casas = 2) => (v === null ? '' : `${formatarNumero(v, casas)} ${u}`);
  const juntar = (...p: (string | false | null | undefined)[]) => p.filter(Boolean).join(' · ');
  switch (r.tipo) {
    case 'tratamento': {
      const d = r.dados;
      return juntar(d.produto, d.dose !== null && `${formatarNumero(d.dose, 3)} ${d.unidade}`, d.alvo, d.is !== null && `IS ${d.is} dias`);
    }
    case 'adubacao':
      return juntar(r.dados.produto, n(r.dados.quantidade, r.dados.unidade, 3), r.dados.modo);
    case 'rega':
      return juntar(n(r.dados.volume, 'm³'), n(r.dados.duracao, 'h'), r.dados.h2o2 !== null && `H₂O₂ ${n(r.dados.h2o2, 'L')}`);
    case 'operacao':
      return juntar(r.dados.operacao, n(r.dados.horasMO, 'h MO'), r.dados.descricao);
    case 'observacao':
      return juntar(r.dados.praga, `intensidade ${r.dados.intensidade}`, r.dados.descricao);
    case 'colheita':
      return juntar(n(r.dados.kg, 'kg', 0), r.dados.destino, r.dados.calibre);
  }
}
