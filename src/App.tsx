import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfirmarProvider } from './componentes/Confirmar';
import LembreteCopia from './componentes/LembreteCopia';
import Navegacao from './componentes/Navegacao';
import { AplicarTema } from './componentes/Tema';
import Definicoes from './paginas/Definicoes';
import EditarRegisto from './paginas/EditarRegisto';
import ListaRegistos from './paginas/Registos';
import RegistoTratamentos from './paginas/RegistoTratamentos';
import { EditarSetor, ListaSetores } from './paginas/Setores';
import SoloAgua, { EditarAnalise } from './paginas/SoloAgua';
import Clima from './paginas/Clima';
import Vendas, { EditarEntrega } from './paginas/Vendas';
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
              <Route path="/solo-agua" element={<SoloAgua />} />
              <Route path="/solo-agua/:tipo/:id" element={<EditarAnalise />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/vendas/:id" element={<EditarEntrega />} />
              <Route path="/clima" element={<Clima />} />
              <Route path="/definicoes" element={<Definicoes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </ConfirmarProvider>
    </HashRouter>
  );
}
