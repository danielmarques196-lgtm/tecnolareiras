import { describe, expect, it } from 'vitest';
import { estadoCopia } from './lembrete';

const agora = new Date('2026-11-07T12:00:00Z');

describe('lembrete de cópia de segurança', () => {
  it('não lembra com cópia recente', () => {
    expect(estadoCopia('2026-10-20T10:00:00Z', null, agora)).toMatchObject({ lembrar: false, dias: 18 });
  });
  it('lembra com cópia com mais de 30 dias', () => {
    expect(estadoCopia('2026-10-01T10:00:00Z', null, agora).lembrar).toBe(true);
  });
  it('exatamente 30 dias ainda não lembra', () => {
    expect(estadoCopia('2026-10-08T12:00:00Z', null, agora).lembrar).toBe(false);
  });
  it('sem cópia conta desde a primeira utilização', () => {
    expect(estadoCopia(null, '2026-11-01T00:00:00Z', agora)).toMatchObject({ lembrar: false, nuncaFeita: true });
    expect(estadoCopia(null, '2026-09-01T00:00:00Z', agora)).toMatchObject({ lembrar: true, nuncaFeita: true });
  });
});
