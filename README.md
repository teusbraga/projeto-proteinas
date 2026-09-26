# 💪 ProteinPrice

<div align="center">

  ![ProteinPrice Cover](https://img.shields.io/badge/ProteinPrice-v1.0.0-22c55e?style=for-the-badge&logo=target&logoColor=white)
  ![Status](https://img.shields.io/badge/STATUS-PRODUÇÃO%20ESTÁVEL-success?style=for-the-badge)
  ![License](https://img.shields.io/badge/LICENSE-MIT-blue?style=for-the-badge)

  <br />

  <h3>A proteína mais barata da sua cidade, rankeada pela comunidade.</h3>

  <p align="center">
    Uma calculadora inteligente de custo-benefício nutricional que ajuda você a economizar enquanto bate suas metas de macronutrientes.
  </p>

  <p align="center">
    <a href="https://proteinpriceapp.vercel.app"><strong>🌐 Acessar Aplicação Online »</strong></a>
    <br />
    <a href="#-funcionalidades">Funcionalidades</a> •
    <a href="#-tecnologias">Tecnologias</a> •
    <a href="#-arquitetura-e-segurança">Arquitetura</a> •
    <a href="#-como-rodar-localmente">Como Rodar</a> •
    <a href="./DOCS_V1.md">Documentação Completa</a>
  </p>

</div>

---

## 🎯 Sobre o Projeto

O **ProteinPrice** nasceu para resolver uma dúvida clássica de quem faz dieta ou treina:  
> *"Qual alimento está me entregando mais proteína de verdade pelo menor preço?"*

Muitas vezes pagamos caro por embalagens chamativas sem perceber que o custo real por grama de proteína é altíssimo. Com o **ProteinPrice**, você insere o preço, o peso do produto, o tamanho da porção e a quantidade de proteína da tabela nutricional — a aplicação calcula o valor real por grama e publica em um **ranking colaborativo com geolocalização no mapa**.

---

## ✨ Funcionalidades Principais

- ⚡ **Calculadora em Tempo Real**: Veja o custo por grama de proteína enquanto digita os valores.
- 🏆 **Ranking Comunitário**: Descubra as opções mais econômicas cadastradas por outros usuários.
- 🥩 **Filtros por Categoria**: Alterne facilmente entre proteínas **Animais** e **Vegetais**.
- 📍 **Localização com Mapa Interativo**: Encontre exatamente em qual mercado, açougue ou loja o produto foi visto com **Mapbox GL**.
- 🔐 **Autenticação Segura com Google**: Login moderno e direto via OAuth 2.0 com fluxo **PKCE**.
- 📸 **Upload Otimizado de Fotos**: Fotos comprimidas diretamente no navegador (Canvas API) antes de irem para o Supabase Storage.
- 📡 **Atualizações em Tempo Real**: O ranking é sincronizado instantaneamente via WebSockets (Supabase Realtime).
- 📱 **Interface 100% Responsiva**: Experiência refinada em Dark Mode com glassmorphism tanto no celular quanto no desktop.

---

## 🚀 Tecnologias Utilizadas

A stack foi escolhida com foco em **performance extrema, zero custo inicial e alta escalabilidade**:

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend** | Vanilla JS (ES Modules) + HTML5 + CSS3 | Sem overhead de frameworks pesados, carregamento instantâneo |
| **Build Tool** | [Vite](https://vitejs.dev/) | Bundler ultrarrápido para desenvolvimento e build de produção |
| **Backend & DB** | [Supabase](https://supabase.com/) | PostgreSQL 15, Auth GoTrue, Storage e Realtime PubSub |
| **Mapas & Busca** | [Mapbox GL JS](https://www.mapbox.com/) | Mapas vetoriais fluidos e geocodificação para locais de compra |
| **Identidade** | [Google Cloud OAuth 2.0](https://cloud.google.com/) | Autenticação social com fluxo moderno PKCE |
| **Deploy & CI/CD** | [Vercel](https://vercel.com/) | Deploy automatizado a cada commit na branch `main` |

---

## 🛡️ Arquitetura & Segurança

- **Cálculo Imutável no Banco**: A coluna `price_per_g_protein` é definida como `GENERATED ALWAYS AS` no PostgreSQL. Nenhum usuário ou requisição maliciosa consegue adulterar a conta.
- **Row Level Security (RLS)**:
  - Leitura pública de produtos ativos (qualquer pessoa consulta o ranking sem login).
  - Escrita, atualização e exclusão restritas unicamente ao proprietário do registro (`auth.uid() = user_id`).
- **Autenticação PKCE**: Sem tokens sensíveis expostos no hash (`#`) da URL e redirecionamento travado no domínio canônico de produção.

> 📖 Para ver os fluxogramas, mapa mental e histórico detalhado de soluções técnicas, consulte o arquivo [DOCS_V1.md](./DOCS_V1.md).

---

## 💻 Como Rodar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- Git instalado

### Passo a Passo

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
   Crie um arquivo `.env.local` na raiz do projeto (ou copie do `.env.example`):
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica
   VITE_MAPBOX_TOKEN=seu_token_publico_do_mapbox
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

Acesse `http://localhost:5173` no seu navegador!

---

## 🗺️ Estrutura de Pastas

```text
projeto-proteinas/
├── src/
│   ├── ui/               # Componentes de interface (modal, toast)
│   ├── auth.js           # Gerenciamento de sessão e login OAuth (PKCE)
│   ├── calculator.js     # Lógica pura de cálculo e validação
│   ├── main.js           # Orquestrador central e eventos da aplicação
│   ├── map.js            # Integração com Mapbox GL e busca de endereço
│   ├── products.js       # Comunicação com Supabase DB, Storage e Realtime
│   └── supabase.js       # Inicialização e configuração do cliente Supabase
├── styles/               # Design system em Vanilla CSS (dark theme, glassmorphism)
├── supabase/
│   └── schema.sql        # Script SQL completo (tabelas, índices, triggers, RLS)
├── index.html            # Estrutura HTML semântica
├── DOCS_V1.md            # Documentação arquitetural e diário de bordo
└── package.json          # Dependências e scripts
```

---

## 🤝 Como Contribuir

Contribuições são super bem-vindas! Se você tiver uma ideia de feature, melhoria ou correção:

1. Faça um **Fork** do projeto
2. Crie uma branch para a sua feature (`git checkout -b feature/MinhaNovaFeature`)
3. Faça o commit das suas alterações (`git commit -m 'feat: Adiciona nova feature'`)
4. Faça o push para a branch (`git push origin feature/MinhaNovaFeature`)
5. Abra um **Pull Request**

---

<div align="center">
  <sub>Desenvolvido com foco em nutrição, economia e tecnologia por <a href="https://github.com/teusbraga">Mateus Braga</a>.</sub>
</div>
