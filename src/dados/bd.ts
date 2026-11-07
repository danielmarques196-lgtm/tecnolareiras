// Esquema IndexedDB (Dexie). Só a camada de dados (repositorio.ts, backup.ts) importa este ficheiro.
import Dexie, { type Table } from 'dexie';
import type {
  AnaliseAgua,
  AnaliseSolo,
  ClimaCache,
  Definicao,
  Entrega,
  Furo,
  Registo,
  Setor,
} from './modelo';

export class BaseDados extends Dexie {
  setores!: Table<Setor, string>;
  registos!: Table<Registo, string>;
  furos!: Table<Furo, string>;
  analisesSolo!: Table<AnaliseSolo, string>;
  analisesAgua!: Table<AnaliseAgua, string>;
  entregas!: Table<Entrega, string>;
  clima!: Table<ClimaCache, string>;
  definicoes!: Table<Definicao, string>;

  constructor(nome = 'herdade-da-coroa') {
    super(nome);
    this.version(1).stores({
      setores: 'id, nome',
      registos: 'id, data, tipo, setorId',
      furos: 'id, nome',
      analisesSolo: 'id, setorId, data',
      analisesAgua: 'id, furoId, data',
      entregas: 'id, data, setorId',
      clima: 'id',
      definicoes: 'chave',
    });
  }
}

/** Tabelas incluídas na cópia de segurança (o cache do clima fica de fora). */
export const TABELAS_BACKUP = [
  'setores',
  'registos',
  'furos',
  'analisesSolo',
  'analisesAgua',
  'entregas',
  'definicoes',
] as const;
export type TabelaBackup = (typeof TABELAS_BACKUP)[number];

export const bd = new BaseDados();
