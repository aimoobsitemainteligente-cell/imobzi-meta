---
name: meta-leads-source-of-truth
description: Contexto sobre a arquitetura de dados e por que a Planilha do Google é a "Fonte de Verdade" para Leads do Meta Business. Use sempre que for modificar a ingestão, os painéis da TV ou o banco de dados.
---

# Fluxo de Dados e Fonte de Verdade (Leads Meta)

Devido a processos internos e adoção dos corretores (que dão mais atenção à planilha do que ao CRM), **a Planilha do Google é considerada a FONTE DE VERDADE absoluta e primária para todos os leads originados do Meta Business**.

Qualquer nova funcionalidade, painel ou painel de TV (Dashboard) **DEVE** respeitar o seguinte fluxo arquitetural:

### 1. Ingestão (Webhook)
- **Onde:** \`/api/webhook/meta\` e \`/api/webhook/route.ts\`
- **Como funciona:** O webhook recebe os leads da Meta, limpa/formata o telefone e envia diretamente para o Imobzi CRM e **adiciona uma nova linha na Planilha do Google**.

### 2. Tratamento Humano
- **Onde:** Planilha do Google.
- **Como funciona:** Os corretores atualizam a planilha com o \`Estágio\` (ex: Liguei, Atendeu, Visita, Proposta, Ganho) e preenchem o \`Tempo de Resposta\`. Esta edição manual na planilha tem precedência sobre o status dentro do próprio Imobzi CRM para leads do Meta.

### 3. Sincronização e Armazenamento (Banco de Dados Neon)
- **Onde:** \`/api/tv/sync/route.ts\` -> \`src/lib/db.ts (tv_leads)\`
- **Como funciona:** Um script de sync (\`/api/tv/sync\`) puxa **TODAS** as linhas da Planilha através do Google Sheets API (\`getSheetsData\`). 
- Os dados sofrem *parse* (as datas de `DD/MM/YYYY` viram padrão ISO 8601).
- Os leads são injetados no banco de dados Postgres da Neon (tabela \`tv_leads\`). 
- Apenas leads do Meta que não estão na planilha são buscados do Imobzi.

### 4. Visualização (Painel da TV)
- **Onde:** \`/tv\` (\`tv-shell.tsx\`, \`Funnel.tsx\`, etc).
- **Como funciona:** A TV consome do banco de dados Neon (\`/api/tv\`), não diretamente da planilha, para ser rápido.
- O Dashboard da TV agrega e conta etapas de funil (*Entraram, Atendidos, Qualificados, Visitas, Propostas, Fecharam*) e exibe filtros dinâmicos de período (Hoje, Semana, Mês, Trimestre, Todo Período) e funil (Geral vs Meta Business).

### Regras Ouro (Golden Rules) ao Codificar:
- **NUNCA** mude o funil da TV para consultar o Imobzi CRM em vez da planilha no caso de leads do Meta.
- Ao atualizar esquemas de banco de dados (ex: Neon DB), lembre-se que os campos vindo da planilha podem ser extensos (ex: corretores fazem anotações longas no \`estágio\`). Sempre use colunas como \`TEXT\` no PostgreSQL em vez de limitadores como \`VARCHAR(100)\` para os campos descritivos.
- **Tempo de Resposta**: É calculado cruzando a data de criação (\`created_at\`) do webhook versus a data de \`primeiro_contato_data\` anotada pelo corretor na planilha.
