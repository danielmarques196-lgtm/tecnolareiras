import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { bd } from './bd';
import { TODA_EXPLORACAO } from './modelo';
import { nomeSetor, registos, setores } from './repositorio';

beforeEach(async () => {
  await Promise.all(bd.tables.map((t) => t.clear()));
});

const novoSetor = (nome: string) =>
  setores.guardar({ nome, areaHa: 1, cultura: 'Romãzeira', variedade: '', anoPlantacao: null, numArvores: null, compasso: '', notas: '' });
const rega = (setorId: string, data: string) =>
  registos.guardar({ tipo: 'rega', data, setorId, custo: null, notas: '', dados: { volume: 10, duracao: 1, h2o2: null } });

describe('repositório', () => {
  it('guardar cria id e datas, e editar mantém criadoEm', async () => {
    const s = await novoSetor('A');
    expect(s.id).toMatch(/[0-9a-f-]{36}/);
    const editado = await setores.guardar({ ...s, nome: 'B' });
    expect(editado.id).toBe(s.id);
    expect(editado.criadoEm).toBe(s.criadoEm);
    expect((await setores.listar()).map((x) => x.nome)).toEqual(['B']);
  });
  it('conta os registos associados a um setor (para avisar antes de apagar)', async () => {
    const a = await novoSetor('A');
    const b = await novoSetor('B');
    await rega(a.id, '2026-06-01');
    await rega(a.id, '2026-06-02');
    await rega(TODA_EXPLORACAO, '2026-06-03');
    expect(await setores.contarAssociados(a.id)).toBe(2);
    expect(await setores.contarAssociados(b.id)).toBe(0);
  });
  it('apagar um setor mantém os registos, que passam a «(setor apagado)»', async () => {
    const a = await novoSetor('A');
    await rega(a.id, '2026-06-01');
    await setores.apagar(a.id);
    const [r] = await registos.listar();
    expect(nomeSetor(r.setorId, await setores.listar())).toBe('(setor apagado)');
    expect(nomeSetor(TODA_EXPLORACAO, [])).toBe('Toda a exploração');
  });
  it('lista registos do mais recente para o mais antigo', async () => {
    await rega(TODA_EXPLORACAO, '2026-01-01');
    await rega(TODA_EXPLORACAO, '2026-03-01');
    await rega(TODA_EXPLORACAO, '2026-02-01');
    expect((await registos.listar()).map((r) => r.data)).toEqual(['2026-03-01', '2026-02-01', '2026-01-01']);
  });
});
