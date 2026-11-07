// Gráfico de linhas temporal em SVG (sem dependências).
// Marcadores ocos = valor abaixo do limite de quantificação (desenhado no limite).
import { useEffect, useRef, useState } from 'react';
import type { Limiar, Ponto } from '../lib/analises';
import { formatarData, formatarNumero } from '../lib/formatos';
import { escalaLinear, ticksBonitos } from '../lib/escala';

export interface Serie {
  nome: string;
  cor: string; // variável CSS, ex. 'var(--serie-1)'
  pontos: Ponto[];
}

const ALTURA = 240;
const M = { topo: 30, dir: 64, baixo: 28, esq: 44 };
const DIA = 86_400_000;
const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export default function GraficoLinhas({
  series,
  unidade,
  limiares = [],
  titulo,
}: {
  series: Serie[];
  unidade: string;
  limiares?: Limiar[];
  titulo: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(600);
  const [foco, setFoco] = useState<number | null>(null); // instante (ms) em foco

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pontos = series.flatMap((s) => s.pontos);
  if (!pontos.length) {
    return <div className="cartao vazio">Sem valores de {titulo.toLowerCase()} para mostrar.</div>;
  }

  // domínios
  const tempos = pontos.map((p) => ms(p.data));
  let [t0, t1] = [Math.min(...tempos), Math.max(...tempos)];
  if (t1 - t0 < 60 * DIA) {
    const meio = (t0 + t1) / 2;
    [t0, t1] = [meio - 45 * DIA, meio + 45 * DIA];
  }
  const valores = pontos.map((p) => p.valor);
  const vMax = Math.max(...valores);
  // só mostra limiares relevantes para a escala dos dados
  const limVisiveis = limiares.filter((l) => l.valor <= Math.max(vMax * 2.5, limiares[0]?.valor ?? 0));
  const yMin = Math.min(0, ...valores);
  const yMaxBruto = Math.max(vMax, ...limVisiveis.map((l) => l.valor)) || 1;
  const ticks = ticksBonitos(yMin, yMaxBruto * 1.08, 4);
  const [y0, y1] = [ticks[0], ticks[ticks.length - 1]];

  const x = escalaLinear([t0, t1], [M.esq, largura - M.dir]);
  const y = escalaLinear([y0, y1], [ALTURA - M.baixo, M.topo]);
  const casas = y1 < 1 ? 3 : y1 < 20 ? 2 : 0;
  // em ecrãs estreitos só a primeira e a última data (evita sobreposição)
  const ticksX = largura < 480 ? [t0, t1] : [t0, (t0 + t1) / 2, t1];

  // ponto mais próximo do foco (crosshair)
  const datasUnicas = [...new Set(tempos)].sort((a, b) => a - b);
  const instanteFoco =
    foco === null ? null : datasUnicas.reduce((m, t) => (Math.abs(t - foco) < Math.abs(m - foco) ? t : m), datasUnicas[0]);
  const noFoco =
    instanteFoco === null
      ? []
      : series.flatMap((s) => s.pontos.filter((p) => ms(p.data) === instanteFoco).map((p) => ({ s, p })));

  function mover(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setFoco(x.inversa(e.clientX - r.left));
  }

  const caixaX = instanteFoco === null ? 0 : x(instanteFoco);
  const tooltipEsq = caixaX > largura / 2;

  return (
    <figure className="grafico" ref={caixa}>
      {series.length > 1 && (
        <div className="legenda" aria-hidden="true">
          {series.map((s) => (
            <span key={s.nome}>
              <i style={{ background: s.cor }} /> {s.nome}
            </span>
          ))}
        </div>
      )}
      <svg
        width={largura}
        height={ALTURA}
        role="img"
        aria-label={`${titulo}${unidade ? ` (${unidade})` : ''} ao longo do tempo`}
        onPointerMove={mover}
        onPointerDown={mover}
        onPointerLeave={() => setFoco(null)}
        style={{ touchAction: 'pan-y' }}
      >
        {/* grelha e eixo Y */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.esq} x2={largura - M.dir} y1={y(t)} y2={y(t)} className="grelha-linha" />
            <text x={M.esq - 6} y={y(t)} dy="0.32em" textAnchor="end" className="eixo-texto">
              {formatarNumero(t, casas)}
            </text>
          </g>
        ))}
        {unidade && (
          <text x={4} y={12} className="eixo-texto">
            {unidade}
          </text>
        )}
        {/* eixo X */}
        {ticksX.map((t, i) => (
          <text
            key={t}
            x={x(t)}
            y={ALTURA - 8}
            textAnchor={i === 0 ? 'start' : i === ticksX.length - 1 ? 'end' : 'middle'}
            className="eixo-texto"
          >
            {formatarData(new Date(t).toISOString().slice(0, 10))}
          </text>
        ))}
        {/* limiares */}
        {limVisiveis.map((l) => (
          <g key={l.valor}>
            <line x1={M.esq} x2={largura - M.dir} y1={y(l.valor)} y2={y(l.valor)} className="limiar-linha" />
            <text x={M.esq + 4} y={y(l.valor) - 4} className="eixo-texto">
              {l.rotulo}
            </text>
          </g>
        ))}
        {/* séries */}
        {series.map((s) => {
          const caminho = s.pontos.map((p, i) => `${i ? 'L' : 'M'}${x(ms(p.data))},${y(p.valor)}`).join('');
          const ultimo = s.pontos[s.pontos.length - 1];
          return (
            <g key={s.nome}>
              {s.pontos.length > 1 && <path d={caminho} fill="none" stroke={s.cor} strokeWidth={2} strokeLinejoin="round" />}
              {s.pontos.map((p) => (
                <circle
                  key={p.data}
                  cx={x(ms(p.data))}
                  cy={y(p.valor)}
                  r={4}
                  fill={p.menor ? 'var(--superficie)' : s.cor}
                  stroke={p.menor ? s.cor : 'var(--superficie)'}
                  strokeWidth={2}
                />
              ))}
              {ultimo && series.length <= 4 && (
                <text x={x(ms(ultimo.data)) + 8} y={y(ultimo.valor)} dy="0.32em" className="rotulo-serie">
                  {series.length > 1 ? s.nome : formatarNumero(ultimo.valor, casas + 1)}
                </text>
              )}
            </g>
          );
        })}
        {/* crosshair */}
        {instanteFoco !== null && (
          <line x1={caixaX} x2={caixaX} y1={M.topo} y2={ALTURA - M.baixo} className="crosshair" />
        )}
      </svg>
      {instanteFoco !== null && noFoco.length > 0 && (
        <div
          className="tooltip"
          style={tooltipEsq ? { right: largura - caixaX + 10 } : { left: caixaX + 10 }}
          role="status"
        >
          <strong>{formatarData(new Date(instanteFoco).toISOString().slice(0, 10))}</strong>
          {noFoco.map(({ s, p }) => (
            <div key={s.nome}>
              <i style={{ background: s.cor }} /> {series.length > 1 && `${s.nome}: `}
              {p.menor ? '<' : ''}
              {formatarNumero(p.valor, 3)} {unidade}
            </div>
          ))}
        </div>
      )}
    </figure>
  );
}
