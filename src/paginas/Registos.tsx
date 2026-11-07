import { useState } from 'react';
import { Link } from 'react-router-dom';
import Campo from '../componentes/Campo';
import Icone from '../componentes/Icone';
import { NOMES_TIPO, TIPOS_REGISTO, TODA_EXPLORACAO } from '../dados/modelo';
import { nomeSetor, registos, setores, useConsulta } from '../dados/repositorio';
import { descarregarFicheiro } from '../lib/descarregar';
import { formatarData, formatarEuros, hojeISO } from '../lib/formatos';
import { csvRegistos, filtrarRegistos, FILTROS_VAZIOS, resumoRegisto, type Filtros } from '../lib/registos';

export default function ListaRegistos() {
  const todos = useConsulta(() => registos.listar());
  const listaSetores = useConsulta(() => setores.listar());
  const [f, setF] = useState<Filtros>(FILTROS_VAZIOS);

  if (!todos || !listaSetores) return null;
  const lista = filtrarRegistos(todos, f);
  const comFiltros = f.tipo || f.setorId || f.de || f.ate;

  function exportar() {
    descarregarFicheiro(`caderno-de-campo-${hojeISO()}.csv`, csvRegistos(lista, listaSetores!), 'text/csv;charset=utf-8');
  }

  return (
    <section>
      <div className="cabecalho">
        <h1>Caderno de campo</h1>
        <Link to="/registos/tratamentos" className="botao secundario">
          Registo de tratamentos
        </Link>
      </div>

      <details className="cartao" open={!!comFiltros}>
        <summary>
          Filtros {comFiltros ? <span className="etiqueta">{lista.length} de {todos.length}</span> : null}
        </summary>
        <div className="filtros">
          <Campo rotulo="Tipo">
            {(i) => (
              <select id={i} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as Filtros['tipo'] })}>
                <option value="">Todos</option>
                {TIPOS_REGISTO.map((t) => (
                  <option key={t} value={t}>
                    {NOMES_TIPO[t]}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Setor">
            {(i) => (
              <select id={i} value={f.setorId} onChange={(e) => setF({ ...f, setorId: e.target.value })}>
                <option value="">Todos</option>
                <option value={TODA_EXPLORACAO}>Toda a exploração</option>
                {listaSetores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="De">{(i) => <input id={i} type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} />}</Campo>
          <Campo rotulo="Até">{(i) => <input id={i} type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} />}</Campo>
        </div>
        <div className="botoes">
          {comFiltros && (
            <button type="button" className="botao secundario pequeno" onClick={() => setF(FILTROS_VAZIOS)}>
              Limpar filtros
            </button>
          )}
          <button type="button" className="botao secundario pequeno" onClick={exportar} disabled={!lista.length}>
            Exportar CSV ({lista.length})
          </button>
        </div>
      </details>

      {lista.length === 0 ? (
        <div className="cartao vazio">
          {todos.length ? 'Nenhum registo corresponde aos filtros.' : 'Ainda não há registos. Toque em «+» para criar o primeiro.'}
        </div>
      ) : (
        <ul className="lista">
          {lista.map((r) => (
            <li key={r.id}>
              <Link to={`/registos/${r.id}`} className={`item tipo-${r.tipo}`}>
                {r.tipo === 'observacao' && r.dados.foto && <img className="miniatura" src={r.dados.foto} alt="" />}
                <div className="item-topo">
                  <span className="item-titulo">{NOMES_TIPO[r.tipo]}</span>
                  <span className="texto-suave">{formatarData(r.data)}</span>
                </div>
                <div className="item-detalhe">{resumoRegisto(r)}</div>
                <div className="item-detalhe">
                  {nomeSetor(r.setorId, listaSetores)}
                  {r.custo !== null && ` · ${formatarEuros(r.custo)}`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link to="/registos/novo" className="botao botao-flutuante" aria-label="Novo registo" title="Novo registo">
        <Icone nome="mais_reg" tamanho={32} />
      </Link>
    </section>
  );
}
