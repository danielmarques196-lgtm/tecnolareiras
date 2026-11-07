import { Link } from 'react-router-dom';
import { definicoes, useConsulta } from '../dados/repositorio';
import { estadoCopia } from '../lib/lembrete';

/** Faixa no topo quando a última cópia de segurança tem mais de 30 dias. */
export default function LembreteCopia() {
  const defs = useConsulta(() => definicoes.todas());
  if (!defs) return null;
  const e = estadoCopia(
    (defs.ultimaCopia as string | undefined) ?? null,
    (defs.primeiraUtilizacao as string | undefined) ?? null,
  );
  if (!e.lembrar) return null;
  return (
    <div className="aviso aviso-copia" role="status">
      <span>
        {e.nuncaFeita
          ? 'Ainda não fez nenhuma cópia de segurança dos seus dados.'
          : `A última cópia de segurança foi há ${e.dias} dias.`}
      </span>
      <Link to="/definicoes" className="botao pequeno">
        Fazer cópia
      </Link>
    </div>
  );
}
