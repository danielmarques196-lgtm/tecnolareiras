# Herdade da Coroa — Gestão Agrícola

Aplicação de gestão agrícola própria para a Herdade da Coroa (pomar de romãzeiras, rega gota-a-gota a partir de dois furos).
Funciona no telemóvel e no computador, **sem mensalidade** e **sem Internet no campo**. Os dados ficam guardados no próprio
dispositivo, e tu controlas as cópias de segurança.

## O que faz

| Módulo | Para quê |
|---|---|
| **Resumo** | Indicadores da campanha (registos, tratamentos, kg colhidos, m³ regados, custos, custo/ha), setores com **intervalo de segurança a decorrer** (data a partir da qual se pode colher) e últimos registos. |
| **Registos** (caderno de campo) | Tratamentos fitossanitários, adubações/fertirrega, regas (m³, horas, H₂O₂), operações culturais, observações de pragas com fotografia e colheitas. Filtros, exportação CSV e **registo de tratamentos** pronto a imprimir/PDF para um controlo. |
| **Setores** | Área, cultura, variedade, ano de plantação, n.º de árvores, compasso. |
| **Solo e água** | Análises de solo por setor e de água por furo, gráficos de evolução, textura, pH e risco de entupimento dos gotejadores (Fe, Mn, pH, CE). |
| **Vendas** | Entregas à central fruteira (kg, calibres, quebras, preço, receita), totais e **margem por hectare e por kg**. |
| **Clima** | Previsão a 7 dias (Open-Meteo, gratuita), chuva, temperatura, ETo, e **ETo acumulada desde a última rega** de cada setor. |
| **Definições** | Cópia de segurança, importação do CSV da app anterior, dados da exploração, localização e tema claro/escuro. |

---

## 1. Correr no computador

Precisas do [Node.js](https://nodejs.org) 20 ou mais recente (versão LTS).

```bash
npm install          # só da primeira vez (instala as dependências)
npm run dev          # abre em http://localhost:5173
```

Outros comandos:

```bash
npm test             # testes automáticos
npm run build        # versão final, otimizada, na pasta dist/
npm run preview      # experimentar a versão final (com modo offline) em http://localhost:4173
```

## 2. Abrir no telemóvel na mesma rede Wi-Fi

1. No computador, corre `npm run dev`. O terminal mostra duas linhas, por exemplo:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.23:5173/
   ```
2. No telemóvel, ligado **à mesma rede Wi-Fi**, abre o endereço **Network** (`http://192.168.1.23:5173`) no Chrome ou no Safari.
3. Se não abrir, confirma que a firewall do computador aceita ligações na porta 5173.

> Assim serve para experimentar. Para **instalar a app e usá-la sem Internet no campo**, o browser exige um endereço
> seguro (`https://`). Publica-a como descrito no ponto 3. É gratuito e só tens de o fazer uma vez.

## 3. Publicar de graça para usar no campo

A app é um site estático (a pasta `dist/`). Os teus dados **não** vão para o servidor: quem abrir o endereço vê uma
app vazia, e cada dispositivo guarda os seus próprios dados.

### Opção A: GitHub Pages (já configurado neste repositório)

Endereço: **<https://danielmarques196-lgtm.github.io/tecnolareiras/>**

A cada `git push` para `master`, o GitHub Actions (`.github/workflows/publicar.yml`) corre os testes, gera a app e
publica-a no ramo `gh-pages`. Ao fim de 1 a 2 minutos o endereço tem a versão nova. Para acompanhar, vê o separador
**Actions** do repositório.

Se o endereço der erro 404 da primeira vez: no GitHub, vai a **Settings → Pages**. Em *Build and deployment*,
escolhe **Source: Deploy from a branch**, **Branch: `gh-pages`**, pasta **`/ (root)`** e carrega em **Save**.

### Opção B: Netlify

**Sem ligar ao GitHub (arrastar e largar):**
1. Corre `npm run build`.
2. Abre <https://app.netlify.com/drop> (crias conta grátis).
3. Arrasta a pasta `dist/` para a página. Recebes um endereço `https://…netlify.app`.
4. Para atualizar a app mais tarde, repete o `npm run build` e arrasta de novo.

**Ligado ao GitHub (atualiza sozinho a cada `git push`):**
1. Em <https://app.netlify.com>: **Add new site → Import an existing project → GitHub** e escolhe este repositório.
2. As definições já estão no `netlify.toml` (build `npm run build`, pasta `dist`). Carrega em **Deploy**.

### Opção C: Cloudflare Pages
1. Em <https://dash.cloudflare.com>: **Workers & Pages → Create → Pages → Connect to Git** e escolhe este repositório.
2. Framework preset: **Vite** (ou *None*). Build command: `npm run build`. Build output directory: `dist`.
3. Em **Environment variables**, junta `NODE_VERSION` = `22`. Carrega em **Save and Deploy**.
4. Recebes um endereço `https://…pages.dev`.

Depois de cada publicação nova, a app no telemóvel atualiza-se sozinha da próxima vez que a abrires com Internet.

## 4. Instalar no ecrã inicial do telemóvel

Abre o endereço `https://…` publicado e:

- **Android (Chrome):** menu **⋮** → **Instalar aplicação** (ou **Adicionar ao ecrã principal**).
- **iPhone/iPad (Safari):** botão **Partilhar** (quadrado com seta) → **Adicionar ao ecrã principal**.

A app passa a abrir como uma aplicação normal, em ecrã inteiro, e **funciona sem rede**. Para o Clima, só precisas de
Internet para atualizar a previsão; sem rede, a app mostra os últimos dados guardados.

> Em iPhone, usa sempre a app instalada no ecrã inicial. O Safari pode apagar dados de sites que não sejam abertos
> durante algumas semanas, mas não faz isso às apps instaladas.

## 5. Cópias de segurança

Os dados vivem **apenas no browser de cada dispositivo**. Se limpares os dados do browser, desinstalares a app ou perderes
o telemóvel, perdes os dados que não estejam numa cópia. Por isso:

**Fazer uma cópia:** **Definições → Exportar cópia de segurança**. É descarregado um ficheiro
`herdade-da-coroa-copia-AAAA-MM-DD.json` com tudo: setores, registos e fotografias, análises, entregas e definições.
Guarda-o fora do telemóvel (Google Drive, iCloud, e-mail para ti próprio, computador).

**Repor uma cópia:** **Definições → Importar cópia de segurança** e escolhe o ficheiro `.json`. A app pede confirmação
e **substitui todos os dados atuais** pelos da cópia. Também serve para **passar os dados para outro dispositivo**
(por exemplo, do telemóvel para o computador).

**Lembrete:** se a última cópia tiver mais de 30 dias, aparece um aviso no topo da app.

> Usa um dispositivo como principal para registar e passa os dados entre dispositivos com a cópia. Importar uma cópia
> substitui tudo, não junta os dados. A sincronização automática (Supabase) está preparada para uma versão futura.

## 6. Importar os dados da app anterior

Ver [`dados/LEIA-ME.md`](dados/LEIA-ME.md). Resumo: **Definições → Importar CSV da app anterior**. A app mostra uma
pré-visualização antes de gravar, cria os setores que faltam e não duplica registos se importares o mesmo ficheiro duas vezes.

## Para quem programa

Stack, estrutura, convenções e decisões estão no [`CLAUDE.md`](CLAUDE.md).
