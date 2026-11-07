import { useState } from 'react';
import { Link } from 'react-router-dom';
import Campo from '../componentes/Campo';
import { definicoes, registos, setores, useConsulta } from '../dados/repositorio';
import { formatarNumeroCsv } from '../lib/csv';
import { descarregarFicheiro } from '../lib/descarregar';
import { formatarData, hojeISO } from '../lib/formatos';
import { COLUNAS_TRATAMENTOS, csvTratamentos, eTratamento, linhasTratamentos } from '../lib/registos';

export default function RegistoTratamentos() {
  const todos = useConsulta(() => registos.listar());
  const listaSetores = useConsulta(() => setores.listar());
  const defs = useConsulta(() => definicoes.todas());
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(String(anoAtual));

  if (!todos || !listaSetores || !defs) return null;
  const tratamentos = todos.filter(eTratamento);
  const anos = [...new Set([anoAtual, ...tratamentos.map((r) => Number(r.data.slice(0, 4)))])].sort((a, b) => b - a);
  const doAno = tratamentos.filter((r) => !ano || r.data.startsWith(ano));
  const linhas = linhasTratamentos(doAno, listaSetores);
  const exploracao = (defs.nomeExploracao as string) || 'Herdade da Coroa';
  const titular = (defs.titular as string) || '';

  return (
    <section className="registo-tratamentos">
      <div className="cabecalho nao-imprimir">
        <h1>Registo de tratamentos</h1>
        <Link to="/registos" className="botao secundario">
          Voltar
        </Link>
      </div>

      <div className="cartao nao-imprimir">
        <div className="filtros">
          <Campo rotulo="Campanha">
            {(i) => (
              <select id={i} value={ano} onChange={(e) => setAno(e.target.value)}>
                {anos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
                <option value="">Todas</option>
              </select>
            )}
          </Campo>
        </div>
        <div className="botoes">
          <button type="button" className="botao" onClick={() => window.print()} disabled={!linhas.length}>
            Imprimir / guardar PDF
          </button>
          <button
            type="button"
            className="botao secundario"
            disabled={!linhas.length}
            onClick={() =>
              descarregarFicheiro(`registo-tratamentos-${ano || 'todos'}.csv`, csvTratamentos(doAno, listaSetores), 'text/csv;charset=utf-8')
            }
          >
            Exportar CSV
          </button>
        </div>
        <p className="texto-suave" style={{ marginTop: 12, marginBottom: 0 }}>
          Registo das aplicações de produtos fitofarmacêuticos. Para um controlo, imprima ou envie o PDF/CSV.
          {!titular && ' Pode indicar o titular da exploração nas Definições.'}
        </p>
      </div>

      <div className="cartao">
        <h2>Registo de aplicação de produtos fitofarmacêuticos</h2>
        <p>
          <strong>Exploração:</strong> {exploracao}
          {titular && (
            <>
              {' '}
              · <strong>Titular:</strong> {titular}
            </>
          )}
          {' '}· <strong>Campanha:</strong> {ano || 'todas'} · <strong>Emitido em:</strong> {formatarData(hojeISO())}
        </p>
        {linhas.length === 0 ? (
          <p className="texto-suave">Sem tratamentos registados {ano ? `em ${ano}` : ''}.</p>
        ) : (
          <div className="tabela-envolvente">
            <table>
              <thead>
                <tr>
                  {COLUNAS_TRATAMENTOS.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i}>
                    {l.map((v, j) => (
                      <td key={j} className={typeof v === 'number' ? 'num' : /^\d\d\/\d\d\/\d{4}$/.test(String(v)) ? 'data' : ''}>
                        {typeof v === 'number' ? formatarNumeroCsv(v) : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="so-imprimir" style={{ marginTop: 24 }}>
          Assinatura do responsável: ______________________________________
        </p>
      </div>
    </section>
  );
}
