// Escalas e marcas de eixo para os gráficos.

export interface Escala {
  (v: number): number;
  inversa: (p: number) => number;
}

export function escalaLinear([d0, d1]: [number, number], [r0, r1]: [number, number]): Escala {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  const f = ((v: number) => (k === 0 ? (r0 + r1) / 2 : r0 + (v - d0) * k)) as Escala;
  f.inversa = (p: number) => (k === 0 ? d0 : d0 + (p - r0) / k);
  return f;
}

/** Marcas "redondas" (1, 2, 2,5, 5 × 10ⁿ) que cobrem [min, max]. */
export function ticksBonitos(min: number, max: number, alvo = 4): number[] {
  if (max <= min) max = min + 1;
  const passoBruto = (max - min) / alvo;
  const pot = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= passoBruto)!;
  const inicio = Math.floor(min / passo) * passo;
  const fim = Math.ceil(max / passo) * passo;
  const r: number[] = [];
  for (let v = inicio; v <= fim + passo / 2; v += passo) r.push(Number(v.toFixed(10)));
  return r;
}
