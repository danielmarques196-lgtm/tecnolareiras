// ÚNICA porta de acesso aos dados. As páginas usam só este módulo.
// Para ligar a sincronização (Supabase), alterar aqui: cada `guardar`/`apagar`
// passa por `colecao()`, que é o ponto natural para enfileirar alterações.
import { useLiveQuery } from 'dexie-react-hooks';
import type { Table } from 'dexie';
import { bd } from './bd';
import type {
  AnaliseAgua,
  AnaliseSolo,
  Base,
  ClimaCache,
  Entrega,
  Furo,
  Registo,
  Setor,
} from './modelo';
import { TODA_EXPLORACAO } from './modelo';

export const novoId = (): string => crypto.randomUUID();
export const agora = (): string => new Date().toISOString();

/** Dados de um novo objeto: sem campos de controlo, ou com eles (edição). */
export type Novo<T extends Base> = Omit<T, keyof Base> & Partial<Base>;

function colecao<T extends Base>(tabela: () => Table<T, string>) {
  return {
    listar: (): Promise<T[]> => tabela().toArray(),
    obter: (id: string): Promise<T | undefined> => tabela().get(id),
    async guardar(obj: Novo<T>): Promise<T> {
      const instante = agora();
      const completo = {
        ...obj,
        id: obj.id ?? novoId(),
        criadoEm: obj.criadoEm ?? instante,
        atualizadoEm: instante,
      } as T;
      await tabela().put(completo);
      return completo;
    },
    apagar: (id: string): Promise<void> => tabela().delete(id),
  };
}

export const setores = {
  ...colecao<Setor>(() => bd.setores),
  listar: () => bd.setores.orderBy('nome').toArray(),
  /** N.º de registos, análises e entregas ligados ao setor (para avisar antes de apagar). */
  async contarAssociados(id: string): Promise<number> {
    const [r, a, e] = await Promise.all([
      bd.registos.where('setorId').equals(id).count(),
      bd.analisesSolo.where('setorId').equals(id).count(),
      bd.entregas.where('setorId').equals(id).count(),
    ]);
    return r + a + e;
  },
};

export const registos = {
  ...colecao<Registo>(() => bd.registos),
  /** Mais recentes primeiro. */
  listar: async () => (await bd.registos.orderBy('data').reverse().toArray()),
};

export const furos = {
  ...colecao<Furo>(() => bd.furos),
  listar: () => bd.furos.orderBy('nome').toArray(),
};

export const analisesSolo = colecao<AnaliseSolo>(() => bd.analisesSolo);
export const analisesAgua = colecao<AnaliseAgua>(() => bd.analisesAgua);
export const entregas = colecao<Entrega>(() => bd.entregas);

export const clima = {
  obter: (): Promise<ClimaCache | undefined> => bd.clima.get('atual'),
  guardar: (c: Omit<ClimaCache, 'id'>) => bd.clima.put({ ...c, id: 'atual' }),
};

// ---------- Definições (chave-valor) ----------
export const definicoes = {
  async ler<T>(chave: string, omissao: T): Promise<T> {
    const d = await bd.definicoes.get(chave);
    return d === undefined ? omissao : (d.valor as T);
  },
  async gravar(chave: string, valor: unknown): Promise<void> {
    await bd.definicoes.put({ chave, valor });
  },
  async todas(): Promise<Record<string, unknown>> {
    const lista = await bd.definicoes.toArray();
    return Object.fromEntries(lista.map((d) => [d.chave, d.valor]));
  },
};

/** Nome do setor para mostrar (inclui "Toda a exploração"). */
export function nomeSetor(id: string, lista: Setor[]): string {
  if (id === TODA_EXPLORACAO) return 'Toda a exploração';
  return lista.find((s) => s.id === id)?.nome ?? '(setor apagado)';
}

/**
 * Consulta reativa: re-executa quando os dados mudam.
 * Devolve `undefined` enquanto carrega.
 */
export function useConsulta<T>(consulta: () => Promise<T>, deps: unknown[] = []): T | undefined {
  return useLiveQuery(consulta, deps);
}
