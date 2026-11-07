# Herdade da Coroa — Gestão Agrícola

Aplicação própria de gestão agrícola (referência: Wisecrop) para a Herdade da Coroa:
pomar de romãzeiras em Portugal, rega gota-a-gota a partir de dois furos, com injeção
contínua de H₂O₂ contra entupimentos por ferro e manganês.

Objetivos: sem mensalidade, dados sob controlo do dono (guardados no browser, com cópia
de segurança em JSON), funciona offline no campo (PWA), interface em **português de Portugal**.

## Stack
- React 19 + TypeScript + Vite
- PWA com `vite-plugin-pwa` (service worker gerado com Workbox, `registerType: autoUpdate`)
- IndexedDB via Dexie.js (`dexie`, `dexie-react-hooks`)
- Rotas com `react-router-dom` em modo **HashRouter** (funciona em qualquer alojamento estático sem regras de redirecionamento)
- CSS simples com variáveis (`src/estilos.css`), tema claro/escuro/automático
- Testes com Vitest (+ `fake-indexeddb` para testar o repositório em Node)

## Estrutura de pastas
```
src/
  main.tsx            arranque, registo do service worker
  App.tsx             layout + rotas
  estilos.css         estilos globais e temas
  dados/
    modelo.ts         tipos de dados (Setor, Registo, ...)
    bd.ts             esquema Dexie (versões) — só repositorio.ts e backup.ts o importam
    repositorio.ts    ÚNICA porta de acesso aos dados (CRUD, definições, seed, backup)
    backup.ts         exportar/importar JSON (formato versionado)
    seed.ts           dados iniciais, aplicados uma vez cada (passos numerados)
  lib/                lógica pura e testável (formatos, datas, cálculos, CSV)
  componentes/        componentes reutilizáveis (Navegacao, Confirmar, Aviso…)
  paginas/            uma página por módulo (Resumo, Registos, EditarRegisto, RegistoTratamentos, Setores, SoloAgua, Vendas, Clima, Definicoes)
public/               ícones da PWA
dados/                CSV a importar da app anterior (opcional, não versionado se tiver dados pessoais)
```

## Convenções
- Código (identificadores) e UI em português; mensagens de commit em português.
- Datas guardadas como texto ISO `AAAA-MM-DD`; mostradas como `dd/mm/aaaa` (`lib/formatos.ts`).
- Números guardados como `number`; mostrados com vírgula decimal (`Intl.NumberFormat('pt-PT')`).
  Campos de entrada numéricos aceitam vírgula ou ponto (`lerNumero`).
- Unidades métricas: ha, m³, kg, L.
- IDs: `crypto.randomUUID()` (texto) — facilita a futura sincronização (sem colisões entre dispositivos).
- Todos os registos têm `criadoEm` e `atualizadoEm` (ISO datetime) — base para sincronização.
- As páginas **nunca** importam `bd.ts` nem `dexie` diretamente: usam `dados/repositorio.ts`
  (funções assíncronas + hook `useConsulta`). Assim, a troca/adição de Supabase fica confinada ao repositório.
- Lógica de negócio em `src/lib/` como funções puras, com testes `*.test.ts` ao lado.
- Apagar pede sempre confirmação (`confirmar()` de `componentes/Confirmar`).
- CSV: separador `;`, BOM UTF-8, decimais com vírgula, datas dd/mm/aaaa.

