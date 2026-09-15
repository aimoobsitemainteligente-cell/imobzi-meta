# Integração Meta Lead Ads x Imobzi CRM

Solução completa e automatizada para captura, enriquecimento e envio de leads gerados em anúncios do **Meta (Facebook & Instagram Lead Ads)** diretamente para o **CRM Imobzi**.

---

## 🚀 Funcionalidades Principais

- ⚡ **Webhook em Tempo Real**: Recebe notificações instantâneas do Meta Graph API (v22.0) a cada novo formulário preenchido.
- 🧠 **Auto-Mapeamento Universal & Perfil Inteligente**:
  - Reconhece e mapeia automaticamente variações de campos de contato (`nome_completo`, `full_name`, `phone_number`, `email`, etc.).
  - Extrai código do imóvel (`clientListingId`) a partir de perguntas como *"Código do Imóvel"*, *"Referência"* ou respostas em formulários.
  - Formata respostas adicionais (faixa de renda, urgência, preferências) na seção **Perfil Inteligente** e notas da linha do tempo.
- 🏢 **Integração Oficial Imobzi**:
  - Envio nativo via endpoint `POST https://api.imobzi.app/v1/integration/lead`.
  - Respeita o **rodízio automático de corretores** e regras da esteira de leads do Imobzi.
- 🖥️ **Painel de Controle (Dashboard)**:
  - **Mapeamento de Campos**: Interface visual para configurar como cada pergunta do Meta deve ser tratada.
  - **Simulador & Testes**: Envio de leads de teste diretamente para o Imobzi com 1 clique para validação.
  - **Histórico de Leads**: Registro completo de todos os leads processados com status e link direto.
  - **Sincronização de Formulários**: Detecção e listagem dos formulários ativos na Página do Facebook.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend & Backend**: [Next.js 16 (App Router)](https://nextjs.org/) + TypeScript
- **Estilização**: Tailwind CSS (Dark Mode, Glassmorphism)
- **Integrações de API**:
  - Meta Graph API v22.0 (Leadgen Webhooks & Forms)
  - Imobzi REST API v1.0
- **Túnel Seguro**: Cloudflare Tunnel (para expor o webhook HTTPS localmente)

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com base no `.env.example`:

```env
# Meta Graph API
META_VERIFY_TOKEN=sua_senha_secreta_de_verificacao
META_ACCESS_TOKEN=seu_token_de_acesso_do_sistema_ou_usuario
META_PAGE_ID=923277277786867

# Imobzi CRM
IMOBZI_API_SECRET=seu_token_de_api_do_imobzi
```

> ⚠️ **Importante**: Nunca envie seu `.env.local` para o GitHub. O arquivo já está configurado no `.gitignore`.

---

## 📦 Como Executar

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

3. **Exponha o Webhook via Cloudflare Tunnel (Opcional para ambiente local):**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Configure a URL gerada (`https://.../api/webhook/meta`) no painel de desenvolvedores do Meta em **Webhooks > Leadgen**.

---

## 📄 Licença

Propriedade de ASN Negócios Imobiliários. Todos os direitos reservados.
