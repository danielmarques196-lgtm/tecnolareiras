import { describe, expect, it } from 'vitest';
import type { Registo } from '../dados/modelo';
import { camposVazios, dadosParaForm, formParaDados, validarCampos } from './camposRegisto';

describe('campos dos registos', () => {
  it('converte texto com vírgula em números e volta', () => {
    const f = { ...camposVazios('rega'), volume: '42,5', duracao: '3', h2o2: '' };
    const d = formParaDados('rega', f);
    expect(d).toEqual({ volume: 42.5, duracao: 3, h2o2: null });
    const r = { tipo: 'rega', dados: d } as Registo;
    expect(dadosParaForm(r)).toEqual({ volume: '42,5', duracao: '3', h2o2: '' });
  });
  it('as opções obrigatórias começam na primeira', () => {
    expect(camposVazios('tratamento').unidade).toBe('L/ha');
    expect(camposVazios('adubacao').modo).toBe('fertirrega');
  });
  it('exige os campos do registo obrigatório de tratamentos', () => {
    const e = validarCampos('tratamento', camposVazios('tratamento'));
    for (const c of ['produto', 'apv', 'substancia', 'alvo', 'dose', 'areaTratada', 'aplicador', 'numAplicador', 'equipamento']) {
      expect(e[c], c).toBe('Campo obrigatório');
    }
    expect(e.is).toBeUndefined(); // IS é opcional (alguns produtos não têm)
  });
  it('rejeita números inválidos e negativos', () => {
    const f = { ...camposVazios('rega'), volume: 'muito', duracao: '-1' };
    expect(validarCampos('rega', f)).toEqual({ volume: 'Número inválido', duracao: 'Não pode ser negativo' });
  });
  it('foto vazia fica null', () => {
    expect(formParaDados('observacao', { ...camposVazios('observacao'), praga: 'Afídeos' })).toMatchObject({ foto: null, praga: 'Afídeos' });
  });
});
