// Dados iniciais. Cada passo corre uma única vez (o último aplicado fica em `seedPasso`).
// Para acrescentar dados iniciais numa etapa futura, juntar um passo no fim da lista.
import { analisesAgua, analisesSolo, definicoes, furos, setores } from './repositorio';

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
  // 2 — análises iniciais (solo do Setor 4+7, água dos dois furos)
  async () => {
    const setor = (await setores.listar()).find((s) => s.nome === SETOR_INICIAL);
    if (setor) {
      await analisesSolo.guardar({
        setorId: setor.id,
        data: '2026-07-23',
        laboratorio: 'ESA/IP Santarém',
        boletim: '867',
        areia: 81, limo: 5, argila: 14,
        ph: 5.81, mo: 0.52,
        p: null, k: 102.26, mg: 164.6,
        ca_troca: 2.76, mg_troca: 0.34, k_troca: 0.14, na_troca: 0.19,
        ctc: 5.1, acidez: 1.67, ce: 0.08,
        fe: null, mn: null, zn: null, cu: null, b: null,
        qualificadores: { p: 'nd' },
        notas: 'Amostra 867; data de saída do boletim.',
      });
    }
    const fs = await furos.listar();
    const agua = [
      { furo: 'Furo 1', boletim: '11869', ph: 6.2, ce: 470, fe: 1.4, mn: 0.28 },
      { furo: 'Furo 2', boletim: '11870', ph: 6.3, ce: 480, fe: 0.5, mn: 0.43 },
    ];
    for (const a of agua) {
      const f = fs.find((x) => x.nome === a.furo);
      if (!f) continue;
      await analisesAgua.guardar({
        furoId: f.id,
        data: '2025-09-03',
        laboratorio: 'A-Logos',
        boletim: a.boletim,
        ph: a.ph, ce: a.ce, fe: a.fe, mn: a.mn,
        nitratos: 4, ecoli: 0, coliformes: 0,
        qualificadores: { nitratos: '<' },
        notas: 'Data de colheita da amostra.',
      });
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
