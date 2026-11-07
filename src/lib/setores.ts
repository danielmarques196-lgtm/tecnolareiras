// Validação do formulário de setores.
import { lerNumero } from './formatos';

export interface FormSetor {
  nome: string;
  areaHa: string;
  cultura: string;
  variedade: string;
  anoPlantacao: string;
  numArvores: string;
  compasso: string;
  notas: string;
}

export const FORM_SETOR_VAZIO: FormSetor = {
  nome: '',
  areaHa: '',
  cultura: 'Romãzeira',
  variedade: '',
  anoPlantacao: '',
  numArvores: '',
  compasso: '',
  notas: '',
};

export function validarSetor(f: FormSetor): Partial<Record<keyof FormSetor, string>> {
  const e: Partial<Record<keyof FormSetor, string>> = {};
  if (!f.nome.trim()) e.nome = 'Indique o nome do setor';
  if (f.areaHa.trim() && (lerNumero(f.areaHa) === null || lerNumero(f.areaHa)! < 0)) e.areaHa = 'Área inválida';
  const ano = lerNumero(f.anoPlantacao);
  if (f.anoPlantacao.trim() && (ano === null || !Number.isInteger(ano) || ano < 1900 || ano > 2100)) e.anoPlantacao = 'Ano inválido';
  const arv = lerNumero(f.numArvores);
  if (f.numArvores.trim() && (arv === null || !Number.isInteger(arv) || arv < 0)) e.numArvores = 'Número inválido';
  return e;
}
