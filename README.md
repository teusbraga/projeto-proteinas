# 💪 ProteinPrice

<div align="center">

  ![ProteinPrice Cover](https://img.shields.io/badge/ProteinPrice-v1.3.0-ff6b4a?style=for-the-badge&logo=target&logoColor=white)
  ![Status](https://img.shields.io/badge/STATUS-PRODUÇÃO%20ESTÁVEL-success?style=for-the-badge)
  ![License](https://img.shields.io/badge/LICENSE-MIT-blue?style=for-the-badge)
  ![I18n](https://img.shields.io/badge/I18N-PT--BR%20%7C%20EN--US-orange?style=for-the-badge)

  <br />

  <h3>A proteína mais barata da sua cidade, rankeada pela comunidade.</h3>
  <p><em>The most cost-effective protein in your city, ranked by the community.</em></p>

  <p align="center">
    Uma calculadora inteligente de custo-benefício nutricional que ajuda você a economizar enquanto bate suas metas de macronutrientes.
  </p>

  <p align="center">
    <a href="https://proteinpriceapp.vercel.app"><strong>🌐 Acessar Aplicação Online / Live Demo »</strong></a>
    <br />
    <a href="#-funcionalidades">Funcionalidades</a> •
    <a href="#-tecnologias">Tecnologias</a> •
    <a href="#-arquitetura-e-segurança">Arquitetura</a> •
    <a href="#-como-rodar-localmente">Como Rodar</a> •
    <a href="#-english-version">English Version 🇺🇸</a> •
    <a href="./DOCS_V1.md">Docs Técnicos (v1.0)</a>
  </p>

</div>

---

## 🇧🇷 Português

### 🎯 Sobre o Projeto

O **ProteinPrice** nasceu para responder de forma precisa a uma dúvida clássica de quem faz dieta ou treina:  
> *"Qual alimento está me entregando mais proteína de verdade pelo menor preço?"*

Muitas vezes pagamos caro por embalagens chamativas sem perceber que o custo real por grama de proteína é desvantajoso. Com o **ProteinPrice**, você insere o preço, o peso do produto, a porção e a quantidade de proteína da tabela nutricional — a aplicação calcula o valor real por grama de proteína e publica em um **ranking colaborativo com geolocalização no mapa comunitário**.

---

### ✨ Funcionalidades Principais

- ⚡ **Calculadora em Tempo Real**: Veja o custo exato por grama de proteína enquanto digita os valores.
- 🌍 **Ranking Global Comunitário**: Descubra as opções mais econômicas cadastradas por usuários em tempo real via WebSockets (Supabase Realtime).
- 👤 **Modo Visitante & Meu Ranking (Offline/LocalStorage)**: Cadastre produtos sem login para comparar seus alimentos; seus dados são salvos localmente com regras anti-duplicidade.
- 🔄 **Sincronização na Nuvem**: Ao fazer login com o Google, sincronize seus produtos locais com o banco de dados em um clique.
- 💰 **Suporte Multi-Moeda**: Alterne e registre alimentos em **BRL (R$)**, **USD ($)** e **EUR (€)**.
- 🌓 **Alternador de Tema (Dark Mode & Light Mode)**: Alterne instantaneamente entre o tema Clean Claro (fundo branco com acentos laranja/salmão) e o Dark Mode elegante, com persistência no navegador e adaptação dinâmica dos estilos do Mapbox.
- 🌐 **Suporte Bilíngue (Português & Inglês)**: Interface internacionalizada com botão de idioma no topo e menu lateral (PT-BR / EN-US).
- 📍 **Mapa Comunitário Interativo com Destaque Dourado**:
  - Exibição dos últimos pontos de compra cadastrados no feed.
  - Alfinete com **coroa dourada** para a proteína mais barata.
  - **Zoom adaptativo**: exibe pontos compactos quando afastado e badges de preço detalhados ao aproximar.
- 🔍 **Filtro Avançado por Cidade**: Autocomplete geográfico inteligente integrado ao Mapbox Geocoding.
- 📏 **Filtro por Proximidade GPS ("Perto de mim")**: Localize produtos em raios de **5, 10, 25, 50 ou 100 km** calculados via fórmula de Haversine.
- 🥩 **Filtro por Categoria**: Alterne facilmente entre proteínas **Animais** e **Vegetais**.
- 📅 **Regra de Validade (30 dias)**: O ranking público prioriza produtos recentes, evitando preços defasados.
- 🔐 **Autenticação Segura com Google**: Login rápido via OAuth 2.0 com fluxo moderno **PKCE**.
- 📸 **Upload Otimizado de Fotos**: Imagens comprimidas no navegador (Canvas API) antes do upload, com remoção automática de fotos órfãs na exclusão do produto.
- 📱 **Interface Mobile First**: Header flutuante, menu lateral em gaveta (Drawer), botão flutuante FAB (`+`) e modais responsivos.

---

### 🚀 Tecnologias Utilizadas

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend** | Vanilla JS (ES Modules) + HTML5 + CSS3 | Sem overhead de frameworks, carregamento instantâneo e bundle enxuto |
| **Build Tool** | [Vite](https://vitejs.dev/) | Bundler ultrarrápido com lazy loading dinâmico de dependências pesadas |
| **Backend & DB** | [Supabase](https://supabase.com/) | PostgreSQL 15, Auth GoTrue, Storage e Realtime PubSub |
| **Mapas & Geocoding** | [Mapbox GL JS](https://www.mapbox.com/) + Geocoder | Mapas vetoriais fluidos carregados sob demanda (~63 KB de bundle inicial) |
| **Identidade** | [Google Cloud OAuth 2.0](https://cloud.google.com/) | Autenticação social segura com fluxo PKCE |
| **Hospedagem** | [Vercel](https://vercel.com/) | Deploy automatizado a cada commit na branch `main` |

---

### 🛡️ Arquitetura & Segurança

- **Cálculo Imutável no PostgreSQL**: A coluna `price_per_g_protein` é gerada como `GENERATED ALWAYS AS` no banco. Nenhuma requisição consegue adulterar a conta matemática.
- **Row Level Security (RLS)**:
  - Leitura pública de produtos ativos dos últimos 30 dias.
  - Escrita, atualização e exclusão restritas ao proprietário do registro (`auth.uid() = user_id`).
- **Autenticação PKCE**: Sem tokens sensíveis expostos no hash (`#`) da URL e com redirecionamento travado no domínio canônico de produção.
- **Limpeza no Storage**: Deleção de produtos remove fisicamente a foto associada no Supabase Storage.

---

### 💻 Como Rodar Localmente

#### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- Git instalado

#### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/teusbraga/projeto-proteinas.git
   cd projeto-proteinas
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env.local` na raiz do projeto (baseie-se no `.env.example`):
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica
   VITE_MAPBOX_TOKEN=seu_token_publico_do_mapbox
   ```

4. **Configure o Banco de Dados (Supabase SQL Editor):**
   Execute sequencialmente os scripts localizados na pasta `supabase/`:
   1. `schema.sql` (Estrutura base, tabelas, RLS e bucket de fotos)
   2. `v1.1_migration.sql` (Tabela de pins e regras de data)
   3. `v1.2_currency_city.sql` (Coluna de moedas e índices de performance)

5. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:5173` no seu navegador!

---

### 🗺️ Estrutura de Pastas

```text
projeto-proteinas/
├── src/
│   ├── ui/
│   │   ├── modal.js          # Controle dos modais de mapa e formulário
│   │   ├── ranking.js        # Renderização do ranking global, pessoal e listas
│   │   └── toast.js          # Notificações contextuais na tela
│   ├── auth.js               # Sessão e login OAuth Google com PKCE
│   ├── calculator.js         # Lógica matemática de custo por grama e moedas
│   ├── i18n.js               # Internacionalização (dicionários e alternador PT/EN)
│   ├── localRanking.js       # Gerenciamento de dados no LocalStorage (Modo Visitante)
│   ├── main.js               # Orquestrador central e eventos da aplicação
│   ├── map.js                # Mapbox GL com lazy-loading e mapa comunitário
│   ├── products.js           # Consultas Supabase DB, Storage e Realtime
│   ├── supabase.js           # Inicialização do cliente Supabase
│   ├── theme.js              # Gerenciador de tema (Light/Dark mode)
│   └── utils.js              # Compressão Canvas, Haversine KM e sanitização
├── styles/
│   └── main.css              # Design system completo (tokens, claro, escuro e responsivo)
├── supabase/
│   ├── schema.sql            # DDL inicial, RLS, Storage e triggers
│   ├── v1.1_migration.sql    # Migração v1.1 (store_pins e view 30 dias)
│   └── v1.2_currency_city.sql# Migração v1.2 (suporte multi-moeda e índices)
├── index.html                # Estrutura HTML semântica com tags i18n
├── DOCS_V1.md                # Documentação arquitetural original v1.0
└── package.json              # Dependências e scripts
```

---

<div id="-english-version"></div>

## 🇺🇸 English Version

### 🎯 About The Project

**ProteinPrice** was created to answer the most common question for fitness enthusiasts, athletes, and budget-conscious individuals:  
> *"Which food actually gives me the highest amount of real protein for the lowest price?"*

Often, fancy labels deceive consumers into paying high prices for minimal protein content. With **ProteinPrice**, you simply enter the price, total product weight, portion size, and protein per portion from the nutrition facts label. The application computes the actual cost per gram of pure protein and publishes it to a **community-driven ranking with interactive map geolocation**.

---

### ✨ Key Features

- ⚡ **Real-Time Protein Calculator**: Instant calculation of cost per gram of protein as you type.
- 🌍 **Community Global Ranking**: Real-time collaborative leaderboard powered by WebSockets (Supabase Realtime).
- 👤 **Guest Mode & Personal Ranking (Offline/LocalStorage)**: Save and evaluate products without signing in; data is stored locally with anti-duplication safeguards.
- 🔄 **Cloud Synchronization**: Easily sync locally saved items to your Supabase account upon logging in with Google.
- 💰 **Multi-Currency Support**: Compare and add products in **BRL (R$)**, **USD ($)**, and **EUR (€)**.
- 🌓 **Theme Switcher (Dark & Light Mode)**: Seamless toggle between the modern Clean Light theme and a sleek Dark Mode, persisting your preference and updating Mapbox styles dynamically.
- 🌐 **Bilingual Internationalization (Portuguese & English)**: Complete UI translation with language switches in the header and mobile navigation drawer.
- 📍 **Interactive Community Map with Gold Crown Winner**:
  - Live feed map displaying up to 100 recent community pins.
  - Special **gold crown badge** highlighting the best cost-benefit protein in town.
  - **Adaptive zoom**: compact dots on overview zoom, rich price badges on close-up zoom.
- 🔍 **Smart City Filter with Autocomplete**: Instant search suggestions backed by Mapbox Geocoding.
- 📏 **GPS Proximity Filter ("Near Me")**: Filter options within **5, 10, 25, 50, or 100 km** radii using the Haversine distance formula.
- 🥩 **Category Filtering**: Effortlessly toggle between **Animal** and **Plant** proteins.
- 📅 **30-Day Freshness Window**: Automatic filtering to prioritize fresh store prices and discard obsolete listings.
- 🔐 **Secure Google Authentication**: Modern OAuth 2.0 with **PKCE** flow.
- 📸 **Client-Side Image Compression**: Photos are optimized in-browser via the HTML5 Canvas API before uploading, and orphan photos are automatically removed from Storage upon deletion.
- 📱 **Mobile-First UX**: Floating header, slide-out drawer menu, FAB quick-add button (`+`), and modal dialogs.

---

### 🚀 Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | Vanilla JS (ES Modules) + HTML5 + CSS3 | Zero framework bloat, fast load times, minimal payload |
| **Bundler** | [Vite](https://vitejs.dev/) | High-speed bundler featuring dynamic code-splitting |
| **Backend & Database** | [Supabase](https://supabase.com/) | PostgreSQL 15, GoTrue Auth, Storage, and Realtime |
| **Maps & Geocoding** | [Mapbox GL JS](https://www.mapbox.com/) | Fluid vector maps loaded on-demand (~63 KB initial bundle) |
| **Authentication** | [Google Cloud OAuth 2.0](https://cloud.google.com/) | Social sign-in using secure PKCE flow |
| **Deployment** | [Vercel](https://vercel.com/) | Automated CI/CD deployments triggered on `main` push |

---

### 💻 Running Locally

#### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+)
- Git

#### Step-by-Step

1. **Clone repository:**
   ```bash
   git clone https://github.com/teusbraga/projeto-proteinas.git
   cd projeto-proteinas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory (based on `.env.example`):
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_MAPBOX_TOKEN=your_mapbox_token
   ```

4. **Database Setup (Supabase SQL Editor):**
   Run the SQL scripts located in the `supabase/` folder in order:
   1. `schema.sql` (Tables, RLS policies, and Storage buckets)
   2. `v1.1_migration.sql` (Map pins and 30-day view)
   3. `v1.2_currency_city.sql` (Currency column and indexing)

5. **Start Dev Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser!

---

## 🤝 Como Contribuir / Contributing

1. Faça um **Fork** do projeto (*Fork the repository*)
2. Crie sua branch de feature (*Create your feature branch*): `git checkout -b feature/MyFeature`
3. Faça o commit das mudanças (*Commit your changes*): `git commit -m 'feat: Add MyFeature'`
4. Faça o push para a branch (*Push to the branch*): `git push origin feature/MyFeature`
5. Abra um **Pull Request** (*Open a Pull Request*)

---

<div align="center">
  <sub>Desenvolvido com foco em nutrição, economia e tecnologia por <a href="https://github.com/teusbraga">Mateus Braga</a>.</sub>
</div>
