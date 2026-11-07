// Formulários genéricos: definição de campos e conversão texto ↔ valores.
import { lerNumero } from './formatos';

export interface DefCampo {
  chave: string;
  rotulo: string;
  tipo: 'texto' | 'numero' | 'opcoes' | 'textoLongo' | 'foto' | 'data';
  opcoes?: readonly string[];
  unidade?: string;
  obrigatorio?: boolean;
  ajuda?: string;
  /** Campos com o mesmo `grupo` ficam lado a lado. */
  grupo?: string;
  /** Lembrar o último valor usado (pré-preencher em novos registos). */
  lembrar?: boolean;
  permiteNegativo?: boolean;
}

/** Estado de um formulário: todos os valores como texto. */
export type ValoresForm = Record<string, string>;

/** Valores iniciais (as opções obrigatórias começam na primeira). */
export function formVazio(defs: DefCampo[]): ValoresForm {
  const f: ValoresForm = {};
  for (const c of defs) f[c.chave] = c.tipo === 'opcoes' && c.obrigatorio ? (c.opcoes?.[0] ?? '') : '';
  return f;
}

/** Objeto guardado → texto do formulário (números com vírgula). */
export function objetoParaForm(defs: DefCampo[], obj: Record<string, unknown>): ValoresForm {
  const f = formVazio(defs);
  for (const c of defs) {
    const v = obj[c.chave];
    if (v === null || v === undefined) continue;
    f[c.chave] = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  }
  return f;
}

/** Texto do formulário → objeto (números lidos com vírgula ou ponto; foto vazia = null). */
export function formParaObjeto(defs: DefCampo[], f: ValoresForm): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  for (const c of defs) {
    const v = (f[c.chave] ?? '').trim();
    if (c.tipo === 'numero') d[c.chave] = lerNumero(v);
    else if (c.tipo === 'foto') d[c.chave] = v || null;
    else d[c.chave] = v;
  }
  return d;
}

/** Erros por campo (chave → mensagem). Vazio = válido. */
export function validarForm(defs: DefCampo[], f: ValoresForm): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const c of defs) {
    const v = (f[c.chave] ?? '').trim();
    if (c.obrigatorio && v === '') {
      erros[c.chave] = 'Campo obrigatório';
      continue;
    }
    if (c.tipo === 'numero' && v !== '') {
      const n = lerNumero(v);
      if (n === null) erros[c.chave] = 'Número inválido';
      else if (n < 0 && !c.permiteNegativo) erros[c.chave] = 'Não pode ser negativo';
    }
    if (c.tipo === 'opcoes' && v !== '' && c.opcoes && !c.opcoes.includes(v)) erros[c.chave] = 'Opção inválida';
  }
  return erros;
}
