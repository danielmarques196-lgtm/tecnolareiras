import { describe, expect, it } from 'vitest';
import { TODA_EXPLORACAO, type Registo, type Setor } from '../dados/modelo';
import { anosDisponiveis, indicadoresCampanha } from './campanha';
import { setoresComISaDecorrer } from './intervaloSeguranca';

const base = { criadoEm: '2026-01-01T00:00:00Z', atualizadoEm: '2026-01-01T00:00:00Z', notas: '' };
const setor = (id: string, areaHa: number | null): Setor => ({
  ...base, id, nome: id, areaHa, cultura: 'Romãzeira', variedade: '', anoPlantacao: null, numArvores: null, compasso: '',
});
const setores = [setor('a', 3), setor('b', 1)];
const trat = (id: string, data: string, setorId: string, is: number | null, custo: number | null = null): Registo => ({
  ...base, id, data, setorId, custo, tipo: 'tratamento',
  dados: { produto: `P-${id}`, substancia: '', apv: '', alvo: '', dose: 1, unidade: 'L/ha', calda: null, is, areaTratada: 1, aplicador: '', numAplicador: '', equipamento: '' },
});

describe('indicadores da campanha', () => {
  const lista: Registo[] = [
    trat('t1', '2026-04-01', 'a', 7, 40),
    { ...base, id: 'r1', data: '2026-06-01', setorId: 'a', custo: 10, tipo: 'rega', dados: { volume: 50.5, duracao: 2, h2o2: 1 } },
    { ...base, id: 'r2', data: '2026-06-02', setorId: 'b', custo: null, tipo: 'rega', dados: { volume: null, duracao: 2, h2o2: 1 } },
    { ...base, id: 'c1', data: '2026-09-20', setorId: 'a', custo: 50, tipo: 'colheita', dados: { kg: 12000, destino: '', calibre: '' } },
    { ...base, id: 'c0', data: '2025-09-20', setorId: 'a', custo: 999, tipo: 'colheita', dados: { kg: 5000, destino: '', calibre: '' } },
  ];
  it('soma só o ano escolhido', () => {
    expect(indicadoresCampanha(lista, setores, 2026)).toEqual({
      registos: 4, tratamentos: 1, kgColhidos: 12000, m3Regados: 50.5, custos: 100, areaHa: 4, custoPorHa: 25,
    });
    expect(indicadoresCampanha(lista, setores, 2025)).toMatchObject({ registos: 1, kgColhidos: 5000, custos: 999 });
  });
  it('custo por hectare é null sem áreas', () => {
    expect(indicadoresCampanha(lista, [setor('a', null)], 2026).custoPorHa).toBeNull();
  });
  it('anos disponíveis incluem o atual', () => {
    expect(anosDisponiveis(['2024-01-01', '2026-03-03', '2024-05-05'], 2027)).toEqual([2027, 2026, 2024]);
  });
});

describe('intervalos de segurança a decorrer', () => {
  const ids = setores.map((s) => s.id);
  it('data + IS + 1 e dias em falta', () => {
    const r = setoresComISaDecorrer([trat('t1', '2026-10-01', 'a', 14) as never], ids, '2026-10-10');
    expect(r).toEqual([
      { setorId: 'a', podeColher: '2026-10-16', diasEmFalta: 6, registoId: 't1', produto: 'P-t1', dataTratamento: '2026-10-01' },
    ]);
  });
  it('vários tratamentos no mesmo setor: vale o que termina mais tarde', () => {
    const r = setoresComISaDecorrer(
      [trat('longo', '2026-10-01', 'a', 21), trat('curto', '2026-10-08', 'a', 3), trat('recente', '2026-10-05', 'a', 10)] as never[],
      ids,
      '2026-10-10',
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ registoId: 'longo', podeColher: '2026-10-23', diasEmFalta: 13 });
  });
  it('um tratamento mais recente com IS curto não encurta o intervalo', () => {
    const r = setoresComISaDecorrer([trat('x', '2026-10-01', 'a', 30), trat('y', '2026-10-09', 'a', 1)] as never[], ids, '2026-10-10');
    expect(r[0].registoId).toBe('x');
  });
  it('termina no próprio dia: no dia "pode colher" já não está a decorrer', () => {
    // 01/10 + 7 + 1 = 09/10
    expect(setoresComISaDecorrer([trat('t', '2026-10-01', 'a', 7)] as never[], ids, '2026-10-08')).toHaveLength(1);
    expect(setoresComISaDecorrer([trat('t', '2026-10-01', 'a', 7)] as never[], ids, '2026-10-09')).toHaveLength(0);
  });
  it('tratamentos sem IS são ignorados', () => {
    expect(setoresComISaDecorrer([trat('t', '2026-10-09', 'a', null)] as never[], ids, '2026-10-10')).toEqual([]);
  });
  it('"Toda a exploração" conta para todos os setores', () => {
    const r = setoresComISaDecorrer([trat('g', '2026-10-05', TODA_EXPLORACAO, 10), trat('b', '2026-10-09', 'b', 20)] as never[], ids, '2026-10-10');
    expect(r.map((x) => [x.setorId, x.registoId])).toEqual([
      ['b', 'b'],
      ['a', 'g'],
    ]);
  });
  it('atravessa a mudança de ano', () => {
    const r = setoresComISaDecorrer([trat('t', '2026-12-28', 'a', 7)] as never[], ids, '2026-12-30');
    expect(r[0]).toMatchObject({ podeColher: '2027-01-05', diasEmFalta: 6 });
  });
});
