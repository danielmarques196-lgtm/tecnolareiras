import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Campo from '../componentes/Campo';
import { useConfirmar } from '../componentes/Confirmar';
import { NOMES_TIPO, TIPOS_REGISTO, TODA_EXPLORACAO, type Registo, type TipoRegisto } from '../dados/modelo';
import { registos, setores, useConsulta, type Novo } from '../dados/repositorio';
import { CAMPOS, camposVazios, dadosParaForm, formParaDados, validarCampos, type DefCampo, type FormCampos } from '../lib/camposRegisto';
import { formatarData, formatarNumero, hojeISO, lerNumero } from '../lib/formatos';
import { comprimirImagem } from '../lib/imagem';
import { dataPodeColher } from '../lib/intervaloSeguranca';
import { areaDoSetor, ordenarRegistos, quantidadeTotalProduto } from '../lib/registos';

interface Comum {
  data: string;
  setorId: string;
  custo: string;
  notas: string;
}

const numParaTexto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','));

/** Valores a lembrar do último registo do mesmo tipo (ex.: aplicador e equipamento). */
function valoresLembrados(tipo: TipoRegisto, todos: Registo[]): FormCampos {
  const ultimo = ordenarRegistos(todos).find((r) => r.tipo === tipo);
  if (!ultimo) return {};
  const f = dadosParaForm(ultimo);
  return Object.fromEntries(CAMPOS[tipo].filter((c) => c.lembrar).map((c) => [c.chave, f[c.chave]]));
}

