import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Campo from '../componentes/Campo';
import CamposFormulario from '../componentes/CamposFormulario';
import { useConfirmar } from '../componentes/Confirmar';
import GraficoLinhas, { type Serie } from '../componentes/GraficoLinhas';
import type { AnaliseAgua, AnaliseSolo, Furo, Setor } from '../dados/modelo';
import { analisesAgua, analisesSolo, furos, nomeSetor, setores, useConsulta, type Novo } from '../dados/repositorio';
import {
  AJUDA_VALOR,
  analiseParaForm,
  classePhSolo,
  classeTextura,
  DEFS_AGUA,
  DEFS_SOLO,
  formatarValorAnalise,
  formParaAnalise,
  limiaresGrafico,
  PARAMETROS_AGUA,
  PARAMETROS_SOLO,
  RISCO_AGUA,
  riscoAgua,
  serieParametro,
  validarAnalise,
  type NivelRisco,
  type Parametro,
} from '../lib/analises';
import { formatarData, hojeISO } from '../lib/formatos';
import { formVazio, type ValoresForm } from '../lib/formulario';

const CORES = ['var(--serie-1)', 'var(--serie-2)'];
const ordenar = <T extends { data: string }>(l: T[]) => [...l].sort((a, b) => b.data.localeCompare(a.data));

export default function SoloAgua() {
  const [params, setParams] = useSearchParams();
  const aba = params.get('aba') === 'agua' ? 'agua' : 'solo';
  return (
    <section>
      <h1>Solo e água</h1>
      <div className="separadores" role="tablist">
        {(['solo', 'agua'] as const).map((a) => (
          <button
            key={a}
            role="tab"
            aria-selected={aba === a}
            className={aba === a ? 'ativo' : ''}
            onClick={() => setParams({ aba: a }, { replace: true })}
          >
            {a === 'solo' ? 'Análises de solo' : 'Análises de água'}
          </button>
        ))}
      </div>
      {aba === 'solo' ? <Solo /> : <Agua />}
    </section>
  );
}

function SeletorParametro({ params, valor, aoMudar }: { params: Parametro[]; valor: string; aoMudar: (v: string) => void }) {
  return (
    <Campo rotulo="Parâmetro">
      {(i) => (
        <select id={i} value={valor} onChange={(e) => aoMudar(e.target.value)}>
          {params.map((p) => (
            <option key={p.chave} value={p.chave}>
              {p.nome}
              {p.unidade && ` (${p.unidade})`}
            </option>
          ))}
        </select>
      )}
    </Campo>
  );
}

