import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfirmarProvider } from './componentes/Confirmar';
import EmConstrucao from './componentes/EmConstrucao';
import LembreteCopia from './componentes/LembreteCopia';
import Navegacao from './componentes/Navegacao';
import { AplicarTema } from './componentes/Tema';
import Definicoes from './paginas/Definicoes';
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
              <Route path="/registos" element={<EmConstrucao titulo="Registos" etapa={2} />} />
              <Route path="/setores" element={<EmConstrucao titulo="Setores" etapa={2} />} />
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
