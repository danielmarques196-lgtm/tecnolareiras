import { useRef, useState } from 'react';
import { criarBackup, ErroBackup, importarBackupTexto, nomeFicheiroBackup } from '../dados/backup';
import type { Tema } from '../dados/modelo';
import { definicoes, useConsulta } from '../dados/repositorio';
import Campo from '../componentes/Campo';
import { useConfirmar } from '../componentes/Confirmar';
import { descarregarFicheiro } from '../lib/descarregar';
import { formatarDataHora } from '../lib/formatos';
import { estadoCopia } from '../lib/lembrete';

const TEMAS: { valor: Tema; nome: string }[] = [
  { valor: 'auto', nome: 'Automático' },
  { valor: 'claro', nome: 'Claro' },
  { valor: 'escuro', nome: 'Escuro' },
];

export default function Definicoes() {
  const defs = useConsulta(() => definicoes.todas());
  const confirmar = useConfirmar();
  const ficheiro = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  if (!defs) return null;
  const tema = (defs.tema as Tema | undefined) ?? 'auto';
  const ultima = (defs.ultimaCopia as string | undefined) ?? null;
  const copia = estadoCopia(ultima, (defs.primeiraUtilizacao as string | undefined) ?? null);

  async function exportar() {
    const b = await criarBackup();
    descarregarFicheiro(nomeFicheiroBackup(), JSON.stringify(b, null, 1), 'application/json');
    setMensagem({ tipo: 'ok', texto: 'Cópia de segurança criada. Guarde o ficheiro num local seguro (ex. Google Drive, e-mail, PC).' });
  }

  async function importar(f: File) {
    const ok = await confirmar({
      titulo: 'Repor cópia de segurança',
      mensagem: (
        <>
          <p>
            Todos os dados atuais desta app serão <strong>substituídos</strong> pelos do ficheiro «{f.name}».
          </p>
          <p>Se tiver dúvidas, exporte primeiro uma cópia dos dados atuais.</p>
        </>
      ),
      confirmar: 'Substituir dados',
      perigo: true,
    });
    if (!ok) return;
    try {
      const b = await importarBackupTexto(await f.text());
      setMensagem({ tipo: 'ok', texto: `Dados repostos a partir da cópia de ${formatarDataHora(b.exportadoEm)}.` });
    } catch (e) {
      setMensagem({
        tipo: 'erro',
        texto: e instanceof ErroBackup ? e.message : 'Não foi possível ler o ficheiro.',
      });
    }
  }

  return (
    <section>
      <h1>Definições</h1>

      <div className="cartao destaque">
        <h2>Cópia de segurança</h2>
        <p>
          Os dados ficam guardados apenas neste dispositivo. Faça cópias regulares e guarde-as fora do telemóvel.
        </p>
        <p className={copia.lembrar ? 'texto-aviso' : 'texto-suave'}>
          {ultima ? `Última cópia: ${formatarDataHora(ultima)} (há ${copia.dias} dias)` : 'Ainda não foi feita nenhuma cópia.'}
        </p>
        <div className="botoes">
          <button type="button" className="botao grande" onClick={exportar}>
            Exportar cópia de segurança
          </button>
          <button type="button" className="botao grande secundario" onClick={() => ficheiro.current?.click()}>
            Importar cópia de segurança
          </button>
          <input
            ref={ficheiro}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) importar(f);
            }}
          />
        </div>
        {mensagem && (
          <p className={mensagem.tipo === 'ok' ? 'texto-ok' : 'texto-erro'} role="status">
            {mensagem.texto}
          </p>
        )}
      </div>

      <div className="cartao">
        <h2>Exploração</h2>
        <p className="texto-suave">Aparece no cabeçalho do registo de tratamentos.</p>
        <div className="linha-campos">
          <CampoDefinicao chave="nomeExploracao" rotulo="Nome da exploração" valor={(defs.nomeExploracao as string) ?? 'Herdade da Coroa'} />
          <CampoDefinicao chave="titular" rotulo="Titular (nome / NIF)" valor={(defs.titular as string) ?? ''} />
        </div>
      </div>

      <div className="cartao">
        <h2>Aspeto</h2>
        <div className="segmentado" role="radiogroup" aria-label="Tema">
          {TEMAS.map((t) => (
            <button
              key={t.valor}
              type="button"
              role="radio"
              aria-checked={tema === t.valor}
              className={tema === t.valor ? 'ativo' : ''}
              onClick={() => definicoes.gravar('tema', t.valor)}
            >
              {t.nome}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Campo de texto que grava a definição ao sair do campo. */
function CampoDefinicao({ chave, rotulo, valor }: { chave: string; rotulo: string; valor: string }) {
  const [v, setV] = useState(valor);
  return (
    <Campo rotulo={rotulo}>
      {(i) => (
        <input id={i} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== valor && definicoes.gravar(chave, v.trim())} />
      )}
    </Campo>
  );
}