## Comandos
| Ação | Comando |
|---|---|
| Instalar | `npm install` |
| Correr (dev) | `npm run dev` (abre em http://localhost:5173; `--host` já ativo para acesso pela rede Wi-Fi) |
| Testar | `npm test` (Vitest, uma passagem) / `npm run test:watch` |
| Verificar tipos | `npm run typecheck` |
| Build | `npm run build` (gera `dist/` com service worker) |
| Pré-visualizar build | `npm run preview` |
| Backup | Na app: Definições → "Exportar cópia de segurança" (JSON). Repor: "Importar cópia de segurança". |

## Decisões tomadas (opção mais simples)
- **HashRouter** em vez de BrowserRouter: publicação estática sem configuração extra (Netlify/Cloudflare Pages).
- **Navegação**: no telemóvel, barra inferior com Resumo, Registos, Setores, Clima e "Mais" (Solo e água, Vendas, Definições); no computador, barra lateral com tudo.
- **Fotografias** (módulo 2): guardadas como data URL JPEG comprimido dentro do próprio registo — a cópia JSON inclui-as sem tratamento especial.
- **Furos**: tabela própria (`furos`), semeada com "Furo 1" e "Furo 2".
- **Definições**: tabela chave-valor `definicoes`.
- **Seed**: `seed.ts` tem passos numerados; o número do último passo aplicado fica em `definicoes.seedPasso`. Assim se acrescentam dados iniciais em etapas posteriores sem duplicar.
- **Lembrete de cópia**: se nunca houve cópia, conta desde a primeira utilização (`definicoes.primeiraUtilizacao`).
- **Importar cópia JSON** substitui todos os dados (com confirmação), não faz fusão.
- **Campanha** = ano civil.
- **Formatação de milhares**: segue o `Intl` pt-PT, que só agrupa a partir de 5 dígitos (1234,50 € mas 12 345,50 €).
- **`npm audit`**: avisos moderados/baixos em `glob`/`minimatch` vêm do `workbox-build` (só no build, não chegam ao browser).
  Não aplicar `npm audit fix --force` (faz downgrade do `vite-plugin-pwa`).
- **Apagar setor com registos**: avisa quantos registos/análises/entregas tem; esses registos ficam e aparecem como «(setor apagado)».
- **Registo obrigatório de tratamentos** (Lei n.º 26/2013): campos obrigatórios = produto comercial, n.º APV, substância ativa,
  inimigo/alvo, dose + unidade, área tratada, aplicador, n.º de aplicador habilitado, equipamento (+ data e setor/cultura).
  IS é opcional (nem todos os produtos têm). A quantidade total de produto é calculada (`quantidadeTotalProduto`).
  Página «Registo de tratamentos» (`#/registos/tratamentos`): tabela por campanha, imprimir/PDF (A4 horizontal) e CSV.
  Confirmar a lista de campos com a DRAP/DGAV se surgirem exigências novas.
- **Campos por tipo**: definidos em `lib/camposRegisto.ts` (`CAMPOS`); o formulário é gerado a partir daí.
  `lembrar: true` pré-preenche com o último registo do mesmo tipo (aplicador, n.º e equipamento).
- **Área tratada** começa igual à área do setor ("Toda a exploração" = soma das áreas).
- **Números com ponto**: um único ponto é decimal ("1.25" = 1,25); vários pontos são milhares ("1.234.567").
- **CSV geral** usa as mesmas colunas do CSV de importação da app anterior (simétrico com a etapa 6).
- **Intervalo de segurança a decorrer**: pode colher a partir de data + IS + 1 dia; está a decorrer enquanto hoje < essa data.
  Por setor vale a data mais tardia; um tratamento em «Toda a exploração» conta para todos os setores (`lib/intervaloSeguranca.ts`).
- **Indicadores**: kg colhidos = registos de Colheita; m³ = registos de Rega; custo/ha = custos lançados ÷ área total dos setores.
- **Formulários genéricos**: `lib/formulario.ts` (definições + conversão texto↔valores) e `componentes/CamposFormulario.tsx`.
- **Análises**: valores "<4" (abaixo do limite) e "n.d." guardam-se em `qualificadores` (chave do parâmetro → '<' | 'nd');
  nos gráficos, '<' aparece como marcador oco no limite e 'n.d.' não aparece. Dados iniciais = passo 2 do seed.
- **Interpretação**: textura USDA (nomes pt), classe de pH (LQARS), risco de entupimento Fe/Mn/pH (Nakayama & Bucks 1986)
  e salinidade CE (Ayers & Westcot, FAO 29). Não interpretamos P/K/MO (as classes dependem do método do laboratório).
- **Gráficos**: SVG próprio (`componentes/GraficoLinhas.tsx`, `lib/escala.ts`), sem biblioteca. Cores das séries
  `--serie-1` (azul) e `--serie-2` (laranja), validadas para daltonismo e contraste nos dois temas.
- **Git**: commit + `git push -u origin master` no fim de cada etapa.
- **Verificação manual**: `npm run build && npm run preview` e abrir no browser (o service worker só existe no build).

## Preparar para o futuro (não implementado)
- **Sincronização Supabase**: implementar em `repositorio.ts` (ou um `sincronizacao.ts` chamado por ele).
  Usar `atualizadoEm` + `id` UUID para resolução "última escrita ganha"; acrescentar `apagadoEm` (soft delete) quando se implementar.
- **Progrés Agrónic 2518**: importar volumes regados (CSV/exportação do controlador) para registos do tipo "Rega".
- **Alertas por grau-dia**: usar temperaturas diárias da Open-Meteo (já em cache no módulo Clima) e somar graus-dia acima do limiar de cada praga.

## Estado das etapas
1. [x] Projeto base, CLAUDE.md, git, PWA, navegação, camada de dados e backup JSON
2. [x] Setores e Caderno de campo, com testes
3. [x] Resumo da campanha, testes do intervalo de segurança
4. [x] Solo e água, dados iniciais e gráficos
5. [ ] Vendas e Clima
6. [ ] Importação CSV, revisão, build, README
