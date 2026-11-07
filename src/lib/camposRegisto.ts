// Campos específicos de cada tipo de registo: definição, valores por omissão,
// conversão formulário (texto) ↔ dados, validação.
import {
  INTENSIDADES,
  MODOS_ADUBACAO,
  OPERACOES,
  UNIDADES_DOSE,
  type Registo,
  type TipoRegisto,
} from '../dados/modelo';
import { formParaObjeto, formVazio, objetoParaForm, validarForm, type DefCampo, type ValoresForm } from './formulario';

export type { DefCampo };

export const UNIDADES_ADUBACAO = ['kg', 'L', 'kg/ha', 'L/ha', 'g', 't'] as const;

export const CAMPOS: Record<TipoRegisto, DefCampo[]> = {
  tratamento: [
    { chave: 'produto', rotulo: 'Produto comercial', tipo: 'texto', obrigatorio: true },
    { chave: 'apv', rotulo: 'N.º de autorização de venda (APV)', tipo: 'texto', obrigatorio: true },
    { chave: 'substancia', rotulo: 'Substância ativa', tipo: 'texto', obrigatorio: true },
    { chave: 'alvo', rotulo: 'Inimigo / alvo', tipo: 'texto', obrigatorio: true, ajuda: 'Praga, doença ou infestante a combater' },
    { chave: 'dose', rotulo: 'Dose', tipo: 'numero', obrigatorio: true, grupo: 'dose' },
    { chave: 'unidade', rotulo: 'Unidade', tipo: 'opcoes', opcoes: UNIDADES_DOSE, obrigatorio: true, grupo: 'dose' },
    { chave: 'calda', rotulo: 'Volume de calda', tipo: 'numero', unidade: 'L/ha', grupo: 'calda' },
    { chave: 'areaTratada', rotulo: 'Área tratada', tipo: 'numero', unidade: 'ha', obrigatorio: true, grupo: 'calda' },
    { chave: 'is', rotulo: 'Intervalo de segurança', tipo: 'numero', unidade: 'dias', ajuda: 'Consta do rótulo do produto' },
    { chave: 'aplicador', rotulo: 'Aplicador', tipo: 'texto', obrigatorio: true, grupo: 'aplicador', lembrar: true },
    { chave: 'numAplicador', rotulo: 'N.º de aplicador habilitado', tipo: 'texto', obrigatorio: true, grupo: 'aplicador', lembrar: true },
    { chave: 'equipamento', rotulo: 'Equipamento de aplicação', tipo: 'texto', obrigatorio: true, lembrar: true },
  ],
  adubacao: [
    { chave: 'produto', rotulo: 'Produto', tipo: 'texto', obrigatorio: true },
    { chave: 'quantidade', rotulo: 'Quantidade', tipo: 'numero', obrigatorio: true, grupo: 'qtd' },
    { chave: 'unidade', rotulo: 'Unidade', tipo: 'opcoes', opcoes: UNIDADES_ADUBACAO, grupo: 'qtd' },
    { chave: 'modo', rotulo: 'Modo de aplicação', tipo: 'opcoes', opcoes: MODOS_ADUBACAO, obrigatorio: true },
  ],
  rega: [
    { chave: 'volume', rotulo: 'Volume', tipo: 'numero', unidade: 'm³', obrigatorio: true, grupo: 'rega' },
    { chave: 'duracao', rotulo: 'Duração', tipo: 'numero', unidade: 'h', grupo: 'rega' },
    { chave: 'h2o2', rotulo: 'H₂O₂ injetada', tipo: 'numero', unidade: 'L', ajuda: 'Água oxigenada contra entupimentos (Fe/Mn)' },
  ],
  operacao: [
    { chave: 'operacao', rotulo: 'Operação', tipo: 'opcoes', opcoes: OPERACOES, obrigatorio: true },
    { chave: 'horasMO', rotulo: 'Horas de mão de obra', tipo: 'numero', unidade: 'h' },
    { chave: 'descricao', rotulo: 'Descrição', tipo: 'textoLongo' },
  ],
  observacao: [
    { chave: 'praga', rotulo: 'Praga / doença', tipo: 'texto', obrigatorio: true },
    { chave: 'intensidade', rotulo: 'Intensidade', tipo: 'opcoes', opcoes: INTENSIDADES, obrigatorio: true },
    { chave: 'descricao', rotulo: 'Descrição', tipo: 'textoLongo' },
    { chave: 'foto', rotulo: 'Fotografia', tipo: 'foto' },
  ],
  colheita: [
    { chave: 'kg', rotulo: 'Quantidade', tipo: 'numero', unidade: 'kg', obrigatorio: true },
    { chave: 'destino', rotulo: 'Destino', tipo: 'texto', ajuda: 'Ex.: central fruteira, mercado, consumo' },
    { chave: 'calibre', rotulo: 'Calibre / categoria', tipo: 'texto' },
  ],
};

/** Estado do formulário: todos os campos como texto (foto: data URL ou ''). */
export type FormCampos = ValoresForm;

export const camposVazios = (tipo: TipoRegisto): FormCampos => formVazio(CAMPOS[tipo]);

/** Dados guardados → texto do formulário (números com vírgula). */
export const dadosParaForm = (r: Registo): FormCampos =>
  objetoParaForm(CAMPOS[r.tipo], r.dados as unknown as Record<string, unknown>);

/** Texto do formulário → objeto de dados do tipo. */
export const formParaDados = (tipo: TipoRegisto, f: FormCampos): Registo['dados'] =>
  formParaObjeto(CAMPOS[tipo], f) as unknown as Registo['dados'];

/** Erros de validação por campo (chave → mensagem). Vazio = válido. */
export const validarCampos = (tipo: TipoRegisto, f: FormCampos) => validarForm(CAMPOS[tipo], f);
