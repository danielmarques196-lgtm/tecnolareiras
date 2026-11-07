import { describe, expect, it } from 'vitest';
import {
  diasEntre,
  formatarData,
  formatarEuros,
  formatarNumero,
  hojeISO,
  lerData,
  lerNumero,
  somarDias,
} from './formatos';

describe('datas', () => {
  it('formata ISO como dd/mm/aaaa', () => {
    expect(formatarData('2026-07-23')).toBe('23/07/2026');
    expect(formatarData('')).toBe('');
  });
  it('lê dd/mm/aaaa e rejeita datas impossíveis', () => {
    expect(lerData('3/9/2025')).toBe('2025-09-03');
    expect(lerData('23/07/2026')).toBe('2026-07-23');
    expect(lerData('2026-07-23')).toBe('2026-07-23');
    expect(lerData('31/02/2026')).toBeNull();
    expect(lerData('ontem')).toBeNull();
  });
  it('soma dias atravessando meses e anos', () => {
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(somarDias('2024-02-28', 1)).toBe('2024-02-29');
  });
  it('conta dias entre datas', () => {
    expect(diasEntre('2026-03-01', '2026-03-31')).toBe(30);
    expect(diasEntre('2026-03-31', '2026-03-01')).toBe(-30);
    expect(diasEntre('2026-03-28', '2026-03-30')).toBe(2); // mudança de hora não afeta
  });
  it('hojeISO usa a data local', () => {
    expect(hojeISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('números', () => {
  it('formata com vírgula decimal', () => {
    expect(formatarNumero(5.81)).toBe('5,81');
    expect(formatarNumero(0.5, 2, 2)).toBe('0,50');
    expect(formatarNumero(null)).toBe('');
    // pt-PT só agrupa milhares a partir de 5 dígitos
    expect(formatarEuros(1234.5)).toBe('1234,50 €');
    expect(formatarEuros(12345.5).replace(/\s/g, ' ')).toBe('12 345,50 €');
  });
  it('lê vírgula ou ponto decimal', () => {
    expect(lerNumero('5,81')).toBe(5.81);
    expect(lerNumero('5.81')).toBe(5.81);
    expect(lerNumero('1 234,5')).toBe(1234.5);
    expect(lerNumero('1.234,5')).toBe(1234.5);
    expect(lerNumero('1.234')).toBe(1234);
    expect(lerNumero('-2')).toBe(-2);
    expect(lerNumero('')).toBeNull();
    expect(lerNumero('abc')).toBeNull();
    expect(lerNumero(3)).toBe(3);
  });
});
