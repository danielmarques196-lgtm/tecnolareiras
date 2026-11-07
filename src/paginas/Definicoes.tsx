import { useEffect, useRef, useState } from 'react';
import { criarBackup, ErroBackup, importarBackupTexto, marcarCopiaFeita, nomeFicheiroBackup } from '../dados/backup';
import type { Tema } from '../dados/modelo';
import { NOMES_TIPO, type TipoRegisto } from '../dados/modelo';
import { definicoes, importarRegistos, registos, setores, useConsulta } from '../dados/repositorio';
import { analisarCsv, type PlanoImportacao } from '../lib/importacao';
import Campo from '../componentes/Campo';
import { useConfirmar } from '../componentes/Confirmar';
import { descarregarFicheiro } from '../lib/descarregar';
import { formatarDataHora } from '../lib/formatos';
import { LOCALIZACAO_PREDEFINIDA, type Localizacao as LocalizacaoT } from '../lib/clima';
import { estadoCopia } from '../lib/lembrete';
import { formatarNumero, lerNumero } from '../lib/formatos';

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
    await marcarCopiaFeita(b);
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

      <ImportarCsv />

      <div className="cartao">
        <h2>Exploração</h2>
        <p className="texto-suave">Aparece no cabeçalho do registo de tratamentos.</p>
        <div className="linha-campos">
          <CampoDefinicao key={`n-${(defs.nomeExploracao as string) ?? ''}`} chave="nomeExploracao" rotulo="Nome da exploração" valor={(defs.nomeExploracao as string) ?? 'Herdade da Coroa'} />
          <CampoDefinicao key={`t-${(defs.titular as string) ?? ''}`} chave="titular" rotulo="Titular (nome / NIF)" valor={(defs.titular as string) ?? ''} />
        </div>
      </div>

      <Localizacao atual={(defs.localizacao as LocalizacaoT | undefined) ?? null} />

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

/** Localização da herdade para o clima (Open-Meteo). */
function Localizacao({ atual }: { atual: LocalizacaoT | null }) {
  const l = atual ?? LOCALIZACAO_PREDEFINIDA;
  const [lat, setLat] = useState(formatarNumero(l.latitude, 5));
  const [lon, setLon] = useState(formatarNumero(l.longitude, 5));
  const [nome, setNome] = useState(atual ? atual.nome : 'Herdade da Coroa');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // volta a ler os valores guardados quando mudam fora deste cartão (ex.: repor uma cópia)
  const guardado = JSON.stringify(atual);
  useEffect(() => {
    setLat(formatarNumero(l.latitude, 5));
    setLon(formatarNumero(l.longitude, 5));
    setNome(atual ? atual.nome : 'Herdade da Coroa');
  }, [guardado]);

  async function gravar(latitude: number | null, longitude: number | null) {
    if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      setMsg({ tipo: 'erro', texto: 'Coordenadas inválidas. Ex.: latitude 39,236 e longitude -8,686.' });
      return;
    }
    await definicoes.gravar('localizacao', { latitude, longitude, nome: nome.trim() || 'Herdade da Coroa' });
    setLat(formatarNumero(latitude, 5));
    setLon(formatarNumero(longitude, 5));
    setMsg({ tipo: 'ok', texto: 'Localização guardada.' });
  }

  function usarGps() {
    if (!navigator.geolocation) return setMsg({ tipo: 'erro', texto: 'Este dispositivo não permite obter a localização.' });
    setMsg({ tipo: 'ok', texto: 'A obter a localização…' });
    navigator.geolocation.getCurrentPosition(
      (p) => gravar(p.coords.latitude, p.coords.longitude),
      () => setMsg({ tipo: 'erro', texto: 'Não foi possível obter a localização (permissão recusada?).' }),
      { enableHighAccuracy: true, timeout: 20000 },
    );
  }

  return (
    <div className="cartao">
      <h2>Localização da herdade</h2>
      <p className="texto-suave">
        Usada para a meteorologia e a ETo.{!atual && ` Ainda está a usar a predefinição (${LOCALIZACAO_PREDEFINIDA.nome}).`}
      </p>
      <Campo rotulo="Nome">{(i) => <input id={i} value={nome} onChange={(e) => setNome(e.target.value)} />}</Campo>
      <div className="linha-campos">
        <Campo rotulo="Latitude">{(i) => <input id={i} inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />}</Campo>
        <Campo rotulo="Longitude">{(i) => <input id={i} inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} />}</Campo>
      </div>
      <div className="botoes">
        <button type="button" className="botao" onClick={() => gravar(lerNumero(lat), lerNumero(lon))}>
          Guardar localização
        </button>
        <button type="button" className="botao secundario" onClick={usarGps}>
          Usar a localização atual
        </button>
      </div>
      {msg && <p className={msg.tipo === 'ok' ? 'texto-ok' : 'texto-erro'}>{msg.texto}</p>}
    </div>
  );
}

