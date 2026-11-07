import { describe, expect, it } from 'vitest';
import { TODA_EXPLORACAO, type DadosTratamento, type Registo, type Setor } from '../dados/modelo';
import { BOM, lerCsv } from './csv';
import { dataPodeColher } from './intervaloSeguranca';
import {
  areaDoSetor,
  COLUNAS_CSV,
  COLUNAS_TRATAMENTOS,
  csvRegistos,
  csvTratamentos,
  filtrarRegistos,
  FILTROS_VAZIOS,
  quantidadeTotalProduto,
} from './registos';

const base = { criadoEm: '2026-01-01T00:00:00Z', atualizadoEm: '2026-01-01T00:00:00Z', custo: null, notas: '' };
const setor = (id: string, nome: string, areaHa: number | null): Setor => ({
  ...base, id, nome, areaHa, cultura: 'Romãzeira', variedade: 'Wonderful', anoPlantacao: 2020, numArvores: null, compasso: '5 × 3 m', notas: '',
});
const setores = [setor('s1', 'Setor 4+7', 3.2), setor('s2', 'Setor 1', 1.5)];

const trat = (id: string, data: string, setorId: string, d: Partial<DadosTratamento> = {}): Registo => ({
  ...base, id, data, setorId, tipo: 'tratamento',
  dados: {
    produto: 'Cobre X', substancia: 'oxicloreto de cobre', apv: '1234', alvo: 'Antracnose', dose: 2, unidade: 'kg/ha',
    calda: 800, is: 14, areaTratada: 3.2, aplicador: 'João', numAplicador: 'AP-1', equipamento: 'Atomizador', ...d,
  },
});
const rega = (id: string, data: string, setorId: string): Registo => ({
  ...base, id, data, setorId, tipo: 'rega', dados: { volume: 40.5, duracao: 3, h2o2: 1.2 },
});

const lista = [trat('t1', '2026-05-10', 's1'), rega('r1', '2026-06-01', 's1'), rega('r2', '2026-04-01', 's2'), trat('t2', '2026-03-01', TODA_EXPLORACAO)];

describe('filtros', () => {
  it('ordena do mais recente para o mais antigo', () => {
    expect(filtrarRegistos(lista, FILTROS_VAZIOS).map((r) => r.id)).toEqual(['r1', 't1', 'r2', 't2']);
  });
  it('filtra por tipo, setor e intervalo de datas (inclusive)', () => {
    expect(filtrarRegistos(lista, { ...FILTROS_VAZIOS, tipo: 'rega' }).map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(filtrarRegistos(lista, { ...FILTROS_VAZIOS, setorId: 's1' }).map((r) => r.id)).toEqual(['r1', 't1']);
    expect(filtrarRegistos(lista, { ...FILTROS_VAZIOS, de: '2026-04-01', ate: '2026-05-10' }).map((r) => r.id)).toEqual(['t1', 'r2']);
  });
});

describe('áreas e quantidades', () => {
  it('área de "Toda a exploração" é a soma dos setores', () => {
    expect(areaDoSetor(TODA_EXPLORACAO, setores)).toBeCloseTo(4.7);
    expect(areaDoSetor('s2', setores)).toBe(1.5);
    expect(areaDoSetor('x', setores)).toBeNull();
  });
  it('dose por hectare × área', () => {
    expect(quantidadeTotalProduto({ dose: 2, unidade: 'kg/ha', calda: null, areaTratada: 3.2 })).toEqual({ valor: 6.4, unidade: 'kg' });
    expect(quantidadeTotalProduto({ dose: 1.5, unidade: 'L/ha', calda: null, areaTratada: 2 })).toEqual({ valor: 3, unidade: 'L' });
  });
  it('concentração × calda total', () => {
    // 150 mL/hL, 1000 L/ha, 2 ha → 20 hL de calda → 3000 mL = 3 L
    expect(quantidadeTotalProduto({ dose: 150, unidade: 'mL/hL', calda: 1000, areaTratada: 2 })).toEqual({ valor: 3, unidade: 'L' });
    // 300 g/hL, 800 L/ha, 1 ha → 8 hL → 2400 g = 2,4 kg
    expect(quantidadeTotalProduto({ dose: 300, unidade: 'g/hL', calda: 800, areaTratada: 1 })?.valor).toBeCloseTo(2.4);
    // 0,5 %, 1000 L/ha, 1 ha → 5 L
    expect(quantidadeTotalProduto({ dose: 0.5, unidade: '%', calda: 1000, areaTratada: 1 })).toEqual({ valor: 5, unidade: 'L' });
  });
  it('sem dados suficientes devolve null', () => {
    expect(quantidadeTotalProduto({ dose: 150, unidade: 'mL/hL', calda: null, areaTratada: 2 })).toBeNull();
    expect(quantidadeTotalProduto({ dose: null, unidade: 'L/ha', calda: null, areaTratada: 2 })).toBeNull();
  });
});

describe('exportação CSV', () => {
  it('geral: colunas da app anterior, com nomes dos tipos e setores', () => {
    const t = csvRegistos(lista, setores);
    expect(t.startsWith(BOM)).toBe(true);
    const [cab, primeira] = lerCsv(t);
    expect(cab).toEqual([...COLUNAS_CSV]);
    const l = Object.fromEntries(cab.map((c, i) => [c, primeira[i]]));
    expect(l).toMatchObject({ data: '01/06/2026', tipo: 'Rega', setor: 'Setor 4+7', volume: '40,5', horas: '3', h2o2: '1,2' });
  });
  it('tratamentos: por ordem cronológica, com quantidade total e data de colheita', () => {
    const linhas = lerCsv(csvTratamentos(lista, setores));
    expect(linhas[0]).toEqual([...COLUNAS_TRATAMENTOS]);
    expect(linhas).toHaveLength(3); // só os 2 tratamentos
    const l = Object.fromEntries(linhas[0].map((c, i) => [c, linhas[2][i]]));
    expect(l).toMatchObject({
      'Data da aplicação': '10/05/2026',
      'Parcela / setor': 'Setor 4+7',
      Cultura: 'Romãzeira — Wonderful',
      'Área tratada (ha)': '3,2',
      'N.º APV': '1234',
      'Quantidade total de produto': '6,4',
      Unidade: 'kg',
      'Colheita permitida a partir de': '25/05/2026',
      'N.º de aplicador habilitado': 'AP-1',
    });
    expect(linhas[1][1]).toBe('Toda a exploração');
  });
});

describe('intervalo de segurança', () => {
  it('pode colher a partir de data + IS + 1 dia', () => {
    expect(dataPodeColher('2026-05-10', 14)).toBe('2026-05-25');
    expect(dataPodeColher('2026-12-25', 7)).toBe('2027-01-02');
    expect(dataPodeColher('2026-05-10', null)).toBeNull();
    expect(dataPodeColher('2026-05-10', 0)).toBeNull();
  });
});

import { resumoRegisto } from './registos';
describe('resumo na lista', () => {
  it('descreve cada tipo numa linha', () => {
    expect(resumoRegisto(lista[0])).toBe('Cobre X · 2 kg/ha · Antracnose · IS 14 dias');
    expect(resumoRegisto(lista[1])).toBe('40,5 m³ · 3 h · H₂O₂ 1,2 L');
  });
});
