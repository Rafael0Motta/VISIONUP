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
- Entre "Contatos" e a revisão final do wizard existe uma etapa opcional de **Agendamento**: o cliente pode marcar uma data/hora desejada de envio, o que grava `campaigns.scheduled_at` e dispara o webhook `campaign_scheduled` (é assim que o n8n fica sabendo pra notificar o ClickUp — o app não integra com o ClickUp direto, nem aqui). É só uma referência pra equipe se organizar; **não libera nada sozinho** — a liberação de verdade continua manual (`campaign_released`).
- Depois de liberada, o superadmin pode registrar uma timeline de andamento por campanha (`campaign_status_updates` — status como "Template aprovado", "Aguardando validação Meta", "Disparo iniciado" etc. + comentário livre, cada entrada opcionalmente com um ou outro). Visível também para admin/cliente da campanha (só leitura), em `/campanhas/[id]`.

## Central do Sistema (feature flags)
Painel só do superadmin (`/central`) com um catálogo de toggles (tabela `feature_flags`) que **restringem** funcionalidades já existentes — nunca concedem a um papel algo que a RLS do banco já não permitiria. Cada flag checada tanto na Server Action (bloqueio real) quanto na UI (esconder o controle). Toda funcionalidade opcional nova deveria nascer com uma flag aqui.

## Catálogo de webhooks (saída, app → n8n)
Todo evento relevante precisa emitir um webhook. Lista completa em @docs/PRD-Plataforma-Disparos-WhatsApp-v2.md seção 4.4. Os principais:
`client_created/updated/deleted`, `organization_created/updated`, `template_created/updated`, `template_set_as_default`, `campaign_created`, `campaign_submitted_for_approval`, `campaign_approved`, `campaign_rejected`, `campaign_scheduled`, `campaign_released`, `campaign_sending_started`, `campaign_completed`, `campaign_failed`, `campaign_report_added`, `contact_list_uploaded`, `contact_list_validated`.

Payload mínimo: `event`, `campaign_id` (quando aplicável), `organization_id`, `actor` (id + papel), `timestamp`, `data`. Lista completa e sempre atual do catálogo em código: `src/lib/webhooks/catalog.ts`.

## API de entrada (n8n → app)
- `POST /api/campaigns/{id}/status` — atualiza status (`enviando`, `concluído`, `falha`).
- `POST /api/campaigns/{id}/report` — ingestão automática de relatório/métricas.
- Autenticados por token de serviço dedicado, não pelo login do usuário. Devem ser idempotentes.

## Relatórios de disparo
Duas formas de entrada, mesmo schema (`campaign_reports`):
- **Automática:** callback do n8n após consumir o relatório da Infobip.
- **Manual:** upload de CSV/XLSX pelo admin/superadmin, com parsing e validação de colunas.

## Modelo de dados (tabelas-chave)
`organizations`, `profiles` (role, organization_id), `message_variations` (catálogo global de templates — texto com `{{N}}` + mídia/rodapé/botões padrão opcionais, gerenciado só pelo superadmin em `/catalogo-variacoes`), `templates` (não é mais autorado livremente — é a cópia por campanha do texto/mídia/rodapé/botões/variáveis escolhidos a partir de uma `message_variation`, com flag `text_overridden` quando o texto foi editado manualmente), `contact_lists` (+ `total_contacts`/`valid_contacts`/`invalid_contacts` — agregados calculados no parse; o CSV original fica só no Storage, **sem** tabela `contacts` linha a linha — inchava o banco sem nenhum consumidor real), `campaigns` (sem campos de pagamento — removido do MVP; + `scheduled_at` opcional), `campaign_reports`, `campaign_status_updates` (timeline de status/comentário pós-liberação, só superadmin escreve), `feature_flags` (Central do Sistema), `webhook_configs` (+ segredo HMAC), `webhook_deliveries` (log/retry), `audit_log`.

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