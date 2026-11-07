import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icone from './Icone';

export interface ItemNav {
  caminho: string;
  nome: string;
  icone: string;
}

export const ITENS_NAV: ItemNav[] = [
  { caminho: '/', nome: 'Resumo', icone: 'resumo' },
  { caminho: '/registos', nome: 'Registos', icone: 'registos' },
  { caminho: '/setores', nome: 'Setores', icone: 'setores' },
  { caminho: '/solo-agua', nome: 'Solo e água', icone: 'solo' },
  { caminho: '/vendas', nome: 'Vendas', icone: 'vendas' },
  { caminho: '/clima', nome: 'Clima', icone: 'clima' },
  { caminho: '/definicoes', nome: 'Definições', icone: 'definicoes' },
];

// No telemóvel: 4 atalhos + "Mais"
const PRINCIPAIS = ['/', '/registos', '/setores', '/clima'];

function Ligacao({ item, aoClicar }: { item: ItemNav; aoClicar?: () => void }) {
  return (
    <NavLink to={item.caminho} end={item.caminho === '/'} onClick={aoClicar}>
      <Icone nome={item.icone} />
      <span>{item.nome}</span>
    </NavLink>
  );
}

export default function Navegacao() {
  const [maisAberto, setMaisAberto] = useState(false);
  const { pathname } = useLocation();
  const secundarios = ITENS_NAV.filter((i) => !PRINCIPAIS.includes(i.caminho));
  const emSecundario = secundarios.some((i) => pathname.startsWith(i.caminho));

  return (
    <>
      {/* computador */}
      <nav className="nav-lateral" aria-label="Navegação principal">
        <div className="marca">
          <img src="./icone.svg" alt="" width={36} height={36} />
          <span>Herdade da Coroa</span>
        </div>
        {ITENS_NAV.map((i) => (
          <Ligacao key={i.caminho} item={i} />
        ))}
      </nav>

      {/* telemóvel */}
      <nav className="nav-inferior" aria-label="Navegação">
        {ITENS_NAV.filter((i) => PRINCIPAIS.includes(i.caminho)).map((i) => (
          <Ligacao key={i.caminho} item={i} aoClicar={() => setMaisAberto(false)} />
        ))}
        <button
          type="button"
          className={emSecundario ? 'active' : ''}
          aria-expanded={maisAberto}
          onClick={() => setMaisAberto((v) => !v)}
        >
          <Icone nome="mais" />
          <span>Mais</span>
        </button>
      </nav>
      {maisAberto && (
        <div className="menu-mais-fundo" onClick={() => setMaisAberto(false)}>
          <div className="menu-mais" role="menu" onClick={(e) => e.stopPropagation()}>
            {secundarios.map((i) => (
              <Ligacao key={i.caminho} item={i} aoClicar={() => setMaisAberto(false)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
