import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Campo from '../componentes/Campo';
import { useConfirmar } from '../componentes/Confirmar';
import type { Setor } from '../dados/modelo';
import { setores, useConsulta, type Novo } from '../dados/repositorio';
import { formatarNumero, lerNumero } from '../lib/formatos';
import { FORM_SETOR_VAZIO as VAZIO, validarSetor, type FormSetor } from '../lib/setores';

export function ListaSetores() {
  const lista = useConsulta(() => setores.listar());
  if (!lista) return null;
  const areaTotal = lista.reduce((a, s) => a + (s.areaHa ?? 0), 0);
  const arvores = lista.reduce((a, s) => a + (s.numArvores ?? 0), 0);

  return (
    <section>
      <div className="cabecalho">
        <h1>Setores</h1>
        <Link to="/setores/novo" className="botao">
          + Novo setor
        </Link>
      </div>
      {lista.length > 0 && (
        <p className="texto-suave">
          {lista.length} setor(es) · {formatarNumero(areaTotal)} ha
          {arvores > 0 && ` · ${formatarNumero(arvores, 0)} árvores`}
        </p>
      )}
      {lista.length === 0 ? (
        <div className="cartao vazio">Ainda não há setores. Crie o primeiro com «Novo setor».</div>
      ) : (
        <ul className="lista">
          {lista.map((s) => (
            <li key={s.id}>
              <Link to={`/setores/${s.id}`} className="item">
                <div className="item-topo">
                  <span className="item-titulo">{s.nome}</span>
                  {s.areaHa !== null && <span>{formatarNumero(s.areaHa)} ha</span>}
                </div>
                <div className="item-detalhe">
                  {[s.cultura, s.variedade, s.anoPlantacao && `plantado em ${s.anoPlantacao}`].filter(Boolean).join(' · ')}
                </div>
                {(s.numArvores !== null || s.compasso) && (
                  <div className="item-detalhe">
                    {[s.numArvores !== null && `${formatarNumero(s.numArvores, 0)} árvores`, s.compasso && `compasso ${s.compasso}`]
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

const paraTexto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

export function EditarSetor() {
  const { id } = useParams();
  const novo = id === 'novo';
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const [original, setOriginal] = useState<Setor | null>(null);
  const [f, setF] = useState<FormSetor>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof FormSetor, string>>>({});
  const [carregado, setCarregado] = useState(novo);

  useEffect(() => {
    if (novo || !id) return;
    setores.obter(id).then((s) => {
      if (s) {
        setOriginal(s);
        setF({
          nome: s.nome,
          areaHa: paraTexto(s.areaHa),
          cultura: s.cultura,
          variedade: s.variedade,
          anoPlantacao: s.anoPlantacao === null ? '' : String(s.anoPlantacao),
          numArvores: s.numArvores === null ? '' : String(s.numArvores),
          compasso: s.compasso,
          notas: s.notas,
        });
      }
      setCarregado(true);
    });
  }, [id, novo]);

  if (!carregado) return null;
  if (!novo && !original) {
    return (
      <section>
        <h1>Setor não encontrado</h1>
        <Link to="/setores">Voltar aos setores</Link>
      </section>
    );
  }

  const mudar = (k: keyof FormSetor) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const er = validarSetor(f);
    setErros(er);
    if (Object.keys(er).length) return;
    const dados: Novo<Setor> = {
      ...(original ?? {}),
      nome: f.nome.trim(),
      areaHa: lerNumero(f.areaHa),
      cultura: f.cultura.trim(),
      variedade: f.variedade.trim(),
      anoPlantacao: lerNumero(f.anoPlantacao),
      numArvores: lerNumero(f.numArvores),
      compasso: f.compasso.trim(),
      notas: f.notas.trim(),
    };
    await setores.guardar(dados);
    navegar('/setores');
  }

  async function apagar() {
    if (!original) return;
    const n = await setores.contarAssociados(original.id);
    const ok = await confirmar({
      titulo: `Apagar «${original.nome}»?`,
      mensagem:
        n > 0 ? (
          <>
            <p>
              <strong className="texto-erro">Atenção:</strong> este setor tem <strong>{n}</strong> registo(s) associado(s)
              (caderno de campo, análises ou entregas).
            </p>
            <p>Esses registos não são apagados, mas ficam marcados como «(setor apagado)».</p>
          </>
        ) : (
          <p>Esta ação não pode ser desfeita.</p>
        ),
      confirmar: 'Apagar setor',
      perigo: true,
    });
    if (!ok) return;
    await setores.apagar(original.id);
    navegar('/setores');
  }

  return (
    <section>
      <h1>{novo ? 'Novo setor' : `Editar ${original!.nome}`}</h1>
      <form className="cartao" onSubmit={guardar} noValidate>
        <Campo rotulo="Nome" obrigatorio erro={erros.nome}>
          {(i) => <input id={i} value={f.nome} onChange={mudar('nome')} autoFocus={novo} />}
        </Campo>
        <div className="linha-campos">
          <Campo rotulo="Área" unidade="ha" erro={erros.areaHa}>
            {(i) => <input id={i} inputMode="decimal" value={f.areaHa} onChange={mudar('areaHa')} />}
          </Campo>
          <Campo rotulo="N.º de árvores" erro={erros.numArvores}>
            {(i) => <input id={i} inputMode="numeric" value={f.numArvores} onChange={mudar('numArvores')} />}
          </Campo>
        </div>
        <div className="linha-campos">
          <Campo rotulo="Cultura">{(i) => <input id={i} value={f.cultura} onChange={mudar('cultura')} />}</Campo>
          <Campo rotulo="Variedade">{(i) => <input id={i} value={f.variedade} onChange={mudar('variedade')} />}</Campo>
        </div>
        <div className="linha-campos">
          <Campo rotulo="Ano de plantação" erro={erros.anoPlantacao}>
            {(i) => <input id={i} inputMode="numeric" value={f.anoPlantacao} onChange={mudar('anoPlantacao')} />}
          </Campo>
          <Campo rotulo="Compasso" ajuda="Ex.: 5 × 3 m">
            {(i) => <input id={i} value={f.compasso} onChange={mudar('compasso')} />}
          </Campo>
        </div>
        <Campo rotulo="Notas">{(i) => <textarea id={i} value={f.notas} onChange={mudar('notas')} />}</Campo>
        <div className="botoes">
          <button type="submit" className="botao grande">
            Guardar
          </button>
          <Link to="/setores" className="botao grande secundario">
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
