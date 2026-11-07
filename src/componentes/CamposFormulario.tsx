import { useRef, useState } from 'react';
import type { DefCampo } from '../lib/formulario';
import { comprimirImagem } from '../lib/imagem';
import Campo from './Campo';

/** Formulário gerado a partir de uma lista de definições de campos (valores em texto). */
export default function CamposFormulario({
  defs,
  valores: campos,
  erros,
  aoMudar,
}: {
  defs: DefCampo[];
  valores: Record<string, string>;
  erros: Record<string, string>;
  aoMudar: (chave: string, valor: string) => void;
}) {
  // agrupa campos consecutivos com o mesmo `grupo` numa linha
  const blocos: DefCampo[][] = [];
  for (const c of defs) {
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
          case 'data':
            return <input id={i} type="date" value={valor} onChange={mudar} />;
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
      {valor && <img src={valor} alt="Fotografia" className="foto-previa" />}
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