function Valores({ a, params, risco }: { a: AnaliseSolo | AnaliseAgua; params: Parametro[]; risco?: boolean }) {
  const obj = a as unknown as Record<string, number | null>;
  const vis = params.filter((p) => obj[p.chave] !== null || a.qualificadores?.[p.chave]);
  return (
    <dl className="valores">
      {vis.map((p) => {
        const nivel = risco ? riscoAgua(p.chave, obj[p.chave], a.qualificadores?.[p.chave]) : null;
        return (
          <div key={p.chave}>
            <dt>{p.nome}</dt>
            <dd>
              {formatarValorAnalise(obj[p.chave], a.qualificadores?.[p.chave])}
              {a.qualificadores?.[p.chave] !== 'nd' && p.unidade && ` ${p.unidade}`}
              {nivel && <EtiquetaRisco nivel={nivel} titulo={RISCO_AGUA[p.chave].descricao} />}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

const CLASSE_RISCO: Record<NivelRisco, string> = { baixo: 'etiqueta-ok', moderado: 'etiqueta-aviso', severo: 'etiqueta-perigo' };
const SIMBOLO_RISCO: Record<NivelRisco, string> = { baixo: '✓', moderado: '!', severo: '!!' };

function EtiquetaRisco({ nivel, titulo }: { nivel: NivelRisco; titulo: string }) {
  return (
    <span className={`etiqueta ${CLASSE_RISCO[nivel]}`} title={titulo} style={{ marginLeft: 6 }}>
      {SIMBOLO_RISCO[nivel]} {nivel}
    </span>
  );
}

// ---------------- Solo ----------------
function Solo() {
  const listaSetores = useConsulta(() => setores.listar());
  const todas = useConsulta(() => analisesSolo.listar());
  const [setorId, setSetorId] = useState('');
  const [param, setParam] = useState('ph');
  if (!listaSetores || !todas) return null;
  const sid = setorId || listaSetores[0]?.id || '';
  const doSetor = ordenar(todas.filter((a) => a.setorId === sid));
  const p = PARAMETROS_SOLO.find((x) => x.chave === param)!;
  const ultima = doSetor[0];

  return (
    <>
      <div className="cartao">
        <div className="filtros">
          <Campo rotulo="Setor">
            {(i) => (
              <select id={i} value={sid} onChange={(e) => setSetorId(e.target.value)}>
                {listaSetores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <SeletorParametro params={PARAMETROS_SOLO} valor={param} aoMudar={setParam} />
        </div>
        <GraficoLinhas
          titulo={p.nome}
          unidade={p.unidade}
          series={[{ nome: nomeSetor(sid, listaSetores), cor: CORES[0], pontos: serieParametro(doSetor, param) }]}
        />
      </div>

      {ultima && <InterpretacaoSolo a={ultima} />}

      <div className="cabecalho">
        <h2 style={{ margin: 0 }}>Análises ({doSetor.length})</h2>
        <Link to={`/solo-agua/solo/novo?setor=${sid}`} className="botao">
          + Nova análise
        </Link>
      </div>
      {doSetor.length === 0 ? (
        <div className="cartao vazio">Sem análises de solo neste setor.</div>
      ) : (
        <ul className="lista">
          {doSetor.map((a) => (
            <li key={a.id}>
              <Link to={`/solo-agua/solo/${a.id}`} className="item">
                <div className="item-topo">
                  <span className="item-titulo">{formatarData(a.data)}</span>
                  <span className="texto-suave">
                    {[a.laboratorio, a.boletim && `n.º ${a.boletim}`].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <Valores a={a} params={PARAMETROS_SOLO} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function InterpretacaoSolo({ a }: { a: AnaliseSolo }) {
  const textura = classeTextura(a.areia, a.limo, a.argila);
  const ph = classePhSolo(a.ph);
  if (!textura && !ph) return null;
  return (
    <div className="cartao">
      <h3>Interpretação da última análise ({formatarData(a.data)})</h3>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {textura && (
          <li>
            Textura: <strong>{textura}</strong> (classificação USDA)
          </li>
        )}
        {ph && (
          <li>
            pH {formatarValorAnalise(a.ph)}: <strong>{ph}</strong>
          </li>
        )}
      </ul>
    </div>
  );
}

// ---------------- Água ----------------
function Agua() {
  const listaFuros = useConsulta(() => furos.listar());
  const todas = useConsulta(() => analisesAgua.listar());
  const [param, setParam] = useState('fe');
  if (!listaFuros || !todas) return null;
  const p = PARAMETROS_AGUA.find((x) => x.chave === param)!;
  const series: Serie[] = listaFuros.map((f, i) => ({
    nome: f.nome,
    cor: CORES[i % CORES.length],
    pontos: serieParametro(
      todas.filter((a) => a.furoId === f.id),
      param,
    ),
  }));

  return (
    <>
      <div className="cartao">
        <div className="filtros">
          <SeletorParametro params={PARAMETROS_AGUA} valor={param} aoMudar={setParam} />
        </div>
        <GraficoLinhas titulo={p.nome} unidade={p.unidade} series={series} limiares={limiaresGrafico(param)} />
        {RISCO_AGUA[param] && (
          <p className="texto-suave" style={{ fontSize: '0.85rem', margin: '8px 0 0' }}>
            Linhas tracejadas: risco de {RISCO_AGUA[param].descricao.toLowerCase()} na rega gota-a-gota
            {param === 'ce' ? ' (Ayers & Westcot, FAO 29)' : ' (Nakayama & Bucks)'}.
          </p>
        )}
      </div>

      {listaFuros.map((f) => {
        const doFuro = ordenar(todas.filter((a) => a.furoId === f.id));
        return (
          <div key={f.id} style={{ marginBottom: 16 }}>
            <div className="cabecalho">
              <h2 style={{ margin: 0 }}>{f.nome}</h2>
              <Link to={`/solo-agua/agua/novo?furo=${f.id}`} className="botao secundario pequeno">
                + Nova análise
              </Link>
            </div>
            {doFuro.length === 0 ? (
              <div className="cartao vazio">Sem análises deste furo.</div>
            ) : (
              <ul className="lista">
                {doFuro.map((a) => (
                  <li key={a.id}>
                    <Link to={`/solo-agua/agua/${a.id}`} className="item">
                      <div className="item-topo">
                        <span className="item-titulo">{formatarData(a.data)}</span>
                        <span className="texto-suave">
                          {[a.laboratorio, a.boletim && `n.º ${a.boletim}`].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <Valores a={a} params={PARAMETROS_AGUA} risco />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}

// ---------------- Formulário ----------------
export function EditarAnalise() {
  const { tipo, id } = useParams();
  const [qs] = useSearchParams();
  const eSolo = tipo === 'solo';
  const novo = id === 'novo';
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const defs = eSolo ? DEFS_SOLO : DEFS_AGUA;
  const params = eSolo ? PARAMETROS_SOLO : PARAMETROS_AGUA;
  const repo = eSolo ? analisesSolo : analisesAgua;
  const listaSetores = useConsulta(() => setores.listar());
  const listaFuros = useConsulta(() => furos.listar());
  const [original, setOriginal] = useState<AnaliseSolo | AnaliseAgua | null>(null);
  const [alvo, setAlvo] = useState(qs.get(eSolo ? 'setor' : 'furo') ?? '');
  const [f, setF] = useState<ValoresForm>({ ...formVazio(defs), data: hojeISO() });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [carregado, setCarregado] = useState(novo);
  const voltar = `/solo-agua?aba=${eSolo ? 'solo' : 'agua'}`;

  useEffect(() => {
    if (novo || !id) return;
    repo.obter(id).then((a) => {
      if (a) {
        setOriginal(a);
        setAlvo('setorId' in a ? a.setorId : a.furoId);
        setF(analiseParaForm(defs, a));
      }
      setCarregado(true);
    });
  }, [id, novo, eSolo]);

  const opcoes: (Setor | Furo)[] = (eSolo ? listaSetores : listaFuros) ?? [];
  useEffect(() => {
    if (!alvo && opcoes.length) setAlvo(opcoes[0].id);
  }, [alvo, opcoes]);

  if (!carregado || !listaSetores || !listaFuros) return null;
  if (!novo && !original) {
    return (
      <section>
        <h1>Análise não encontrada</h1>
        <Link to={voltar}>Voltar</Link>
      </section>
    );
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const er = validarAnalise(defs, params, f);
    if (!alvo) er._alvo = 'Escolha';
    setErros(er);
    if (Object.keys(er).length) {
      document.querySelector('.com-erro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const dados = { ...(original ?? {}), ...formParaAnalise(defs, params, f), [eSolo ? 'setorId' : 'furoId']: alvo };
    await (repo.guardar as (a: Novo<AnaliseSolo | AnaliseAgua>) => Promise<unknown>)(dados as Novo<AnaliseSolo>);
    navegar(voltar);
  }

  async function apagar() {
    if (!original) return;
    const ok = await confirmar({
      titulo: 'Apagar análise?',
      mensagem: <p>Análise de {formatarData(original.data)}. Esta ação não pode ser desfeita.</p>,
      confirmar: 'Apagar',
      perigo: true,
    });
    if (!ok) return;
    await repo.apagar(original.id);
    navegar(voltar);
  }

  return (
    <section>
      <h1>
        {novo ? 'Nova análise' : 'Editar análise'} de {eSolo ? 'solo' : 'água'}
      </h1>
      <form className="cartao" onSubmit={guardar} noValidate>
        <Campo rotulo={eSolo ? 'Setor' : 'Furo'} obrigatorio erro={erros._alvo}>
          {(i) => (
            <select id={i} value={alvo} onChange={(e) => setAlvo(e.target.value)}>
              {opcoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <p className="texto-suave" style={{ fontSize: '0.9rem' }}>
          {AJUDA_VALOR}.
        </p>
        <CamposFormulario
          defs={defs}
          valores={f}
          erros={erros}
          aoMudar={(chave, valor) => {
            setF({ ...f, [chave]: valor });
            if (erros[chave]) {
              const { [chave]: _, ...resto } = erros;
              setErros(resto);
            }
          }}
        />
        <div className="botoes">
          <button type="submit" className="botao grande">
            Guardar
          </button>
          <Link to={voltar} className="botao grande secundario">
            Cancelar
          </Link>
          {!novo && (
            <button type="button" className="botao grande perigo secundario" onClick={apagar}>
              Apagar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