/** Importação do CSV da app anterior, com pré-visualização. */
function ImportarCsv() {
  const ficheiro = useRef<HTMLInputElement>(null);
  const [plano, setPlano] = useState<(PlanoImportacao & { nome: string }) | null>(null);
  const [resultado, setResultado] = useState('');
  const [aImportar, setAImportar] = useState(false);

  async function ler(f: File) {
    setResultado('');
    const texto = await f.text();
    const p = analisarCsv(texto, await setores.listar(), await registos.listar());
    setPlano({ ...p, nome: f.name });
  }

  async function importar() {
    if (!plano || aImportar) return;
    setAImportar(true);
    try {
      const r = await importarRegistos(plano.setoresNovos, plano.registos);
      setResultado(`Importados ${r.registos} registo(s)${r.setores ? ` e criados ${r.setores} setor(es)` : ''}.`);
      setPlano(null);
    } finally {
      setAImportar(false);
    }
  }

  return (
    <div className="cartao">
      <h2>Importar CSV da app anterior</h2>
      <p className="texto-suave">
        Mostra uma pré-visualização antes de gravar. Cria os setores que faltam; registos repetidos não são importados duas vezes.
      </p>
      <details className="texto-suave" style={{ marginBottom: 8 }}>
        <summary>Colunas esperadas</summary>
        <code className="quebrar">
          data;tipo;setor;produto;substancia;apv;alvo;dose;unidade;calda;is;aplicador;equipamento;modo;volume;horas;h2o2;operacao;horasMO;intensidade;descricao;kg;destino;calibre;custo;notas
        </code>
      </details>
      <div className="botoes">
        <button type="button" className="botao secundario" onClick={() => ficheiro.current?.click()}>
          Escolher ficheiro CSV
        </button>
        <input
          ref={ficheiro}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) ler(f);
          }}
        />
      </div>
      {plano && (
        <div className="previa-importacao" role="status">
          <h3>«{plano.nome}»</h3>
          {plano.registos.length > 0 ? (
            <ul>
              <li>
                <strong>{plano.registos.length}</strong> registo(s) a importar:{' '}
                {Object.entries(plano.porTipo)
                  .map(([t, n]) => `${NOMES_TIPO[t as TipoRegisto]} (${n})`)
                  .join(', ')}
              </li>
              {plano.setoresNovos.length > 0 && <li>Setores novos a criar: {plano.setoresNovos.join(', ')}</li>}
            </ul>
          ) : (
            <p>Nada para importar.</p>
          )}
          {plano.duplicados > 0 && <p className="texto-suave">{plano.duplicados} registo(s) já existem e serão ignorados.</p>}
          {[...plano.erros, ...plano.avisos].length > 0 && (
            <details>
              <summary className={plano.erros.length ? 'texto-erro' : 'texto-aviso'}>
                {plano.erros.length} linha(s) ignorada(s), {plano.avisos.length} aviso(s)
              </summary>
              <ul className="texto-suave">
                {[...plano.erros, ...plano.avisos].map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="botoes">
            <button type="button" className="botao" disabled={!plano.registos.length || aImportar} onClick={importar}>
              {aImportar ? 'A importar…' : `Importar ${plano.registos.length} registo(s)`}
            </button>
            <button type="button" className="botao secundario" onClick={() => setPlano(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {resultado && <p className="texto-ok">{resultado}</p>}
    </div>
  );
}
