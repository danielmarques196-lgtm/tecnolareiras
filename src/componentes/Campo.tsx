import { useId, type ReactNode } from 'react';

/** Rótulo + controlo + mensagem de erro/ajuda. O controlo recebe o id via função. */
export default function Campo({
  rotulo,
  obrigatorio,
  erro,
  ajuda,
  unidade,
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  erro?: string;
  ajuda?: string;
  unidade?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={`campo ${erro ? 'com-erro' : ''}`}>
      <label htmlFor={id} className={obrigatorio ? 'obrigatorio' : ''}>
        {rotulo}
        {unidade && <span className="unidade"> ({unidade})</span>}
      </label>
      {children(id)}
      {erro ? <span className="erro">{erro}</span> : ajuda && <span className="ajuda">{ajuda}</span>}
    </div>
  );
}
