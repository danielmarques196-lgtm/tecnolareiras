import { describe, expect, it } from 'vitest';
import { TODA_EXPLORACAO, type Registo, type Setor } from '../dados/modelo';
import { BOM } from './csv';
import { analisarCsv, tipoPorNome } from './importacao';
import { csvRegistos } from './registos';

const base = { criadoEm: '2026-01-01T00:00:00Z', atualizadoEm: '2026-01-01T00:00:00Z' };
const setor47: Setor = { ...base, id: 's47', nome: 'Setor 4+7', areaHa: 3.2, cultura: 'Romãzeira', variedade: '', anoPlantacao: null, numArvores: null, compasso: '', notas: '' };

const CAB = 'data;tipo;setor;produto;substancia;apv;alvo;dose;unidade;calda;is;aplicador;equipamento;modo;volume;horas;h2o2;operacao;horasMO;intensidade;descricao;kg;destino;calibre;custo;notas';
const linha = (o: Record<string, string>) => CAB.split(';').map((c) => o[c] ?? '').join(';');

const CSV = [
  CAB,
  linha({ data: '12/04/2025', tipo: 'Tratamento fitossanitário', setor: 'Setor 4+7', produto: 'Cuprital', substancia: 'oxicloreto de cobre', apv: '0123', alvo: 'Antracnose', dose: '2,5', unidade: 'kg/ha', calda: '800', is: '14', aplicador: 'Daniel', equipamento: 'Atomizador', custo: '45,90' }),
  linha({ data: '01/06/2025', tipo: 'Rega', setor: 'Setor 4+7', volume: '82,5', horas: '4', h2o2: '1,5' }),
  linha({ data: '02/06/2025', tipo: 'Adubação / fertirrega', setor: 'Setor 1', produto: 'Nitrato de cálcio', dose: '25', unidade: 'kg', modo: 'Fertirrega', custo: '18' }),
  linha({ data: '10/01/2025', tipo: 'Operação cultural', setor: 'Toda a exploração', operacao: 'Poda', horasMO: '16', descricao: 'Poda de formação', notas: 'com "aspas"; e ponto e vírgula' }),
  linha({ data: '15/05/2025', tipo: 'Observação de pragas/doenças', setor: 'setor 4+7', alvo: 'Afídeos', intensidade: 'Média', descricao: 'Focos nos rebentos' }),
  linha({ data: '25/09/2025', tipo: 'Colheita', setor: 'Setor 1', kg: '1200', destino: 'Central fruteira', calibre: 'A' }),
  linha({ data: '31/02/2025', tipo: 'Rega', setor: 'Setor 4+7', volume: '10' }),
  linha({ data: '01/03/2025', tipo: 'Desconhecido', setor: 'Setor 4+7' }),
].map((l) => (l.includes('"aspas"') ? l.replace('com "aspas"; e ponto e vírgula', '"com ""aspas""; e ponto e vírgula"') : l)).join('\r\n');