export default function EditarRegisto() {
  const { id } = useParams();
  const novo = id === 'novo';
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const listaSetores = useConsulta(() => setores.listar());
  const [original, setOriginal] = useState<Registo | null>(null);
  const [tipo, setTipo] = useState<TipoRegisto | null>(null);
  const [comum, setComum] = useState<Comum>({ data: hojeISO(), setorId: '', custo: '', notas: '' });
  const [campos, setCampos] = useState<FormCampos>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [carregado, setCarregado] = useState(false);
  const todos = useRef<Registo[]>([]);

  useEffect(() => {
    (async () => {
      todos.current = await registos.listar();
      if (!novo && id) {
        const r = await registos.obter(id);
        if (r) {
          setOriginal(r);
          setTipo(r.tipo);
          setComum({ data: r.data, setorId: r.setorId, custo: numParaTexto(r.custo), notas: r.notas });
          setCampos(dadosParaForm(r));
        }
      }
      setCarregado(true);
    })();
  }, [id, novo]);

  // setor por omissão: o do último registo, ou o primeiro setor
  useEffect(() => {
    if (!novo || !listaSetores || comum.setorId) return;
    const ultimo = ordenarRegistos(todos.current)[0]?.setorId;
    const valido = ultimo && (ultimo === TODA_EXPLORACAO || listaSetores.some((s) => s.id === ultimo));
    setComum((c) => ({ ...c, setorId: valido ? ultimo : (listaSetores[0]?.id ?? TODA_EXPLORACAO) }));
  }, [novo, listaSetores, comum.setorId, carregado]);

  if (!carregado || !listaSetores) return null;
  if (!novo && !original) {
    return (
      <section>
        <h1>Registo não encontrado</h1>
        <Link to="/registos">Voltar ao caderno de campo</Link>
      </section>
    );
  }

  const limparErro = (chave: string) => {
    if (erros[chave]) {
      const { [chave]: _, ...resto } = erros;
      setErros(resto);
    }
  };

  function escolherTipo(t: TipoRegisto) {
    setTipo(t);
    const f = { ...camposVazios(t), ...valoresLembrados(t, todos.current) };
    if (t === 'tratamento') f.areaTratada = numParaTexto(areaDoSetor(comum.setorId, listaSetores!));
    setCampos(f);
    setErros({});
  }

  function mudarSetor(setorId: string) {
    // no tratamento, a área tratada acompanha o setor se ainda estava igual à área do setor anterior
    if (tipo === 'tratamento') {
      const anterior = numParaTexto(areaDoSetor(comum.setorId, listaSetores!));
      if (!campos.areaTratada || campos.areaTratada === anterior) {
        setCampos({ ...campos, areaTratada: numParaTexto(areaDoSetor(setorId, listaSetores!)) });
      }
    }
    setComum({ ...comum, setorId });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) return;
    const er = validarCampos(tipo, campos);
    if (!comum.data) er._data = 'Indique a data';
    if (!comum.setorId) er._setor = 'Escolha o setor';
    const custo = lerNumero(comum.custo);
    if (comum.custo.trim() && (custo === null || custo < 0)) er._custo = 'Valor inválido';
    setErros(er);
    if (Object.keys(er).length) {
      document.querySelector('.com-erro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const registo = {
      ...(original ?? {}),
      tipo,
      data: comum.data,
      setorId: comum.setorId,
      custo,
      notas: comum.notas.trim(),
      dados: formParaDados(tipo, campos),
    } as Novo<Registo>;
    await registos.guardar(registo);
    navegar('/registos');
  }

  async function apagar() {
    if (!original) return;
    const ok = await confirmar({
      titulo: 'Apagar registo?',
      mensagem: (
        <p>
          {NOMES_TIPO[original.tipo]} de {formatarData(original.data)}. Esta ação não pode ser desfeita.
        </p>
      ),
      confirmar: 'Apagar',
      perigo: true,
    });
    if (!ok) return;
    await registos.apagar(original.id);
    navegar('/registos');
  }

  return (
    <section>
      <h1>{novo ? 'Novo registo' : `Editar — ${NOMES_TIPO[original!.tipo]}`}</h1>

      {novo && (
        <div className="escolha-tipo" role="radiogroup" aria-label="Tipo de registo">
          {TIPOS_REGISTO.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              className={`tipo-${t} ${tipo === t ? 'ativo' : ''}`}
              onClick={() => escolherTipo(t)}
            >
              {NOMES_TIPO[t]}
            </button>
          ))}
        </div>
      )}

      {tipo && (
        <form className="cartao" onSubmit={guardar} noValidate>
          <div className="linha-campos">
            <Campo rotulo="Data" obrigatorio erro={erros._data}>
              {(i) => (
                <input
                  id={i}
                  type="date"
                  value={comum.data}
                  onChange={(e) => {
                    setComum({ ...comum, data: e.target.value });
                    limparErro('_data');
                  }}
                />
              )}
            </Campo>
            <Campo rotulo="Setor" obrigatorio erro={erros._setor}>
              {(i) => (
                <select id={i} value={comum.setorId} onChange={(e) => mudarSetor(e.target.value)}>
                  {listaSetores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                  <option value={TODA_EXPLORACAO}>Toda a exploração</option>
                  {original && original.setorId !== TODA_EXPLORACAO && !listaSetores.some((s) => s.id === original.setorId) && (
                    <option value={original.setorId}>(setor apagado)</option>
                  )}
                </select>
              )}
            </Campo>
          </div>

          <CamposDoTipo
            tipo={tipo}
            campos={campos}
            erros={erros}
            aoMudar={(chave, valor) => {
              setCampos({ ...campos, [chave]: valor });
              limparErro(chave);
            }}
          />
          {tipo === 'tratamento' && <InfoTratamento campos={campos} data={comum.data} />}

          <div className="linha-campos">
            <Campo rotulo="Custo" unidade="€" erro={erros._custo}>
              {(i) => (
                <input
                  id={i}
                  inputMode="decimal"
                  value={comum.custo}
                  onChange={(e) => {
                    setComum({ ...comum, custo: e.target.value });
                    limparErro('_custo');
                  }}
                />
              )}
            </Campo>
          </div>
          <Campo rotulo="Notas">
            {(i) => <textarea id={i} value={comum.notas} onChange={(e) => setComum({ ...comum, notas: e.target.value })} />}
          </Campo>

          <div className="botoes">
            <button type="submit" className="botao grande">
              Guardar
            </button>
            <Link to="/registos" className="botao grande secundario">
              Cancelar
            </Link>
            {!novo && (
              <button type="button" className="botao grande perigo secundario" onClick={apagar}>
                Apagar
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

function CamposDoTipo({
  tipo,
  campos,
  erros,
  aoMudar,
}: {
  tipo: TipoRegisto;
  campos: FormCampos;
  erros: Record<string, string>;
  aoMudar: (chave: string, valor: string) => void;
}) {
  // agrupa campos consecutivos com o mesmo `grupo` numa linha
  const blocos: DefCampo[][] = [];
  for (const c of CAMPOS[tipo]) {
    const ult = blocos[blocos.length - 1];
    if (c.grupo && ult && ult[0].grupo === c.grupo) ult.push(c);
    else blocos.push([c]);
  }

  return (
    <>
      {blocos.map((b) =>
        b.length > 1 ? (
          <div className="linha-campos" key={b[0].chave}>
            {b.map((c) => (
              <ControloCampo key={c.chave} def={c} valor={campos[c.chave] ?? ''} erro={erros[c.chave]} aoMudar={aoMudar} />
            ))}
          </div>
        ) : (
          <ControloCampo key={b[0].chave} def={b[0]} valor={campos[b[0].chave] ?? ''} erro={erros[b[0].chave]} aoMudar={aoMudar} />
        ),
      )}
    </>
  );
}

function ControloCampo({
  def,
  valor,
  erro,
  aoMudar,
}: {
  def: DefCampo;
  valor: string;
  erro?: string;
  aoMudar: (chave: string, valor: string) => void;
}) {
  if (def.tipo === 'foto') return <CampoFoto valor={valor} aoMudar={(v) => aoMudar(def.chave, v)} />;
  return (
    <Campo rotulo={def.rotulo} obrigatorio={def.obrigatorio} erro={erro} ajuda={def.ajuda} unidade={def.unidade}>
      {(i) => {
        const mudar = (e: { target: { value: string } }) => aoMudar(def.chave, e.target.value);
        switch (def.tipo) {
          case 'opcoes':
            return (
              <select id={i} value={valor} onChange={mudar}>
                {!def.obrigatorio && <option value="">—</option>}
                {def.opcoes!.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            );
          case 'numero':
            return <input id={i} inputMode="decimal" value={valor} onChange={mudar} />;
          case 'textoLongo':
            return <textarea id={i} value={valor} onChange={mudar} />;
          default:
            return <input id={i} value={valor} onChange={mudar} />;
        }
      }}
    </Campo>
  );
}

function CampoFoto({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [aProcessar, setAProcessar] = useState(false);
  const [erro, setErro] = useState('');

  async function escolher(f: File) {
    setAProcessar(true);
    setErro('');
    try {
      aoMudar(await comprimirImagem(f));
    } catch {
      setErro('Não foi possível ler a fotografia.');
    } finally {
      setAProcessar(false);
    }
  }

  return (
    <div className="campo">
      <span className="rotulo">Fotografia</span>
      {valor && <img src={valor} alt="Fotografia da observação" className="foto-previa" />}
      <div className="botoes" style={{ marginTop: 0 }}>
        <button type="button" className="botao secundario" onClick={() => ref.current?.click()} disabled={aProcessar}>
          {aProcessar ? 'A processar…' : valor ? 'Trocar fotografia' : 'Tirar / escolher fotografia'}
        </button>
        {valor && (
          <button type="button" className="botao secundario perigo" onClick={() => aoMudar('')}>
            Remover
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) escolher(f);
        }}
      />
      {erro && <span className="erro">{erro}</span>}
    </div>
  );
}

/** Quantidade total e data a partir da qual se pode colher, calculadas enquanto se escreve. */
function InfoTratamento({ campos, data }: { campos: FormCampos; data: string }) {
  const d = formParaDados('tratamento', campos) as Parameters<typeof quantidadeTotalProduto>[0] & { is: number | null };
  const q = quantidadeTotalProduto(d);
  const colher = data ? dataPodeColher(data, d.is) : null;
  if (!q && !colher) return null;
  return (
    <div className="aviso" style={{ background: 'var(--superficie-2)', borderColor: 'var(--borda)' }}>
      {q && (
        <span>
          Quantidade total: <strong>{formatarNumero(q.valor, 3)} {q.unidade}</strong>
        </span>
      )}
      {colher && (
        <span>
          Colheita permitida a partir de <strong>{formatarData(colher)}</strong>
        </span>
      )}
    </div>
  );
}

