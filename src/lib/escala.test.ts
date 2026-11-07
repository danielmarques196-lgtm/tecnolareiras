import { describe, expect, it } from 'vitest';
import { escalaLinear, ticksBonitos } from './escala';

describe('escalas', () => {
  it('mapeia e inverte', () => {
    const e = escalaLinear([0, 10], [100, 200]);
    expect(e(5)).toBe(150);
    expect(e.inversa(150)).toBe(5);
  });
  it('marcas redondas que cobrem o intervalo', () => {
    expect(ticksBonitos(0, 1.5)).toEqual([0, 0.5, 1, 1.5]);
    expect(ticksBonitos(0, 520)).toEqual([0, 200, 400, 600]);
    expect(ticksBonitos(0, 6.8)).toEqual([0, 2, 4, 6, 8]);
    expect(ticksBonitos(5, 5)).toEqual([5, 5.25, 5.5, 5.75, 6]);
  });
});
