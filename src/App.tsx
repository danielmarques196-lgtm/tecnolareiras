import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfirmarProvider } from './componentes/Confirmar';
import EmConstrucao from './componentes/EmConstrucao';
import LembreteCopia from './componentes/LembreteCopia';
import Navegacao from './componentes/Navegacao';
import { AplicarTema } from './componentes/Tema';
import Definicoes from './paginas/Definicoes';
import EditarRegisto from './paginas/EditarRegisto';
import ListaRegistos from './paginas/Registos';
import RegistoTratamentos from './paginas/RegistoTratamentos';
import { EditarSetor, ListaSetores } from './paginas/Setores';
import Resumo from './paginas/Resumo';

export default function App() {
  return (
    <HashRouter>
      <ConfirmarProvider>
        <AplicarTema />
        <div className="layout">
          <Navegacao />
          <main className="conteudo">
            <LembreteCopia />
            <Routes>
              <Route path="/" element={<Resumo />} />
              <Route path="/registos" element={<ListaRegistos />} />
              <Route path="/registos/tratamentos" element={<RegistoTratamentos />} />
              <Route path="/registos/:id" element={<EditarRegisto />} />
              <Route path="/setores" element={<ListaSetores />} />
              <Route path="/setores/:id" element={<EditarSetor />} />
              <Route path="/solo-agua" element={<EmConstrucao titulo="Solo e água" etapa={4} />} />
              <Route path="/vendas" element={<EmConstrucao titulo="Vendas" etapa={5} />} />
              <Route path="/clima" element={<EmConstrucao titulo="Clima" etapa={5} />} />
              <Route path="/definicoes" element={<Definicoes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </ConfirmarProvider>
    </HashRouter>
  );
}
