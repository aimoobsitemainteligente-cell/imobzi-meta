# 🏢 ASN Leads — Integração Meta Lead Ads x Imobzi CRM

Solução completa, moderna e resiliente para captura, enriquecimento e envio automático de leads gerados em anúncios do **Meta (Facebook & Instagram Lead Ads)** diretamente para a esteira e linha do tempo do **CRM Imobzi**, com persistência em nuvem no **Neon PostgreSQL** e painel de controle administrativo seguro.

---

## 🌟 Visão Geral do Sistema

A aplicação atua como um hub inteligente entre o ecossistema de anúncios da Meta e o CRM Imobzi da ASN Negócios Imobiliários:

```mermaid
flowchart LR
    A[Meta Lead Ads\nFacebook / Instagram] -->|Webhook / Graph API v22.0| B[Next.js 16 Hub\nAPI Routes / Engine]
    B -->|Persistência em Nuvem| C[(Neon PostgreSQL\nServerless Pooler)]
    B -->|API Nativa /v1/integration/lead| D[Imobzi CRM\nRodízio & Linha do Tempo]
    B <--->|Visualização Unificada| E[Dashboard Administrativo\nAutenticado & Seguro]
```

---

## 🚀 Funcionalidades Principais

### 1. ⚡ Webhook em Tempo Real & Graph API v22.0
- **Verificação Automática de Subscrição:** Endpoint `/api/webhook/meta` pronto para validação de `hub.challenge` e `hub.verify_token`.
- **Captura Instantânea de Leads:** Notificação imediata a cada novo lead gerado.
- **Dual-Mode Resiliente:** Busca enriquecida com campanha/anúncio para leads reais de tráfego pago e fallback automático para formulários de teste (evitando o erro `subcode: 33` da Graph API).

### 2. 🧠 Auto-Mapeamento Universal & Perfil Inteligente
- Reconhece e extrai automaticamente variações de contato: `nome_completo`, `full_name`, `phone_number`, `telefone`, `email`, etc.
- Extração inteligente de **Código de Imóvel** (`clientListingId`) para vincular o lead diretamente à ficha do imóvel no Imobzi.
- Geração automática da seção **Perfil Inteligente** e **Respostas do Formulário** na linha do tempo do contato no CRM.

### 3. 💾 Persistência em Nuvem com Neon PostgreSQL
- Tabela `meta_leads` com pooling serverless (`@neondatabase/serverless`).
- Armazenamento de todos os leads recebidos com payload bruto, notas formatadas, dados de formulário, campanha e status.
- Resiliência operacional: garante que nenhum lead seja perdido, mesmo em caso de instabilidades pontuais em APIs externas.

### 4. 🔄 Histórico Unificado em Tempo Real (Sincronização Tripla)
O painel de controle sincroniza e exibe os leads a partir de 3 fontes integradas:
1. **Neon PostgreSQL:** Registros persistidos e processados pelo webhook.
2. **Meta Graph API:** Varredura em tempo real dos leads existentes em todos os formulários ativos da página.
3. **Imobzi CRM:** Contatos recentemente cadastrados no CRM.

### 5. 🛡️ Segurança & Barreira de Autenticação
- **Acesso Restrito:** Todas as páginas e rotas internas protegidas por Middleware do Next.js.
- **Sessão Segura:** Autenticação baseada em cookies `HTTP-Only`, `SameSite=Lax` com tokens criptográficos assinados.
- **Acesso:** Login administrativo protegido para corretores e gestores da imobiliária.

### 6. 🎛️ Painel de Controle Administrativo (Dashboard)
- **Cópia Rápida de Webhook:** Exibe a URL de Retorno e Token de Verificação para configuração instantânea no Meta for Developers.
- **Mapeamento Visual de Campos:** Configuração de regras de perguntas personalizadas e origem do lead.
- **Simulador de Envio:** Disparo de leads de teste para o Imobzi com 1 clique.
- **Catálogo de Formulários Meta:** Listagem de todos os formulários ativos da página com ID, status e botão de teste.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend & Backend** | [Next.js 16 (App Router)](https://nextjs.org/) | Framework Fullstack React com Turbopack |
| **Linguagem** | [TypeScript 5](https://www.typescriptlang.org/) | Tipagem estática rigorosa e contratos de dados |
| **Banco de Dados** | [Neon PostgreSQL](https://neon.tech/) | Banco de dados serverless em nuvem com Pooling |
| **Driver de Conexão** | `@neondatabase/serverless` | Driver otimizado para ambientes Serverless/Edge |
| **Estilização** | Tailwind CSS | Design moderno, responsivo com suporte a Dark Mode |
| **Meta Integration** | Meta Graph API v22.0 | Leadgen Webhooks & Endpoints de Formulários |
| **CRM Integration** | Imobzi API v1.0 | Endpoint `/v1/integration/lead` para esteira e rodízio |
| **Hospedagem** | [Vercel](https://vercel.com/) | Deploy contínuo integrado ao GitHub |

---

## ⚙️ Variáveis de Ambiente

Crie ou configure as seguintes variáveis no arquivo `.env.local` (local) e no painel da **Vercel** (produção):

```env
# Meta Graph API
META_VERIFY_TOKEN=imobzimetatoken2026
META_ACCESS_TOKEN=EAAOd0a2xIuUBSY6... (Token de Acesso da Página)
META_PAGE_ID=923277277786867

# Imobzi CRM
IMOBZI_API_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX... (Segredo JWT da API Imobzi)

# Proteção do Dashboard
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=asn2026
SESSION_SECRET=asn_meta_imobzi_secret_session_key_983742918472918237

# Neon Database PostgreSQL
DATABASE_URL=postgresql://neondb_owner:SENHA@ep-winter-bird-ac9dzn8f-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## 🚀 Como Executar Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/aimoobsitemainteligente-cell/imobzi-meta.git
   cd imobzi-meta
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

4. **Credenciais de acesso:**
   - **Usuário:** `admin`
   - **Senha:** `asn2026`

---

## 🌐 Configuração do Webhook no Meta for Developers

Para conectar novos anúncios e formulários à aplicação:

1. Acesse o [Meta for Developers](https://developers.facebook.com/apps/) e selecione o aplicativo **imobzi-leads** (ID `1017948817924837`).
2. No menu lateral, navegue até **Webhooks > Page**.
3. Configure a inscrição no campo **leadgen**:
   - **URL de Retorno de Chamada (Callback URL):**
     ```text
     https://imobzi-meta.vercel.app/api/webhook/meta
     ```
   - **Token de Verificação (Verify Token):**
     ```text
     imobzimetatoken2026
     ```
4. Clique em **Verificar e Salvar**.
5. Certifique-se de que a Página **ASN Negócios Imobiliários** esteja inscrita no aplicativo.
6. Teste através da ferramenta oficial: [Meta Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing).

---

## 📚 Documentação Técnica Adicional

Para entender a arquitetura completa, diagramas de fluxo de dados, contratos de API e runbook de manutenção, consulte o arquivo:
- 📖 [DETALHAMENTO_TECNICO.md](file:///c:/Users/wesley/.gemini/antigravity-ide/scratch/imobzi-meta/DETALHAMENTO_TECNICO.md)

---

## 📄 Licença e Direitos

Propriedade exclusiva de **ASN Negócios Imobiliários**. Todos os direitos reservados © 2026.
