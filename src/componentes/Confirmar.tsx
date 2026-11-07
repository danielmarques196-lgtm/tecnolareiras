// Diálogo de confirmação (substitui window.confirm, com botões grandes).
// Uso: const confirmar = useConfirmar(); if (await confirmar({ mensagem: '…' })) …
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface PedidoConfirmacao {
  titulo?: string;
  mensagem: ReactNode;
  confirmar?: string; // texto do botão
  perigo?: boolean; // botão vermelho
}

type FnConfirmar = (p: PedidoConfirmacao) => Promise<boolean>;
const Contexto = createContext<FnConfirmar>(async () => false);

export function useConfirmar(): FnConfirmar {
  return useContext(Contexto);
}

export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<(PedidoConfirmacao & { resolver: (v: boolean) => void }) | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  const confirmar = useCallback<FnConfirmar>(
    (p) => new Promise<boolean>((resolver) => setPedido({ ...p, resolver })),
    [],
  );

  useEffect(() => {
    const d = ref.current;
    if (pedido && d && !d.open) d.showModal();
  }, [pedido]);

  const responder = (v: boolean) => {
    pedido?.resolver(v);
    ref.current?.close();
    setPedido(null);
  };

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <dialog
        ref={ref}
        className="dialogo"
        onCancel={(e) => {
          e.preventDefault();
          responder(false);
        }}
      >
        {pedido && (
          <>
            <h2>{pedido.titulo ?? 'Confirmar'}</h2>
            <div className="dialogo-texto">{pedido.mensagem}</div>
            <div className="botoes">
              <button type="button" className="botao secundario" onClick={() => responder(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className={`botao ${pedido.perigo ? 'perigo' : ''}`}
                onClick={() => responder(true)}
                autoFocus
              >
                {pedido.confirmar ?? 'Confirmar'}
              </button>
            </div>
          </>
        )}
      </dialog>
    </Contexto.Provider>
  );
}
