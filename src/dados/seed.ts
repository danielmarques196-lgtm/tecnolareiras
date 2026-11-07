// Dados iniciais. Cada passo corre uma única vez (o último aplicado fica em `seedPasso`).
// Para acrescentar dados iniciais numa etapa futura, juntar um passo no fim da lista.
import { definicoes, furos, setores } from './repositorio';

export const SETOR_INICIAL = 'Setor 4+7';

const PASSOS: Array<() => Promise<void>> = [
  // 1 — setor inicial e furos
  async () => {
    const existentes = await setores.listar();
    if (!existentes.some((s) => s.nome === SETOR_INICIAL)) {
      await setores.guardar({
        nome: SETOR_INICIAL,
        areaHa: null,
        cultura: 'Romãzeira',
        variedade: '',
        anoPlantacao: null,
        numArvores: null,
        compasso: '',
        notas: '',
      });
    }
    const fs = await furos.listar();
    for (const nome of ['Furo 1', 'Furo 2']) {
      if (!fs.some((f) => f.nome === nome)) await furos.guardar({ nome, notas: '' });
    }
  },
];

let emCurso: Promise<void> | null = null;

/** Prepara a base de dados (idempotente; seguro se chamado várias vezes em simultâneo). */
export function inicializar(): Promise<void> {
  emCurso ??= aplicar().finally(() => {
    emCurso = null;
  });
  return emCurso;
}

async function aplicar(): Promise<void> {
  if ((await definicoes.ler<string | null>('primeiraUtilizacao', null)) === null) {
    await definicoes.gravar('primeiraUtilizacao', new Date().toISOString());
  }
  const feito = await definicoes.ler<number>('seedPasso', 0);
  for (let i = feito; i < PASSOS.length; i++) {
    await PASSOS[i]();
    await definicoes.gravar('seedPasso', i + 1);
  }
}

export const TOTAL_PASSOS_SEED = PASSOS.length;
