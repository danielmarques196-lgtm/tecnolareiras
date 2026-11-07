// Cópia de segurança: exportar/importar todos os dados num ficheiro JSON.
import { bd, TABELAS_BACKUP, type TabelaBackup } from './bd';
import { definicoes } from './repositorio';

export const FORMATO_BACKUP = 'herdade-da-coroa-backup';
export const VERSAO_BACKUP = 1;

export interface Backup {
  formato: typeof FORMATO_BACKUP;
  versao: number;
  exportadoEm: string;
  tabelas: Record<TabelaBackup, unknown[]>;
}

/**
 * Junta todos os dados num objeto. A própria cópia já leva `ultimaCopia` = data da cópia;
 * na base de dados só se regista com `marcarCopiaFeita`, depois de o ficheiro ser descarregado.
 */
export async function criarBackup(): Promise<Backup> {
  const exportadoEm = new Date().toISOString();
  const tabelas = {} as Record<TabelaBackup, unknown[]>;
  await bd.transaction('r', TABELAS_BACKUP.map((t) => bd.table(t)), async () => {
    for (const t of TABELAS_BACKUP) tabelas[t] = await bd.table(t).toArray();
  });
  tabelas.definicoes = [
    ...(tabelas.definicoes as { chave: string }[]).filter((d) => d.chave !== 'ultimaCopia'),
    { chave: 'ultimaCopia', valor: exportadoEm },
  ];
  return { formato: FORMATO_BACKUP, versao: VERSAO_BACKUP, exportadoEm, tabelas };
}

export const marcarCopiaFeita = (b: Backup) => definicoes.gravar('ultimaCopia', b.exportadoEm);

export class ErroBackup extends Error {}

/** Verifica se um objeto lido de ficheiro é uma cópia válida. Lança ErroBackup se não for. */
export function validarBackup(obj: unknown): Backup {
  if (!obj || typeof obj !== 'object') throw new ErroBackup('O ficheiro não contém dados válidos.');
  const b = obj as Partial<Backup>;
  if (b.formato !== FORMATO_BACKUP) {
    throw new ErroBackup('Este ficheiro não é uma cópia de segurança da Herdade da Coroa.');
  }
  if (typeof b.versao !== 'number' || b.versao > VERSAO_BACKUP) {
    throw new ErroBackup('Esta cópia foi feita por uma versão mais recente da aplicação. Atualize a app.');
  }
  if (!b.tabelas || typeof b.tabelas !== 'object') throw new ErroBackup('A cópia não tem tabelas de dados.');
  for (const t of TABELAS_BACKUP) {
    const v = (b.tabelas as Record<string, unknown>)[t];
    if (v !== undefined && !Array.isArray(v)) throw new ErroBackup(`A tabela «${t}» da cópia está danificada.`);
  }
  return b as Backup;
}

/** Substitui TODOS os dados atuais pelos da cópia. */
export async function reporBackup(backup: Backup): Promise<void> {
  await bd.transaction('rw', TABELAS_BACKUP.map((t) => bd.table(t)), async () => {
    for (const t of TABELAS_BACKUP) {
      await bd.table(t).clear();
      const linhas = backup.tabelas[t] ?? [];
      if (linhas.length) await bd.table(t).bulkPut(linhas);
    }
    // os dados atuais passam a ser exatamente os da cópia
    await bd.definicoes.put({ chave: 'ultimaCopia', valor: backup.exportadoEm });
  });
}

/** Lê o texto de um ficheiro JSON e repõe os dados. */
export async function importarBackupTexto(texto: string): Promise<Backup> {
  let obj: unknown;
  try {
    obj = JSON.parse(texto);
  } catch {
    throw new ErroBackup('O ficheiro não é JSON válido.');
  }
  const backup = validarBackup(obj);
  await reporBackup(backup);
  return backup;
}

export function nomeFicheiroBackup(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `herdade-da-coroa-copia-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}
