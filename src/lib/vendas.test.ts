import { describe, expect, it } from 'vitest';
import { TODA_EXPLORACAO, type Entrega, type Registo, type Setor } from '../dados/modelo';
import { custosPorSetor, kgLiquidos, receitaEntrega, totaisCampanha } from './vendas';

const base = { criadoEm: '2026-01-01T00:00:00Z', atualizadoEm: '2026-01-01T00:00:00Z', notas: '' };
const setor = (id: string, areaHa: number | null): Setor => ({
  ...base, id, nome: id, areaHa, cultura: 'Romãzeira', variedade: '', anoPlantacao: null, numArvores: null, compasso: '',
});
const entrega = (id: string, data: string, setorId: string, kg: number, quebras: number, precoKg: number | null, receita: number | null = null, calibres: Entrega['calibres'] = []): Entrega => ({
  ...base, id, data, setorId, kg, quebras, precoKg, receita, calibres,
});
const custo = (id: string, data: string, setorId: string, c: number): Registo => ({
  ...base, id, data, setorId, custo: c, tipo: 'operacao', dados: { operacao: 'poda', horasMO: 1, descricao: '' },
});

describe('entregas', () => {
  it('receita = (kg − quebras) × preço, ou o valor escrito', () => {
    expect(kgLiquidos({ kg: 1000, quebras: 50 })).toBe(950);
    expect(receitaEntrega({ kg: 1000, quebras: 50, precoKg: 0.8, receita: null })).toBeCloseTo(760);
    expect(receitaEntrega({ kg: 1000, quebras: 50, precoKg: 0.8, receita: 700 })).toBe(700);
    expect(receitaEntrega({ kg: 1000, quebras: null, precoKg: null, receita: null })).toBe(0);
  });
});

describe('custos e margem', () => {
  const setores = [setor('a', 3), setor('b', 1)];
  const registos = [custo('1', '2026-02-01', 'a', 300), custo('2', '2026-03-01', TODA_EXPLORACAO, 400), custo('3', '2025-03-01', 'a', 999)];
  it('custos de toda a exploração repartem-se pela área', () => {
    const m = custosPorSetor(registos, setores, 2026);
    expect(m.get('a')).toBeCloseTo(600); // 300 + 400 × 3/4
    expect(m.get('b')).toBeCloseTo(100); // 400 × 1/4
  });
  it('sem áreas, reparte em partes iguais', () => {
    const m = custosPorSetor(registos, [setor('a', null), setor('b', null)], 2026);
    expect(m.get('a')).toBeCloseTo(500);
    expect(m.get('b')).toBeCloseTo(200);
  });
  it('totais por setor e da campanha, margem por ha e por kg', () => {
    const entregas = [
      entrega('e1', '2026-09-20', 'a', 10000, 500, 0.9, null, [{ calibre: 'A', kg: 6000 }, { calibre: 'B', kg: 3500 }]),
      entrega('e2', '2026-10-02', 'a', 5000, 0, 1),
      entrega('e3', '2026-10-05', 'b', 2000, 200, null, 1500, [{ calibre: 'A', kg: 1800 }]),
      entrega('e0', '2025-10-05', 'b', 9999, 0, 9),
    ];
    const { porSetor, total, calibres } = totaisCampanha(entregas, registos, setores, 2026);
    const a = porSetor.find((t) => t.setorId === 'a')!;
    expect(a).toMatchObject({ kgEntregues: 15000, quebras: 500, kgLiquidos: 14500, areaHa: 3 });
    expect(a.receita).toBeCloseTo(8550 + 5000); // 9500 × 0,9 + 5000
    expect(a.margem).toBeCloseTo(13550 - 600);
    expect(a.margemHa).toBeCloseTo((13550 - 600) / 3);
    expect(a.margemKg).toBeCloseTo((13550 - 600) / 14500);
    expect(total.receita).toBeCloseTo(13550 + 1500);
    expect(total.custos).toBeCloseTo(700);
    expect(total.margemHa).toBeCloseTo((15050 - 700) / 4);
    expect(calibres).toEqual([{ calibre: 'A', kg: 7800 }, { calibre: 'B', kg: 3500 }]);
  });
});

describe('regressões', () => {
  it('custos de um setor apagado continuam na margem total', () => {
    const setores = [setor('a', 2)];
    const regs = [custo('1', '2026-02-01', 'a', 100), custo('2', '2026-02-02', 'apagado', 500)];
    const { porSetor, total } = totaisCampanha([entrega('e', '2026-09-01', 'a', 1000, 0, 1)], regs, setores, 2026);
    expect(total.custos).toBe(600);
    expect(total.margem).toBe(400);
    expect(porSetor.map((t) => t.setorId).sort()).toEqual(['a', 'apagado']);
  });
  it('custos de toda a exploração contam mesmo sem setores', () => {
    expect(totaisCampanha([], [custo('1', '2026-02-01', TODA_EXPLORACAO, 250)], [], 2026).total.custos).toBe(250);
  });
});
