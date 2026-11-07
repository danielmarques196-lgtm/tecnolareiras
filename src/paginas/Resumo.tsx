import { useState } from 'react';
import { Link } from 'react-router-dom';
import Campo from '../componentes/Campo';
import { NOMES_TIPO, TODA_EXPLORACAO } from '../dados/modelo';
import { nomeSetor, registos, setores, useConsulta } from '../dados/repositorio';
import { anosDisponiveis, indicadoresCampanha } from '../lib/campanha';
import { formatarData, formatarEuros, formatarNumero, hojeISO } from '../lib/formatos';
import { setoresComISaDecorrer } from '../lib/intervaloSeguranca';
import { eTratamento, ordenarRegistos, resumoRegisto } from '../lib/registos';

function Indicador({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="indicador">
      <div className="valor">{valor}</div>
      <div className="rotulo">{rotulo}</div>
    </div>
  );
}

export default function Resumo() {
  const todos = useConsulta(() => registos.listar());
  const listaSetores = useConsulta(() => setores.listar());
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);

  if (!todos || !listaSetores) return null;
  const hoje = hojeISO();
  const ind = indicadoresCampanha(todos, listaSetores, ano);
  const emIS = setoresComISaDecorrer(todos.filter(eTratamento), listaSetores.map((s) => s.id), hoje, TODA_EXPLORACAO);
  const ultimos = ordenarRegistos(todos).slice(0, 5);
  const anos = anosDisponiveis(todos.map((r) => r.data), anoAtual);

  return (
    <section>
      <div className="cabecalho">
        <h1>Resumo</h1>
        <div style={{ minWidth: 130 }}>
          <Campo rotulo="Campanha">
            {(i) => (
              <select id={i} value={ano} onChange={(e) => setAno(Number(e.target.value))}>
                {anos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        </div>
      </div>

      <div className="cartao" style={emIS.length ? { borderColor: 'var(--perigo)', borderWidth: 2 } : undefined}>
        <h2>Intervalos de segurança a decorrer</h2>
        {emIS.length === 0 ? (
          <p className="texto-ok" style={{ marginBottom: 0 }}>
            Nenhum setor com intervalo de segurança a decorrer hoje.
          </p>
        ) : (
          <ul className="lista" style={{ marginBottom: 0 }}>
            {emIS.map((s) => (
              <li key={s.setorId}>
                <Link to={`/registos/${s.registoId}`} className="item tipo-tratamento">
                  <div className="item-topo">
                    <span className="item-titulo">{nomeSetor(s.setorId, listaSetores)}</span>
                    <span className="etiqueta etiqueta-perigo">
                      {s.diasEmFalta === 1 ? 'falta 1 dia' : `faltam ${s.diasEmFalta} dias`}
                    </span>
                  </div>
                  <div className="item-detalhe">
                    Colheita permitida a partir de <strong>{formatarData(s.podeColher)}</strong>
                  </div>
                  <div className="item-detalhe">
                    {s.produto} aplicado em {formatarData(s.dataTratamento)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2>Campanha {ano}</h2>
      <div className="grelha">
        <Indicador valor={formatarNumero(ind.registos, 0)} rotulo="registos" />
        <Indicador valor={formatarNumero(ind.tratamentos, 0)} rotulo="tratamentos" />
        <Indicador valor={`${formatarNumero(ind.kgColhidos, 0)} kg`} rotulo="colhidos" />
        <Indicador valor={`${formatarNumero(ind.m3Regados, 0)} m³`} rotulo="regados" />
        <Indicador valor={formatarEuros(ind.custos)} rotulo="custos lançados" />
        <Indicador
          valor={ind.custoPorHa === null ? '—' : formatarEuros(ind.custoPorHa)}
          rotulo={ind.custoPorHa === null ? 'custo/ha (indique a área dos setores)' : `por hectare (${formatarNumero(ind.areaHa)} ha)`}
        />
      </div>

      <div className="cabecalho">
        <h2 style={{ margin: 0 }}>Últimos registos</h2>
        <Link to="/registos">Ver todos</Link>
      </div>
      {ultimos.length === 0 ? (
        <div className="cartao vazio">
          Ainda não há registos. <Link to="/registos/novo">Criar o primeiro</Link>
        </div>
      ) : (
        <ul className="lista">
          {ultimos.map((r) => (
            <li key={r.id}>
              <Link to={`/registos/${r.id}`} className={`item tipo-${r.tipo}`}>
                <div className="item-topo">
                  <span className="item-titulo">{NOMES_TIPO[r.tipo]}</span>
                  <span className="texto-suave">{formatarData(r.data)}</span>
                </div>
                <div className="item-detalhe">{resumoRegisto(r)}</div>
                <div className="item-detalhe">{nomeSetor(r.setorId, listaSetores)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
