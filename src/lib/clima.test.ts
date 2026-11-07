import { describe, expect, it } from 'vitest';
import { emEpocaDeRega, etoDesdeRega, lerDias, mmParaM3Ha, previsao, urlOpenMeteo } from './clima';

// Formato real da resposta da Open-Meteo (/v1/forecast, parâmetro daily)
const resposta = {
  latitude: 39.25,
  longitude: -8.6875,
  timezone: 'Europe/Lisbon',
  daily_units: { time: 'iso8601', temperature_2m_max: '°C', temperature_2m_min: '°C', precipitation_sum: 'mm', et0_fao_evapotranspiration: 'mm' },
  daily: {
    time: ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'],
    temperature_2m_max: [33.1, 35.4, 31.0, 29.8, 30.2],
    temperature_2m_min: [16.2, 18.0, 17.1, 15.4, 14.9],
    precipitation_sum: [0, 0, 2.4, 0, null],
    et0_fao_evapotranspiration: [6.1, 6.8, 5.2, 5.5, 5.9],
  },
};

describe('Open-Meteo', () => {
  it('pede temperatura, chuva e ETo diárias, com dias passados', () => {
    const u = new URL(urlOpenMeteo({ latitude: 39.23621, longitude: -8.68591 }));
    expect(u.host).toBe('api.open-meteo.com');
    expect(u.searchParams.get('daily')).toContain('et0_fao_evapotranspiration');
    expect(u.searchParams.get('latitude')).toBe('39.2362');
    expect(u.searchParams.get('past_days')).toBe('92');
    expect(u.searchParams.get('timezone')).toBe('Europe/Lisbon');
  });
  it('lê a resposta, com valores em falta como null', () => {
    const d = lerDias(resposta);
    expect(d).toHaveLength(5);
    expect(d[0]).toEqual({ data: '2026-07-01', tmax: 33.1, tmin: 16.2, chuva: 0, eto: 6.1 });
    expect(d[4].chuva).toBeNull();
    expect(() => lerDias({ erro: true })).toThrow();
  });
  it('previsão a partir de hoje', () => {
    expect(previsao(lerDias(resposta), '2026-07-03', 7).map((d) => d.data)).toEqual(['2026-07-03', '2026-07-04', '2026-07-05']);
  });
});

describe('apoio à rega', () => {
  const dias = lerDias(resposta);
  it('ETo acumulada desde a última rega (dias depois da rega até hoje)', () => {
    const b = etoDesdeRega(dias, '2026-07-01', '2026-07-04');
    expect(b.dias).toBe(3);
    expect(b.eto).toBeCloseTo(6.8 + 5.2 + 5.5);
    expect(b.chuva).toBeCloseTo(2.4);
    expect(b.incompleto).toBe(false);
    expect(mmParaM3Ha(b.eto)).toBeCloseTo(175);
  });
  it('regado hoje: nada acumulado', () => {
    expect(etoDesdeRega(dias, '2026-07-04', '2026-07-04')).toMatchObject({ dias: 0, eto: 0 });
  });
  it('rega mais antiga do que os dados disponíveis fica marcada como incompleta', () => {
    expect(etoDesdeRega(dias, '2026-05-01', '2026-07-04').incompleto).toBe(true);
  });
  it('época de rega de março a outubro', () => {
    expect(emEpocaDeRega('2026-03-01')).toBe(true);
    expect(emEpocaDeRega('2026-10-31')).toBe(true);
    expect(emEpocaDeRega('2026-11-01')).toBe(false);
    expect(emEpocaDeRega('2026-02-28')).toBe(false);
  });
});
