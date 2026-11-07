// Importação do CSV da app anterior (colunas: data;tipo;setor;produto;...;custo;notas).
import {
  INTENSIDADES,
  MODOS_ADUBACAO,
  NOMES_TIPO,
  OPERACOES,
  TIPOS_REGISTO,
  TODA_EXPLORACAO,
  UNIDADES_DOSE,
  type Registo,
  type Setor,
  type TipoRegisto,
} from '../dados/modelo';
import { UNIDADES_ADUBACAO } from './camposRegisto';
import { lerCsv } from './csv';
import { lerData, lerNumero } from './formatos';

/** Sem acentos, minúsculas, espaços simples — para comparar nomes. */
export function normalizar(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const TIPO_POR_NOME = new Map<string, TipoRegisto>([
  ...TIPOS_REGISTO.map((t) => [normalizar(NOMES_TIPO[t]), t] as [string, TipoRegisto]),
  ...TIPOS_REGISTO.map((t) => [t, t] as [string, TipoRegisto]),
  ['adubacao/fertirrega', 'adubacao'],
  ['adubacao', 'adubacao'],
  ['fertirrega', 'adubacao'],
  ['tratamento', 'tratamento'],
  ['observacao', 'observacao'],
  ['operacao', 'operacao'],
]);

export function tipoPorNome(nome: string): TipoRegisto | null {
  const n = normalizar(nome);
  return TIPO_POR_NOME.get(n) ?? TIPO_POR_NOME.get(n.replace(/\s*\/\s*/g, '/')) ?? null;
}

/** Procura o valor numa lista de opções (ignora acentos e maiúsculas). */
function opcao<T extends string>(valor: string, opcoes: readonly T[]): T | null {
  const n = normalizar(valor);
  return opcoes.find((o) => normalizar(o) === n) ?? null;
}

export type RegistoImportado = Omit<Extract<Registo, object>, 'id' | 'criadoEm' | 'atualizadoEm' | 'setorId'> & {
  /** Nome do setor no CSV ('' = toda a exploração). */
  setorNome: string;
};

export interface PlanoImportacao {
  registos: RegistoImportado[];
  setoresNovos: string[];
  duplicados: number;
  avisos: string[];
  erros: string[];
  porTipo: Partial<Record<TipoRegisto, number>>;
}

/** Assinatura para detetar registos repetidos (reimportar o mesmo ficheiro não duplica). */
export function assinatura(r: { tipo: string; data: string; custo: number | null; notas: string; dados: unknown }, setorNome: string): string {
  return JSON.stringify([r.tipo, r.data, normalizar(setorNome), r.custo, r.notas, r.dados]);
}

export function nomeSetorParaAssinatura(setorId: string, setores: Setor[]): string {
  return setorId === TODA_EXPLORACAO ? '' : (setores.find((s) => s.id === setorId)?.nome ?? '');
}

const eToda = (nome: string) => ['', 'toda a exploracao', 'toda exploracao', 'exploracao', 'todos'].includes(normalizar(nome));

/**
 * Lê o CSV e prepara a importação (não grava nada).
 * `existentes` serve para detetar duplicados; `setores` para saber quais setores são novos.
 */
export function analisarCsv(texto: string, setores: Setor[], existentes: Registo[] = []): PlanoImportacao {
  const plano: PlanoImportacao = { registos: [], setoresNovos: [], duplicados: 0, avisos: [], erros: [], porTipo: {} };
  // aceita também ficheiros com vírgula como separador se não houver ';' no cabeçalho
  const primeira = texto.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  const linhas = lerCsv(texto, primeira.includes(';') ? ';' : ',');
  if (linhas.length === 0) {
    plano.erros.push('O ficheiro está vazio.');
    return plano;
  }
  const cab = linhas[0].map((c) => normalizar(c).replace(/\s/g, ''));
  const col = (nome: string) => cab.indexOf(normalizar(nome));
  if (col('data') < 0 || col('tipo') < 0) {
    plano.erros.push('O ficheiro não tem as colunas «data» e «tipo» no cabeçalho.');
    return plano;
  }

  const vistos = new Set(existentes.map((r) => assinatura(r, nomeSetorParaAssinatura(r.setorId, setores))));
  const conhecidos = new Map(setores.map((s) => [normalizar(s.nome), s.nome]));
  const area = (nome: string): number | null =>
    eToda(nome)
      ? setores.reduce<number | null>((a, s) => (s.areaHa === null ? a : (a ?? 0) + s.areaHa), null)
      : (setores.find((s) => normalizar(s.nome) === normalizar(nome))?.areaHa ?? null);

  for (let i = 1; i < linhas.length; i++) {
    const n = i + 1; // n.º da linha no ficheiro
    const l = linhas[i];
    const v = (nome: string) => {
      const c = col(nome);
      return c < 0 ? '' : (l[c] ?? '').trim();
    };
    const num = (nome: string) => {
      const t = v(nome);
      if (!t) return null;
      const x = lerNumero(t);
      if (x === null) plano.avisos.push(`Linha ${n}: «${nome}» com valor inválido («${t}»), ignorado.`);
      return x;
    };

    const data = lerData(v('data'));
    if (!data) {
      plano.erros.push(`Linha ${n}: data inválida («${v('data')}»). Linha ignorada.`);
      continue;
    }
    const tipo = tipoPorNome(v('tipo'));
    if (!tipo) {
      plano.erros.push(`Linha ${n}: tipo desconhecido («${v('tipo')}»). Linha ignorada.`);
      continue;
    }

    let setorNome = v('setor');
    if (eToda(setorNome)) setorNome = '';
    else {
      const conhecido = conhecidos.get(normalizar(setorNome));
      if (conhecido) setorNome = conhecido;
      else {
        conhecidos.set(normalizar(setorNome), setorNome);
        plano.setoresNovos.push(setorNome);
      }
    }

    let dados: Registo['dados'];
    switch (tipo) {
      case 'tratamento': {
        const u = v('unidade');
        let unidade = opcao(u, UNIDADES_DOSE);
        if (!unidade) {
          if (u) plano.avisos.push(`Linha ${n}: unidade de dose «${u}» desconhecida; usado L/ha.`);
          unidade = 'L/ha';
        }
        dados = {
          produto: v('produto'), substancia: v('substancia'), apv: v('apv'), alvo: v('alvo'), dose: num('dose'), unidade,
          calda: num('calda'), is: num('is'), areaTratada: area(setorNome), aplicador: v('aplicador'), numAplicador: '',
          equipamento: v('equipamento'),
        };
        break;
      }
      case 'adubacao': {
        const m = v('modo');
        const modo = opcao(m, MODOS_ADUBACAO) ?? 'fertirrega';
        if (m && !opcao(m, MODOS_ADUBACAO)) plano.avisos.push(`Linha ${n}: modo «${m}» desconhecido; usado fertirrega.`);
        const ua = v('unidade');
        const unidade = ua ? opcao(ua, UNIDADES_ADUBACAO) : '';
        if (unidade === null) plano.avisos.push(`Linha ${n}: unidade «${ua}» desconhecida na adubação; deixada em branco.`);
        dados = { produto: v('produto'), quantidade: num('dose'), unidade: unidade ?? '', modo };
        break;
      }
      case 'rega':
        dados = { volume: num('volume'), duracao: num('horas'), h2o2: num('h2o2') };
        break;
      case 'operacao': {
        const o = v('operacao');
        const operacao = opcao(o, OPERACOES) ?? 'outra';
        const descricao = v('descricao');
        dados = { operacao, horasMO: num('horasMO'), descricao: operacao === 'outra' && o && normalizar(o) !== 'outra' ? [o, descricao].filter(Boolean).join(' — ') : descricao };
        break;
      }
      case 'observacao': {
        const it = v('intensidade');
        const intensidade = opcao(it, INTENSIDADES) ?? 'baixa';
        if (it && !opcao(it, INTENSIDADES)) plano.avisos.push(`Linha ${n}: intensidade «${it}» desconhecida; usado baixa.`);
        dados = { praga: v('alvo') || v('produto'), intensidade, descricao: v('descricao'), foto: null };
        break;
      }
      case 'colheita':
        dados = { kg: num('kg'), destino: v('destino'), calibre: v('calibre') };
        break;
    }
    const r = { tipo, data, custo: num('custo'), notas: v('notas'), dados, setorNome } as RegistoImportado;
    const a = assinatura(r, setorNome);
    if (vistos.has(a)) {
      plano.duplicados++;
      continue;
    }
    vistos.add(a);
    plano.registos.push(r);
    plano.porTipo[tipo] = (plano.porTipo[tipo] ?? 0) + 1;
  }
  return plano;
}
