import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TODA_EXPLORACAO } from '../dados/modelo';
import { clima, definicoes, registos, setores, useConsulta } from '../dados/repositorio';
import {
  emEpocaDeRega,
  etoDesdeRega,
  lerDias,
  LOCALIZACAO_PREDEFINIDA,
  mmParaM3Ha,
  previsao,
  urlOpenMeteo,
  VALIDADE_CACHE_MS,
  type Localizacao,
} from '../lib/clima';
import { formatarData, formatarDataHora, formatarNumero, hojeISO } from '../lib/formatos';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const diaSemana = (iso: string) => DIAS_SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()];

type Estado = { tipo: 'parado' } | { tipo: 'a-carregar' } | { tipo: 'erro'; texto: string };

export default function Clima() {
  const loc = useConsulta(() => definicoes.ler<Localizacao | null>('localizacao', null));
  const cache = useConsulta(() => clima.obter().then((c) => c ?? null));
  const regs = useConsulta(() => registos.listar());
  const listaSetores = useConsulta(() => setores.listar());
  const [estado, setEstado] = useState<Estado>({ tipo: 'parado' });
  const local = loc ?? LOCALIZACAO_PREDEFINIDA;

  async function atualizar() {
    setEstado({ tipo: 'a-carregar' });
    try {
      const r = await fetch(urlOpenMeteo(local));
      if (!r.ok) throw new Error(`O serviço respondeu com erro ${r.status}.`);
      const dados = await r.json();
      lerDias(dados); // valida o formato antes de guardar
      await clima.guardar({ obtidoEm: new Date().toISOString(), latitude: local.latitude, longitude: local.longitude, dados });
      setEstado({ tipo: 'parado' });
    } catch (e) {
      setEstado({
        tipo: 'erro',
        texto: navigator.onLine === false ? 'Sem ligação à Internet.' : e instanceof Error ? e.message : 'Não foi possível obter os dados.',
      });
    }
  }

  // atualiza sozinho se não houver cache, se for antiga ou de outra localização
  const cacheValida =
    cache &&
    cache.latitude === local.latitude &&
    cache.longitude === local.longitude &&
    Date.now() - Date.parse(cache.obtidoEm) < VALIDADE_CACHE_MS;
  useEffect(() => {
    if (loc === undefined || cache === undefined) return;
    if (!cacheValida && estado.tipo === 'parado') atualizar();
  }, [loc, cache === undefined, cacheValida]);

  if (loc === undefined || cache === undefined || !regs || !listaSetores) return null;

  const hoje = hojeISO();
  let dias: ReturnType<typeof lerDias> = [];
  try {
    dias = cache ? lerDias(cache.dados) : [];
  } catch {
    dias = [];
  }
  const prox = previsao(dias, hoje);
  const epoca = emEpocaDeRega(hoje);

  return (
    <section>
      <div className="cabecalho">
        <h1>Clima</h1>
        <button type="button" className="botao secundario" onClick={atualizar} disabled={estado.tipo === 'a-carregar'}>
          {estado.tipo === 'a-carregar' ? 'A atualizar…' : 'Atualizar'}
        </button>
      </div>
      <p className="texto-suave">
        {local.nome} ({formatarNumero(local.latitude, 4)}, {formatarNumero(local.longitude, 4)}) ·{' '}
        <Link to="/definicoes">mudar localização</Link>
        {cache && (
          <>
            <br />
            Dados de {formatarDataHora(cache.obtidoEm)} (Open-Meteo)
          </>
        )}
      </p>
      {!loc && (
        <div className="aviso">
          <span>A usar a localização predefinida. Indique a localização da herdade nas Definições.</span>
          <Link to="/definicoes" className="botao pequeno">Definir</Link>
        </div>
      )}
      {estado.tipo === 'erro' && (
        <div className="aviso" role="status">
          <span>
            {estado.texto} {cache ? 'A mostrar os últimos dados guardados.' : ''}
          </span>
        </div>
      )}

      <div className="cartao">
        <h2>Apoio à rega</h2>
        {!epoca ? (
          <p className="texto-suave" style={{ marginBottom: 0 }}>
            Fora da época de rega (a rega decorre de março a outubro).
          </p>
        ) : !dias.length ? (
          <p className="texto-suave" style={{ marginBottom: 0 }}>Sem dados meteorológicos.</p>
        ) : (
          <ApoioRega dias={dias} hoje={hoje} regs={regs} listaSetores={listaSetores} />
        )}
      </div>

      <div className="cartao">
        <h2>Previsão a 7 dias</h2>
        {prox.length === 0 ? (
          <p className="texto-suave" style={{ marginBottom: 0 }}>
            {estado.tipo === 'a-carregar' ? 'A obter a previsão…' : 'Sem previsão disponível.'}
          </p>
        ) : (
          <div className="tabela-envolvente">
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th className="num">Máx. °C</th>
                  <th className="num">Mín. °C</th>
                  <th className="num">Chuva</th>
                  <th className="num">ETo</th>
                </tr>
              </thead>
              <tbody>
                {prox.map((d) => (
                  <tr key={d.data}>
                    <td>
                      <strong>{d.data === hoje ? 'Hoje' : diaSemana(d.data)}</strong>{' '}
                      <span className="texto-suave">{formatarData(d.data).slice(0, 5)}</span>
                    </td>
                    <td className="num">{d.tmax === null ? '—' : `${formatarNumero(d.tmax, 0)}°`}</td>
                    <td className="num">{d.tmin === null ? '—' : `${formatarNumero(d.tmin, 0)}°`}</td>
                    <td className="num">{d.chuva === null ? '—' : `${formatarNumero(d.chuva, 1)} mm`}</td>
                    <td className="num">{d.eto === null ? '—' : `${formatarNumero(d.eto, 1)} mm`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="texto-suave" style={{ fontSize: '0.85rem', margin: '8px 0 0' }}>
          ETo = evapotranspiração de referência (FAO-56). 1 mm = 10 m³/ha.
        </p>
      </div>
    </section>
  );
}

function ApoioRega({
  dias,
  hoje,
  regs,
  listaSetores,
}: {
  dias: ReturnType<typeof lerDias>;
  hoje: string;
  regs: Awaited<ReturnType<typeof registos.listar>>;
  listaSetores: Awaited<ReturnType<typeof setores.listar>>;
}) {
  if (!listaSetores.length) return <p className="texto-suave">Crie primeiro um setor.</p>;
  const regas = regs.filter((r) => r.tipo === 'rega' && r.data <= hoje);
  return (
    <ul className="lista" style={{ marginBottom: 0 }}>
      {listaSetores.map((s) => {
        const ultima = regas
          .filter((r) => r.setorId === s.id || r.setorId === TODA_EXPLORACAO)
          .reduce<string | null>((m, r) => (m === null || r.data > m ? r.data : m), null);
        if (!ultima) {
          return (
            <li key={s.id} className="item">
              <div className="item-titulo">{s.nome}</div>
              <div className="item-detalhe">Sem regas registadas.</div>
            </li>
          );
        }
        const b = etoDesdeRega(dias, ultima, hoje);
        const m3ha = mmParaM3Ha(b.eto);
        return (
          <li key={s.id} className="item tipo-rega">
            <div className="item-topo">
              <span className="item-titulo">{s.nome}</span>
              <span className="texto-suave">última rega {formatarData(ultima)}</span>
            </div>
            <div className="valor-destaque">
              {formatarNumero(b.eto, 1)} mm <span className="texto-suave">ETo acumulada</span>
            </div>
            <div className="item-detalhe">
              ≈ {formatarNumero(m3ha, 0)} m³/ha
              {s.areaHa ? ` · ${formatarNumero(m3ha * s.areaHa, 0)} m³ em ${formatarNumero(s.areaHa)} ha` : ''}
              {' · '}chuva {formatarNumero(b.chuva, 1)} mm em {b.dias} dia(s)
            </div>
            {b.incompleto && <div className="item-detalhe texto-aviso">Rega há mais de 92 dias: soma incompleta.</div>}
          </li>
        );
      })}
      <li className="texto-suave" style={{ fontSize: '0.85rem' }}>
        Valor de referência: a necessidade da cultura = ETo × Kc da romãzeira (e menos a chuva útil).
      </li>
    </ul>
  );
}
