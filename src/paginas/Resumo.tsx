import { setores, useConsulta } from '../dados/repositorio';

export default function Resumo() {
  const lista = useConsulta(() => setores.listar());
  return (
    <section>
      <h1>Resumo</h1>
      <div className="cartao">
        <p>Bem-vindo à gestão da Herdade da Coroa.</p>
        <p className="texto-suave">
          {lista ? `${lista.length} setor(es) registado(s).` : ''} Os indicadores da campanha chegam na etapa 3.
        </p>
      </div>
    </section>
  );
}
