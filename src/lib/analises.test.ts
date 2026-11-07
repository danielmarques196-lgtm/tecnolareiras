import { describe, expect, it } from 'vitest';
import {
  analiseParaForm,
  classePhSolo,
  classeTextura,
  DEFS_AGUA,
  formParaAnalise,
  formatarValorAnalise,
  lerValorAnalise,
  PARAMETROS_AGUA,
  riscoAgua,
  serieParametro,
  validarAnalise,
} from './analises';
import type { AnaliseAgua } from '../dados/modelo';

describe('valores de análises', () => {
  it('lê números, "<limite" e "n.d."', () => {
    expect(lerValorAnalise('5,81')).toEqual({ valor: 5.81 });
    expect(lerValorAnalise('<4')).toEqual({ valor: 4, qual: '<' });
    expect(lerValorAnalise('< 0,05')).toEqual({ valor: 0.05, qual: '<' });
    expect(lerValorAnalise('n.d.')).toEqual({ valor: null, qual: 'nd' });
    expect(lerValorAnalise('ND')).toEqual({ valor: null, qual: 'nd' });
    expect(lerValorAnalise('')).toEqual({ valor: null });
    expect(lerValorAnalise('alto')).toBeUndefined();
  });
  it('formata com o qualificador', () => {
    expect(formatarValorAnalise(4, '<')).toBe('<4');
    expect(formatarValorAnalise(null, 'nd')).toBe('n.d.');
    expect(formatarValorAnalise(102.26)).toBe('102,26');
  });
  it('formulário ↔ análise preserva qualificadores', () => {
    const f = analiseParaForm(DEFS_AGUA, {
      data: '2025-09-03', laboratorio: 'A-Logos', boletim: '11869', ph: 6.2, ce: 470, fe: 1.4, mn: 0.28,
      nitratos: 4, ecoli: 0, coliformes: 0, qualificadores: { nitratos: '<' }, notas: '',
    } as Partial<AnaliseAgua>);
    expect(f).toMatchObject({ ph: '6,2', nitratos: '<4', ecoli: '0', data: '2025-09-03' });
    expect(validarAnalise(DEFS_AGUA, PARAMETROS_AGUA, f)).toEqual({});
    expect(formParaAnalise(DEFS_AGUA, PARAMETROS_AGUA, f)).toMatchObject({ nitratos: 4, fe: 1.4, qualificadores: { nitratos: '<' } });
  });
  it('valida', () => {
    const e = validarAnalise(DEFS_AGUA, PARAMETROS_AGUA, { data: '', fe: 'muito', mn: '-1' });
    expect(e).toMatchObject({ data: 'Campo obrigatório', fe: expect.stringContaining('inválido'), mn: 'Não pode ser negativo' });
  });
  it('série para o gráfico: ordenada, sem n.d., marca valores abaixo do limite', () => {
    const a = (data: string, nitratos: number | null, q?: '<' | 'nd') => ({ data, nitratos, qualificadores: q ? { nitratos: q } : {} }) as unknown as AnaliseAgua;
    expect(serieParametro([a('2026-01-01', 10), a('2025-01-01', 4, '<'), a('2025-06-01', null, 'nd')], 'nitratos')).toEqual([
      { data: '2025-01-01', valor: 4, menor: true },
      { data: '2026-01-01', valor: 10 },
    ]);
  });
});

describe('interpretação', () => {
  it('classe de textura USDA', () => {
    expect(classeTextura(81, 5, 14)).toBe('Franco-arenoso'); // Setor 4+7
    expect(classeTextura(92, 4, 4)).toBe('Arenoso');
    expect(classeTextura(84, 10, 6)).toBe('Areno-franco');
    expect(classeTextura(40, 40, 20)).toBe('Franco');
    expect(classeTextura(20, 70, 10)).toBe('Franco-limoso');
    expect(classeTextura(20, 20, 60)).toBe('Argiloso');
    expect(classeTextura(30, 35, 35)).toBe('Franco-argiloso');
    expect(classeTextura(60, 10, 30)).toBe('Franco-argilo-arenoso');
    expect(classeTextura(null, 5, 14)).toBeNull();
    expect(classeTextura(50, 5, 14)).toBeNull(); // soma ≠ 100
  });
  it('classe do pH', () => {
    expect(classePhSolo(5.81)).toBe('pouco ácido');
    expect(classePhSolo(7.0)).toBe('neutro');
    expect(classePhSolo(4.2)).toBe('hiperácido');
  });
  it('risco de entupimento da água de rega', () => {
    expect(riscoAgua('fe', 1.4)).toBe('moderado'); // Furo 1
    expect(riscoAgua('fe', 0.5)).toBe('moderado'); // Furo 2
    expect(riscoAgua('mn', 0.43)).toBe('moderado');
    expect(riscoAgua('fe', 1.6)).toBe('severo');
    expect(riscoAgua('fe', 0.05)).toBe('baixo');
    expect(riscoAgua('ph', 6.2)).toBe('baixo');
    expect(riscoAgua('ce', 470)).toBe('baixo');
    expect(riscoAgua('nitratos', 4)).toBeNull();
    expect(riscoAgua('fe', 0.1, '<')).toBe('baixo');
  });
});
