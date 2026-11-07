import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Campo from '../componentes/Campo';
import { useConfirmar } from '../componentes/Confirmar';
import type { Entrega } from '../dados/modelo';
import { entregas, nomeSetor, registos, setores, useConsulta, type Novo } from '../dados/repositorio';
import { anosDisponiveis } from '../lib/campanha';
import { formatarData, formatarEuros, formatarNumero, hojeISO, lerNumero } from '../lib/formatos';
import { kgLiquidos, receitaEntrega, totaisCampanha } from '../lib/vendas';

export default function Vendas() {
  const lista = useConsulta(() => entregas.listar());
  const regs = useConsulta(() => registos.listar());
  const listaSetores = useConsulta(() => setores.listar());
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  if (!lista || !regs || !listaSetores) return null;

  const { porSetor, total, calibres } = totaisCampanha(lista, regs, listaSetores, ano);
  const doAno = lista.filter((e) => e.data.startsWith(`${ano}-`)).sort((a, b) => b.data.localeCompare(a.data));
  const anos = anosDisponiveis([...lista.map((e) => e.data), ...regs.map((r) => r.data)], anoAtual);
  const euros = (n: number | null) => (n === null ? '—' : formatarEuros(n));

  return (
    <section>
      <div className="cabecalho">
        <h1>Colheita e vendas</h1>
        <div style={{ minWidth: 130 }}>
          <Campo rotulo="Campanha">
            {(i) => (
              <select id={i} value={ano} onChange={(e) => setAno(Number(e.target.value))}>
                {anos.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            )}
          </Campo>
        </div>
      </div>

      <div className="grelha">
        <div className="indicador">
          <div className="valor">{formatarNumero(total.kgLiquidos, 0)} kg</div>
          <div className="rotulo">vendidos ({formatarNumero(total.quebras, 0)} kg de quebras)</div>
        </div>
        <div className="indicador">
          <div className="valor">{formatarEuros(total.receita)}</div>
          <div className="rotulo">receita{total.precoMedio !== null && ` · ${formatarNumero(total.precoMedio, 3)} €/kg`}</div>
        </div>
        <div className="indicador">
          <div className="valor">{formatarEuros(total.custos)}</div>
          <div className="rotulo">custos lançados</div>
        </div>
        <div className="indicador">
          <div className={`valor ${total.margem < 0 ? 'texto-erro' : ''}`}>{formatarEuros(total.margem)}</div>
          <div className="rotulo">margem (receita − custos)</div>
        </div>
        <div className="indicador">
          <div className="valor">{euros(total.margemHa)}</div>
          <div className="rotulo">margem por hectare</div>
        </div>
        <div className="indicador">
          <div className="valor">{total.margemKg === null ? '—' : `${formatarNumero(total.margemKg, 3)} €`}</div>
          <div className="rotulo">margem por kg</div>
        </div>
      </div>

      {porSetor.length > 0 && (
        <div className="cartao">
          <h2>Por setor</h2>
          <div className="tabela-envolvente">
            <table>
              <thead>
                <tr>
                  <th>Setor</th>
                  <th className="num">kg vendidos</th>
                  <th className="num">Receita</th>
                  <th className="num">Custos</th>
                  <th className="num">Margem</th>
                  <th className="num">€/ha</th>
                  <th className="num">€/kg</th>
                </tr>
              </thead>
              <tbody>
                {porSetor.map((t) => (
                  <tr key={t.setorId}>
                    <td>{nomeSetor(t.setorId, listaSetores)}</td>
                    <td className="num">{formatarNumero(t.kgLiquidos, 0)}</td>
                    <td className="num">{formatarEuros(t.receita)}</td>
                    <td className="num">{formatarEuros(t.custos)}</td>
                    <td className="num">{formatarEuros(t.margem)}</td>
                    <td className="num">{euros(t.margemHa)}</td>
                    <td className="num">{t.margemKg === null ? '—' : formatarNumero(t.margemKg, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="texto-suave" style={{ fontSize: '0.85rem', margin: '8px 0 0' }}>
            Custos = custos lançados no caderno de campo; os de «Toda a exploração» são repartidos pela área dos setores.
          </p>
        </div>
      )}

      {calibres.length > 0 && (
        <div className="cartao">
          <h2>Calibres</h2>
          <dl className="valores">
            {calibres.map((c) => (
              <div key={c.calibre}>
                <dt>{c.calibre}</dt>
                <dd>{formatarNumero(c.kg, 0)} kg</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="cabecalho">
        <h2 style={{ margin: 0 }}>Entregas ({doAno.length})</h2>
        <Link to="/vendas/novo" className="botao">
          + Nova entrega
        </Link>
      </div>
      {doAno.length === 0 ? (
        <div className="cartao vazio">Sem entregas em {ano}.</div>
      ) : (
        <ul className="lista">
          {doAno.map((e) => (
            <li key={e.id}>
              <Link to={`/vendas/${e.id}`} className="item tipo-colheita">
                <div className="item-topo">
                  <span className="item-titulo">{formatarNumero(e.kg, 0)} kg</span>
                  <span className="texto-suave">{formatarData(e.data)}</span>
                </div>
                <div className="item-detalhe">
                  {nomeSetor(e.setorId, listaSetores)} · {formatarEuros(receitaEntrega(e))}
                  {e.precoKg !== null && ` (${formatarNumero(e.precoKg, 3)} €/kg)`}
                </div>
                {(e.quebras || e.calibres.length > 0) && (
                  <div className="item-detalhe">
                    {[
                      e.quebras ? `quebras ${formatarNumero(e.quebras, 0)} kg` : '',
                      ...e.calibres.map((c) => `${c.calibre}: ${formatarNumero(c.kg, 0)} kg`),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface FormEntrega {
  data: string;
  setorId: string;
  kg: string;
  quebras: string;
  precoKg: string;
  receita: string;
  notas: string;
  calibres: { calibre: string; kg: string }[];
}

const txt = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

export function EditarEntrega() {
  const { id } = useParams();
  const novo = id === 'novo';
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const listaSetores = useConsulta(() => setores.listar());
  const [original, setOriginal] = useState<Entrega | null>(null);
  const [f, setF] = useState<FormEntrega>({
    data: hojeISO(), setorId: '', kg: '', quebras: '', precoKg: '', receita: '', notas: '', calibres: [],
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [carregado, setCarregado] = useState(novo);

  useEffect(() => {
    if (novo || !id) return;
    entregas.obter(id).then((e) => {
      if (e) {
        setOriginal(e);
        setF({
          data: e.data, setorId: e.setorId, kg: txt(e.kg), quebras: txt(e.quebras), precoKg: txt(e.precoKg),
          receita: txt(e.receita), notas: e.notas, calibres: e.calibres.map((c) => ({ calibre: c.calibre, kg: txt(c.kg) })),
        });
      }
      setCarregado(true);
    });
  }, [id, novo]);

  useEffect(() => {
    if (!f.setorId && listaSetores?.length) setF((x) => ({ ...x, setorId: listaSetores[0].id }));
  }, [listaSetores, f.setorId]);

  if (!carregado || !listaSetores) return null;
  if (!novo && !original) return <section><h1>Entrega não encontrada</h1><Link to="/vendas">Voltar</Link></section>;

  const num = (k: 'kg' | 'quebras' | 'precoKg' | 'receita') => lerNumero(f[k]);
  const receitaAuto = receitaEntrega({ kg: num('kg'), quebras: num('quebras'), precoKg: num('precoKg'), receita: null });
  const somaCalibres = f.calibres.reduce((a, c) => a + (lerNumero(c.kg) ?? 0), 0);
  const mudar = (k: keyof FormEntrega) => (e: { target: { value: string } }) => {
    setF({ ...f, [k]: e.target.value });
    if (erros[k]) setErros({ ...erros, [k]: '' });
  };

  async function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    const er: Record<string, string> = {};
    if (!f.data) er.data = 'Indique a data';
    if (!f.setorId) er.setorId = 'Escolha o setor';
    if (num('kg') === null) er.kg = f.kg.trim() ? 'Número inválido' : 'Campo obrigatório';
    for (const k of ['quebras', 'precoKg', 'receita'] as const) {
      if (f[k].trim() && (num(k) === null || num(k)! < 0)) er[k] = 'Número inválido';
    }
    if (f.calibres.some((c) => c.kg.trim() && lerNumero(c.kg) === null)) er.calibres = 'Quantidade inválida num calibre';
    const limpos = Object.fromEntries(Object.entries(er).filter(([, v]) => v));
    setErros(limpos);
    if (Object.keys(limpos).length) return;
    const dados: Novo<Entrega> = {
      ...(original ?? {}),
      data: f.data,
      setorId: f.setorId,
      kg: num('kg'),
      quebras: num('quebras'),
      precoKg: num('precoKg'),
      receita: num('receita'),
      notas: f.notas.trim(),
      calibres: f.calibres
        .filter((c) => c.calibre.trim() && lerNumero(c.kg) !== null)
        .map((c) => ({ calibre: c.calibre.trim(), kg: lerNumero(c.kg)! })),
    };
    await entregas.guardar(dados);
    navegar('/vendas');
  }

  async function apagar() {
    if (!original) return;
    const ok = await confirmar({
      titulo: 'Apagar entrega?',
      mensagem: <p>Entrega de {formatarNumero(original.kg, 0)} kg em {formatarData(original.data)}. Esta ação não pode ser desfeita.</p>,
      confirmar: 'Apagar',
      perigo: true,
    });
    if (!ok) return;
    await entregas.apagar(original.id);
    navegar('/vendas');
  }

  const kgLiq = kgLiquidos({ kg: num('kg'), quebras: num('quebras') });

  return (
    <section>
      <h1>{novo ? 'Nova entrega' : 'Editar entrega'}</h1>
      <form className="cartao" onSubmit={guardar} noValidate>
        <div className="linha-campos">
          <Campo rotulo="Data" obrigatorio erro={erros.data}>
            {(i) => <input id={i} type="date" value={f.data} onChange={mudar('data')} />}
          </Campo>
          <Campo rotulo="Setor" obrigatorio erro={erros.setorId}>
            {(i) => (
              <select id={i} value={f.setorId} onChange={mudar('setorId')}>
                {listaSetores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            )}
          </Campo>
        </div>
        <div className="linha-campos">
          <Campo rotulo="Entregue" unidade="kg" obrigatorio erro={erros.kg}>
            {(i) => <input id={i} inputMode="decimal" value={f.kg} onChange={mudar('kg')} />}
          </Campo>
          <Campo rotulo="Quebras" unidade="kg" erro={erros.quebras}>
            {(i) => <input id={i} inputMode="decimal" value={f.quebras} onChange={mudar('quebras')} />}
          </Campo>
        </div>
        <div className="linha-campos">
          <Campo rotulo="Preço" unidade="€/kg" erro={erros.precoKg}>
            {(i) => <input id={i} inputMode="decimal" value={f.precoKg} onChange={mudar('precoKg')} />}
          </Campo>
          <Campo
            rotulo="Receita"
            unidade="€"
            erro={erros.receita}
            ajuda={f.receita.trim() ? 'Valor escrito à mão' : `Calculada: ${formatarNumero(kgLiq, 0)} kg × preço = ${formatarEuros(receitaAuto)}`}
          >
            {(i) => (
              <input id={i} inputMode="decimal" value={f.receita} onChange={mudar('receita')} placeholder={formatarNumero(receitaAuto, 2)} />
            )}
          </Campo>
        </div>

        <div className="campo">
          <span className="rotulo">kg por calibre</span>
          {f.calibres.map((c, i) => (
            <div className="linha-calibre" key={i}>
              <input
                aria-label={`Calibre ${i + 1}`}
                placeholder="Calibre (ex. A, 12-14)"
                value={c.calibre}
                onChange={(e) => setF({ ...f, calibres: f.calibres.map((x, j) => (j === i ? { ...x, calibre: e.target.value } : x)) })}
              />
              <input
                aria-label={`kg do calibre ${i + 1}`}
                placeholder="kg"
                inputMode="decimal"
                value={c.kg}
                onChange={(e) => setF({ ...f, calibres: f.calibres.map((x, j) => (j === i ? { ...x, kg: e.target.value } : x)) })}
              />
              <button
                type="button"
                className="botao secundario perigo"
                aria-label={`Remover calibre ${i + 1}`}
                onClick={() => setF({ ...f, calibres: f.calibres.filter((_, j) => j !== i) })}
              >
                ×
              </button>
            </div>
          ))}
          <div>
            <button type="button" className="botao secundario pequeno" onClick={() => setF({ ...f, calibres: [...f.calibres, { calibre: '', kg: '' }] })}>
              + Calibre
            </button>
          </div>
          {erros.calibres && <span className="erro">{erros.calibres}</span>}
          {f.calibres.length > 0 && (
            <span className={`ajuda ${num('kg') !== null && Math.abs(somaCalibres - kgLiq) > 0.5 ? 'texto-aviso' : ''}`}>
              Soma dos calibres: {formatarNumero(somaCalibres, 0)} kg (vendidos: {formatarNumero(kgLiq, 0)} kg)
            </span>
          )}
        </div>

        <Campo rotulo="Notas">{(i) => <textarea id={i} value={f.notas} onChange={mudar('notas')} />}</Campo>
        <div className="botoes">
          <button type="submit" className="botao grande">Guardar</button>
          <Link to="/vendas" className="botao grande secundario">Cancelar</Link>
          {!novo && (
            <button type="button" className="botao grande perigo secundario" onClick={apagar}>Apagar</button>
          )}
        </div>
      </form>
    </section>
  );
}
