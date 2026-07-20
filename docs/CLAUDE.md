# CLAUDE.md

## Projeto
Plataforma web multi-tenant de disparos de WhatsApp. Migração do MVP (construído no Lovable) para um novo build via Claude Code.

Especificação completa: @docs/PRD-Plataforma-Disparos-WhatsApp-v2.md

## Princípio arquitetural (o mais importante)
O app é uma **ponte de coleta, governança e estado** — não uma camada de execução.
- O app NUNCA chama a API da Infobip para enviar mensagens.
- O app NUNCA se integra diretamente ao ClickUp.
- Toda lógica de automação, formatação de mensagem, disparo real e notificação da equipe vive no **n8n**, fora do app.
- O app só se comunica com o n8n em duas direções:
  1. **Saída:** emite webhooks para o n8n a cada evento relevante (ver catálogo abaixo).
  2. **Entrada:** recebe callbacks do n8n via API autenticada por token de serviço, para atualizar status de campanha e ingerir relatórios.

Se alguma tarefa pedir para "chamar a Infobip" ou "chamar o ClickUp" diretamente do app, isso é sinal de que a tarefa está fora do escopo do app — a lógica pertence ao n8n.

## Papéis e hierarquia
| Papel | Quem é | Escopo |
|---|---|---|
| `superadmin` | ATX/BluePrint (dono da plataforma) | Global — todas as organizações |
| `admin` | Ex.: VisionUp (gestor de uma organização) | Sua própria organização |
| `cliente` | Clientes finais do admin (ex.: clientes da VisionUp) | Suas próprias campanhas |

Regras de permissão chave:
- Só `admin` e `superadmin` aprovam/rejeitam campanhas, registram pagamento e liberam campanhas.
- Só `superadmin` cria/gerencia organizações e configura endpoints de webhook.
- `cliente` só cria e edita as próprias campanhas/templates/listas de contatos.
- Roles vivem em `profiles.role`, nunca em metadata do `auth.users`.

## Ciclo de vida de uma campanha
```
rascunho → aguardando aprovação → aprovado → (pagamento registrado, em paralelo)
  → liberado → enviando (callback n8n) → concluído (callback n8n)
                                       ↘ rejeitado (com motivo)
                                       ↘ falha (callback n8n)
```
- Pagamento é um controle paralelo — **não** bloqueia liberação (premissa a confirmar, ver PRD seção 9).
- `campaign_released` é o evento que entrega ao n8n tudo que ele precisa (template renderizado + lista de contatos) para executar o disparo.

## Catálogo de webhooks (saída, app → n8n)
Todo evento relevante precisa emitir um webhook. Lista completa em @docs/PRD-Plataforma-Disparos-WhatsApp-v2.md seção 4.4. Os principais:
`client_created/updated/deleted`, `organization_created/updated`, `template_created/updated`, `template_set_as_default`, `campaign_created`, `campaign_submitted_for_approval`, `campaign_approved`, `campaign_rejected`, `campaign_payment_registered`, `campaign_released`, `campaign_sending_started`, `campaign_completed`, `campaign_failed`, `campaign_report_added`, `contact_list_uploaded`, `contact_list_validated`.

Payload mínimo: `event`, `campaign_id` (quando aplicável), `organization_id`, `actor` (id + papel), `timestamp`, `data`.

## API de entrada (n8n → app)
- `POST /api/campaigns/{id}/status` — atualiza status (`enviando`, `concluído`, `falha`).
- `POST /api/campaigns/{id}/report` — ingestão automática de relatório/métricas.
- Autenticados por token de serviço dedicado, não pelo login do usuário. Devem ser idempotentes.

## Relatórios de disparo
Duas formas de entrada, mesmo schema (`campaign_reports`):
- **Automática:** callback do n8n após consumir o relatório da Infobip.
- **Manual:** upload de CSV/XLSX pelo admin/superadmin, com parsing e validação de colunas.

## Modelo de dados (tabelas-chave)
`organizations`, `profiles` (role, organization_id), `templates` (+ `is_default`, `use_variations`), `message_variations` (catálogo do "Variar Texto"), `contact_lists` (+ `total_contacts`/`valid_contacts`/`invalid_contacts` — agregados calculados no parse; o CSV original fica só no Storage, **sem** tabela `contacts` linha a linha — inchava o banco sem nenhum consumidor real), `campaigns` (sem campos de pagamento — removido do MVP), `campaign_reports`, `webhook_configs` (+ segredo HMAC), `webhook_deliveries` (log/retry), `audit_log`.

## Segurança (não negociável)
- RLS ativa em todas as tabelas `public.*`, com policies por `organization_id` (admin) e por autor (cliente).
- Função `has_role` com `SECURITY DEFINER` para evitar recursão de RLS.
- Webhooks de saída assinados com HMAC.
- Autorização sempre validada pelo perfil do chamador no banco — nunca confiar em dado vindo do body da requisição.

## Stack
- Frontend: [definir — reaproveitar TanStack Start + React do MVP ou migrar para Next.js]
- Backend/dados: Supabase (Postgres + Auth + Storage + Edge Functions/API routes)
- Automação: n8n (externo)
- Disparo: Infobip (só via n8n)
- Notificação interna: ClickUp (só via n8n)
- UI: Tailwind + shadcn/ui + Radix + lucide-react

## Nomenclatura (usar exatamente estes termos na UI)
- "Campanha" (não usar "Disparo" ou "Demanda")
- "Mídia" (não "Cabeçalho") para o campo de imagem/vídeo/documento do template
- "Texto" (não "Corpo") para o copy da mensagem
- Status: "Aguardando aprovação", "Liberado", "Pagamento registrado", "Pagamento pendente"

## Convenções e regras gerais
- Idempotência obrigatória nos endpoints chamados pelo n8n.
- Toda ação sensível (aprovação, rejeição, pagamento, ingestão manual de relatório) grava em `audit_log`.
- Retry com backoff para entrega de webhooks é requisito de MVP, não item futuro.
- pt-BR fixo em toda a interface.

## Evitar
- Não implementar chamadas diretas à API de envio da Infobip dentro do app.
- Não implementar integração direta com ClickUp dentro do app.
- Não misturar cor hardcoded (`bg-white`, hex) — usar sempre os tokens semânticos do tema.
- Não assumir que pagamento bloqueia liberação sem confirmar antes (ver PRD seção 9).

## Itens em aberto (confirmar antes de implementar)
Ver seção 9 do PRD — inclui: regra de bloqueio por pagamento, estrutura exata do template padrão, formato de entrega da lista de contatos no evento `campaign_released` (payload vs. URL assinada), regra de priorização Baixa/Média/Alta, escopo de onde ficam as credenciais Infobip, e se multi-tenant além da VisionUp é necessário já no MVP.