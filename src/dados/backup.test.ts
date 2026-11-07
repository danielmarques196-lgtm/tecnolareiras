import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { bd } from './bd';
import { criarBackup, ErroBackup, importarBackupTexto, validarBackup } from './backup';
import { definicoes, registos, setores } from './repositorio';
import { inicializar, SETOR_INICIAL } from './seed';

beforeEach(async () => {
  await Promise.all(bd.tables.map((t) => t.clear()));
});

describe('dados iniciais', () => {
  it('cria o Setor 4+7 e os dois furos uma única vez', async () => {
    await Promise.all([inicializar(), inicializar()]);
    await inicializar();
    const s = await setores.listar();
    expect(s.map((x) => x.nome)).toEqual([SETOR_INICIAL]);
    expect(s[0].cultura).toBe('Romãzeira');
    expect(await bd.furos.count()).toBe(2);
  });
  it('não recria o setor depois de o utilizador o apagar', async () => {
    await inicializar();
    const [s] = await setores.listar();
    await setores.apagar(s.id);
    await inicializar();
    expect(await setores.listar()).toHaveLength(0);
  });
});

describe('cópia de segurança', () => {
  it('exporta e repõe todos os dados', async () => {
    await inicializar();
    const [s] = await setores.listar();
    await registos.guardar({
      tipo: 'rega',
      data: '2026-07-01',
      setorId: s.id,
      custo: 12.5,
      notas: 'teste',
      dados: { volume: 40, duracao: 3, h2o2: 2 },
    });
    const copia = await criarBackup();
    const texto = JSON.stringify(copia);
    expect(await definicoes.ler('ultimaCopia', null)).toBe(copia.exportadoEm);

    // alterar os dados depois da cópia
    await setores.guardar({ ...s, nome: 'Mudado' });
    await bd.registos.clear();

    await importarBackupTexto(texto);
    expect((await setores.listar())[0].nome).toBe(SETOR_INICIAL);
    const r = await registos.listar();
    expect(r).toHaveLength(1);
    expect(r[0].notas).toBe('teste');
    expect(await definicoes.ler('ultimaCopia', null)).toBe(copia.exportadoEm);
  });
  it('rejeita ficheiros que não são cópias', async () => {
    await expect(importarBackupTexto('não é json')).rejects.toBeInstanceOf(ErroBackup);
    expect(() => validarBackup({ formato: 'outro' })).toThrow(ErroBackup);
    expect(() => validarBackup({ formato: 'herdade-da-coroa-backup', versao: 99, tabelas: {} })).toThrow(/mais recente/);
  });
  it('preserva os dados se a cópia for inválida', async () => {
    await inicializar();
    await expect(importarBackupTexto('{"formato":"x"}')).rejects.toThrow();
    expect(await setores.listar()).toHaveLength(1);
  });
});
