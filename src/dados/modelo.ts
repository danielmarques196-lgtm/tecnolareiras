// Tipos de dados da aplicação. Datas: texto ISO 'AAAA-MM-DD'; instantes: ISO datetime.

export interface Base {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
}

// ---------- Módulo 1 — Setores ----------
export interface Setor extends Base {
  nome: string;
  areaHa: number | null;
  cultura: string;
  variedade: string;
  anoPlantacao: number | null;
  numArvores: number | null;
  compasso: string; // ex. "5 × 3 m"
  notas: string;
}

// ---------- Módulo 2 — Caderno de campo ----------
export const TIPOS_REGISTO = [
  'tratamento',
  'adubacao',
  'rega',
  'operacao',
  'observacao',
  'colheita',
] as const;
export type TipoRegisto = (typeof TIPOS_REGISTO)[number];

export const NOMES_TIPO: Record<TipoRegisto, string> = {
  tratamento: 'Tratamento fitossanitário',
  adubacao: 'Adubação / fertirrega',
  rega: 'Rega',
  operacao: 'Operação cultural',
  observacao: 'Observação de pragas/doenças',
  colheita: 'Colheita',
};

export const UNIDADES_DOSE = ['L/ha', 'kg/ha', 'mL/hL', 'g/hL', '%'] as const;
export type UnidadeDose = (typeof UNIDADES_DOSE)[number];

export const MODOS_ADUBACAO = ['fertirrega', 'solo', 'foliar'] as const;
export type ModoAdubacao = (typeof MODOS_ADUBACAO)[number];

export const OPERACOES = ['poda', 'monda', 'mobilização', 'roça', 'instalação', 'outra'] as const;
export type Operacao = (typeof OPERACOES)[number];

export const INTENSIDADES = ['baixa', 'média', 'alta'] as const;
export type Intensidade = (typeof INTENSIDADES)[number];

/** Valor especial de `setorId` para registos de toda a exploração. */
export const TODA_EXPLORACAO = '*';

export interface DadosTratamento {
  produto: string;
  substancia: string;
  apv: string; // n.º de autorização de venda
  alvo: string; // inimigo/alvo
  dose: number | null;
  unidade: UnidadeDose;
  calda: number | null; // volume de calda (L/ha)
  is: number | null; // intervalo de segurança (dias)
  areaTratada: number | null; // ha
  aplicador: string;
  numAplicador: string; // n.º de habilitação / cartão de aplicador
  equipamento: string;
}
export interface DadosAdubacao {
  produto: string;
  quantidade: number | null;
  unidade: string; // kg, L, kg/ha, L/ha…
  modo: ModoAdubacao;
}
export interface DadosRega {
  volume: number | null; // m³
  duracao: number | null; // h
  h2o2: number | null; // L de H₂O₂ injetada
}
export interface DadosOperacao {
  operacao: Operacao;
  horasMO: number | null;
  descricao: string;
}
export interface DadosObservacao {
  praga: string;
  intensidade: Intensidade;
  descricao: string;
  foto: string | null; // data URL JPEG comprimido
}
export interface DadosColheita {
  kg: number | null;
  destino: string;
  calibre: string;
}

interface RegistoBase extends Base {
  data: string;
  setorId: string; // id do setor ou TODA_EXPLORACAO
  custo: number | null; // €
  notas: string;
}
export type Registo =
  | (RegistoBase & { tipo: 'tratamento'; dados: DadosTratamento })
  | (RegistoBase & { tipo: 'adubacao'; dados: DadosAdubacao })
  | (RegistoBase & { tipo: 'rega'; dados: DadosRega })
  | (RegistoBase & { tipo: 'operacao'; dados: DadosOperacao })
  | (RegistoBase & { tipo: 'observacao'; dados: DadosObservacao })
  | (RegistoBase & { tipo: 'colheita'; dados: DadosColheita });

// ---------- Módulo 4 — Solo e água ----------
/**
 * Resultados abaixo do limite: '<' = abaixo do limite de quantificação (o valor guarda o limite, ex. <4),
 * 'nd' = não detetável (valor null). Chave = nome do parâmetro.
 */
export type Qualificadores = Partial<Record<string, '<' | 'nd'>>;

export interface Furo extends Base {
  nome: string;
  notas: string;
}

export interface AnaliseSolo extends Base {
  setorId: string;
  data: string;
  laboratorio: string;
  boletim: string;
  areia: number | null; // %
  limo: number | null; // %
  argila: number | null; // %
  ph: number | null; // pH(H₂O)
  mo: number | null; // matéria orgânica %
  p: number | null; // P assimilável mg/kg (null = não detetável/sem valor)
  k: number | null; // K assimilável mg/kg
  mg: number | null; // Mg assimilável mg/kg
  ca_troca: number | null; // cmolc/kg
  mg_troca: number | null;
  k_troca: number | null;
  na_troca: number | null;
  ctc: number | null; // cmolc/kg
  acidez: number | null; // acidez titulável cmolc/kg
  ce: number | null; // condutividade dS/m
  fe: number | null; // micronutrientes mg/kg
  mn: number | null;
  zn: number | null;
  cu: number | null;
  b: number | null;
  qualificadores: Qualificadores;
  notas: string;
}

export interface AnaliseAgua extends Base {
  furoId: string;
  data: string;
  laboratorio: string;
  boletim: string;
  ph: number | null;
  ce: number | null; // µS/cm
  fe: number | null; // mg/L
  mn: number | null; // mg/L
  nitratos: number | null; // mg/L
  ecoli: number | null; // UFC/100 mL
  coliformes: number | null; // UFC/100 mL
  qualificadores: Qualificadores;
  notas: string;
}

// ---------- Módulo 5 — Colheita e vendas ----------
export interface EntregaCalibre {
  calibre: string;
  kg: number;
}
export interface Entrega extends Base {
  data: string;
  setorId: string;
  kg: number | null; // kg entregues
  calibres: EntregaCalibre[];
  quebras: number | null; // kg
  precoKg: number | null; // €/kg
  receita: number | null; // € (por omissão, calculada)
  notas: string;
}

// ---------- Módulo 6 — Clima ----------
export interface ClimaCache {
  id: string; // 'atual'
  obtidoEm: string;
  latitude: number;
  longitude: number;
  dados: unknown; // resposta da Open-Meteo
}

// ---------- Definições ----------
export interface Definicao {
  chave: string;
  valor: unknown;
}

export type Tema = 'auto' | 'claro' | 'escuro';
