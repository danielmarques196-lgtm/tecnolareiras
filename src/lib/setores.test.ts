import { describe, expect, it } from 'vitest';
import { FORM_SETOR_VAZIO, validarSetor } from './setores';

describe('validação de setores', () => {
  it('exige nome', () => {
    expect(validarSetor(FORM_SETOR_VAZIO)).toEqual({ nome: 'Indique o nome do setor' });
  });
  it('aceita área com vírgula e rejeita valores inválidos', () => {
    expect(validarSetor({ ...FORM_SETOR_VAZIO, nome: 'S', areaHa: '3,2', anoPlantacao: '2019', numArvores: '2133' })).toEqual({});
    expect(validarSetor({ ...FORM_SETOR_VAZIO, nome: 'S', areaHa: 'x', anoPlantacao: '19', numArvores: '2,5' })).toEqual({
      areaHa: 'Área inválida',
      anoPlantacao: 'Ano inválido',
      numArvores: 'Número inválido',
    });
  });
});