describe('importação do CSV da app anterior', () => {
  it('mapeia os tipos pelo nome', () => {
    expect(tipoPorNome('Tratamento fitossanitário')).toBe('tratamento');
    expect(tipoPorNome('adubação / fertirrega')).toBe('adubacao');
    expect(tipoPorNome('Adubação/fertirrega')).toBe('adubacao');
    expect(tipoPorNome('OBSERVAÇÃO DE PRAGAS/DOENÇAS')).toBe('observacao');
    expect(tipoPorNome('Colheita')).toBe('colheita');
    expect(tipoPorNome('Outro')).toBeNull();
  });

  it('lê todos os tipos, cria setores em falta e ignora linhas inválidas', () => {
    const p = analisarCsv(BOM + CSV, [setor47]);
    expect(p.registos).toHaveLength(6);
    expect(p.porTipo).toEqual({ tratamento: 1, rega: 1, adubacao: 1, operacao: 1, observacao: 1, colheita: 1 });
    expect(p.setoresNovos).toEqual(['Setor 1']);
    expect(p.erros).toEqual([
      expect.stringMatching(/^Linha 8: data inválida/),
      expect.stringMatching(/^Linha 9: tipo desconhecido/),
    ]);
    const [t, r, a, o, ob, c] = p.registos;
    expect(t).toMatchObject({ tipo: 'tratamento', data: '2025-04-12', setorNome: 'Setor 4+7', custo: 45.9 });
    expect(t.dados).toMatchObject({ produto: 'Cuprital', apv: '0123', dose: 2.5, unidade: 'kg/ha', calda: 800, is: 14, areaTratada: 3.2 });
    expect(r.dados).toEqual({ volume: 82.5, duracao: 4, h2o2: 1.5 });
    expect(a.dados).toEqual({ produto: 'Nitrato de cálcio', quantidade: 25, unidade: 'kg', modo: 'fertirrega' });
    expect(o).toMatchObject({ setorNome: '', notas: 'com "aspas"; e ponto e vírgula', dados: { operacao: 'poda', horasMO: 16 } });
    expect(ob).toMatchObject({ setorNome: 'Setor 4+7', dados: { praga: 'Afídeos', intensidade: 'média', foto: null } });
    expect(c.dados).toEqual({ kg: 1200, destino: 'Central fruteira', calibre: 'A' });
  });

  it('não duplica ao importar duas vezes', () => {
    const p1 = analisarCsv(CSV, [setor47]);
    const existentes = p1.registos.map((r, i) => ({ ...r, id: `x${i}`, criadoEm: '', atualizadoEm: '', setorId: r.setorNome === 'Setor 4+7' ? 's47' : r.setorNome ? 's1' : TODA_EXPLORACAO }) as unknown as Registo);
    const s1 = { ...setor47, id: 's1', nome: 'Setor 1', areaHa: null };
    const p2 = analisarCsv(CSV, [setor47, s1], existentes);
    expect(p2.registos).toHaveLength(0);
    expect(p2.duplicados).toBe(6);
    expect(p2.setoresNovos).toEqual([]);
  });

  it('o CSV exportado pela app volta a ser importado igual', () => {
    const p = analisarCsv(CSV, [setor47]);
    const s1 = { ...setor47, id: 's1', nome: 'Setor 1', areaHa: null };
    const registos = p.registos.map((r, i) => ({ ...r, id: `x${i}`, criadoEm: `2026-01-0${i + 1}`, atualizadoEm: '', setorId: r.setorNome === 'Setor 4+7' ? 's47' : r.setorNome ? 's1' : TODA_EXPLORACAO }) as unknown as Registo);
    const exportado = csvRegistos(registos, [setor47, s1]);
    const p2 = analisarCsv(exportado, [setor47, s1]);
    const semSetor = (l: typeof p.registos) => l.map(({ setorNome, ...r }) => ({ ...r, setor: setorNome })).sort((a, b) => a.data.localeCompare(b.data));
    expect(semSetor(p2.registos)).toEqual(semSetor(p.registos));
  });

  it('erros de formato', () => {
    expect(analisarCsv('', []).erros).toEqual(['O ficheiro está vazio.']);
    expect(analisarCsv('a;b\n1;2', []).erros[0]).toMatch(/colunas «data» e «tipo»/);
  });

  it('avisa sobre valores inválidos mas importa a linha', () => {
    const p = analisarCsv([CAB, linha({ data: '01/06/2025', tipo: 'Rega', setor: 'Setor 4+7', volume: 'muito' })].join('\n'), [setor47]);
    expect(p.registos).toHaveLength(1);
    expect(p.avisos[0]).toMatch(/Linha 2: «volume» com valor inválido/);
  });
});

import { readFileSync } from 'node:fs';
describe('ficheiro de exemplo em dados/', () => {
  it('importa sem erros nem avisos', () => {
    const p = analisarCsv(readFileSync('dados/exemplo-importacao.csv', 'utf8'), [setor47]);
    expect(p.erros).toEqual([]);
    expect(p.avisos).toEqual([]);
    expect(p.registos).toHaveLength(6);
    expect(p.setoresNovos).toEqual([]);
  });
});

describe('unidades da adubação', () => {
  it('normaliza a unidade e avisa quando é desconhecida', () => {
    const p = analisarCsv(
      [CAB, linha({ data: '01/03/2025', tipo: 'Adubação / fertirrega', setor: 'Setor 4+7', produto: 'X', dose: '5', unidade: 'KG/HA' }), linha({ data: '02/03/2025', tipo: 'Adubação / fertirrega', setor: 'Setor 4+7', produto: 'Y', dose: '5', unidade: 'sacos' })].join('\n'),
      [setor47],
    );
    expect(p.registos.map((r) => (r.dados as { unidade: string }).unidade)).toEqual(['kg/ha', '']);
    expect(p.avisos[0]).toMatch(/unidade «sacos» desconhecida/);
  });
});
