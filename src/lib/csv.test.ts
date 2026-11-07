import { describe, expect, it } from 'vitest';
import { BOM, escaparCelula, formatarNumeroCsv, gerarCsv, lerCsv } from './csv';

describe('CSV', () => {
  it('começa com BOM, usa ; e CRLF', () => {
    const t = gerarCsv(['a', 'b'], [[1.5, 'x']]);
    expect(t.startsWith(BOM)).toBe(true);
    expect(t).toBe(`${BOM}a;b\r\n1,5;x\r\n`);
  });
  it('põe aspas quando necessário', () => {
    expect(escaparCelula('a;b')).toBe('"a;b"');
    expect(escaparCelula('diz "olá"')).toBe('"diz ""olá"""');
    expect(escaparCelula('linha\nnova')).toBe('"linha\nnova"');
    expect(escaparCelula(null)).toBe('');
  });
  it('números sem separador de milhares e com vírgula', () => {
    expect(formatarNumeroCsv(12345.678)).toBe('12345,678');
    expect(formatarNumeroCsv(0.000001)).toBe('0,000001');
    expect(formatarNumeroCsv(null)).toBe('');
  });
  it('lê de volta o que escreve', () => {
    const t = gerarCsv(['x', 'y'], [['a;b', 'diz "olá"'], ['linha\nnova', 2]]);
    expect(lerCsv(t)).toEqual([
      ['x', 'y'],
      ['a;b', 'diz "olá"'],
      ['linha\nnova', '2'],
    ]);
  });
  it('ignora linhas vazias e aceita LF', () => {
    expect(lerCsv('a;b\n\n1;2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});
