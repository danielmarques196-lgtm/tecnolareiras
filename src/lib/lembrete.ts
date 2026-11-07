export const DIAS_LEMBRETE_COPIA = 30;

/**
 * Dias desde a última cópia de segurança (ou desde a primeira utilização, se nunca houve cópia),
 * e se é altura de lembrar.
 */
export function estadoCopia(
  ultimaCopia: string | null,
  primeiraUtilizacao: string | null,
  agora = new Date(),
): { dias: number; nuncaFeita: boolean; lembrar: boolean } {
  const ref = ultimaCopia ?? primeiraUtilizacao;
  const nuncaFeita = ultimaCopia === null;
  if (!ref) return { dias: 0, nuncaFeita, lembrar: false };
  const dias = Math.floor((agora.getTime() - new Date(ref).getTime()) / 86_400_000);
  return { dias, nuncaFeita, lembrar: dias > DIAS_LEMBRETE_COPIA };
}
