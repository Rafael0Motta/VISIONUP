# PRD — Plataforma de Disparos de WhatsApp (Ponte de Automação)
**Versão:** 2.0
**Última atualização:** 19 de julho de 2026
**Status:** Em planejamento — migração do MVP (Lovable) para build via Claude Code
**Substitui:** PRD v1.0

---

## 0. Contexto da mudança

O sistema deixa de ser uma plataforma que **executa** disparos diretamente na Infobip e passa a ser uma **ponte de coleta e orquestração**: ele coleta dados de campanhas (template, informações do disparo, planilha de contatos), envia esses dados para o **n8n** — onde vive toda a lógica de automação, validação e disparo efetivo via Infobip — e recebe de volta, via callback, o status e os relatórios de cada disparo. A notificação da equipe operacional acontece no ClickUp, mas é o **n8n** quem fala com o ClickUp, não o app.

> **Princípio de arquitetura:** o app nunca chama a API da Infobip nem a API do ClickUp diretamente. Ele só se comunica com o n8n (webhooks de saída) e recebe do n8n (API de entrada) atualizações de status e métricas. Toda regra de negócio de disparo, formatação de mensagem, retries de envio e notificação de equipe vive no n8n.

Essa mudança também introduz dois requisitos novos de negócio que não existiam no MVP:
- **Registro de pagamento por campanha**, feito pelo Admin.
- **Ingestão de relatórios/métricas de disparo** por campanha, de forma manual (upload de CSV/XLSX) ou automática (callback do n8n após consumir o relatório da Infobip).

---

## 1. Visão geral

### 1.1 Objetivos de produto
- Ser a interface única onde clientes finais criam e acompanham campanhas de WhatsApp, sem nunca ter acesso a credenciais de Infobip, n8n ou ClickUp.
- Impor governança por aprovação humana obrigatória antes de qualquer campanha seguir para disparo.
- Emitir eventos (webhooks) para **todas** as ações relevantes do sistema, permitindo que o n8n orquestre qualquer automação a jusante sem precisar de lógica adicional no app.
- Permitir o controle financeiro por campanha (registro de pagamento) e o controle operacional por volume diário de envios.
- Permitir a ingestão de relatórios de disparo (métricas reais da Infobip) por campanha, tanto via automação quanto via upload manual, para os casos em que o relatório só está disponível no painel da Infobip.

### 1.2 Não-objetivos
- O sistema **não** chama a API da Infobip para enviar mensagens — quem envia é o n8n.
- O sistema **não** se integra diretamente ao ClickUp — quem notifica é o n8n.
- O sistema não é um CRM nem um chatbot; não hospeda instâncias próprias de WhatsApp (Evolution/Baileys).
- O sistema não faz checagem prévia de número ativo no WhatsApp (isso, se existir, é responsabilidade do n8p/Infobip).
- O sistema não decide *quando* nem *como* enviar — apenas registra a intenção (campanha aprovada e liberada) e aguarda o retorno do processamento.

### 1.3 Papéis do ecossistema (visão de negócio)
| Entidade | Papel no sistema | Quem é |
|---|---|---|
| **ATX / BluePrint** | Superadministrador — dono da plataforma | Vocês |
| **VisionUp** (e futuros clientes da plataforma) | Administrador — gestor de uma organização/conta | Cliente direto de ATX/BluePrint |
| **Clientes da VisionUp** | Usuário/Cliente — operacional, cria campanhas | Clientes finais da VisionUp |

A plataforma é multi-tenant: **ATX/BluePrint** pode, no futuro, vender o mesmo sistema para outros administradores além da VisionUp, cada um com sua própria organização isolada.

---

## 2. Personas e papéis

| Papel | Descrição | Escopo |
|---|---|---|
| **Superadministrador** (ATX/BluePrint) | Dono da plataforma. Cria/gerencia organizações (contas tipo VisionUp), configura endpoints de webhook do n8n, ingere relatórios de qualquer campanha (manual ou automático), enxerga métricas globais. | Global |
| **Administrador** (ex.: VisionUp) | Gestor de uma organização. Cria/edita/exclui os próprios clientes, aprova/rejeita campanhas dos seus clientes, **registra pagamento por campanha**, acompanha central de métricas da sua organização. | Organização própria |
| **Cliente/Usuário** (clientes da VisionUp) | Operacional. Cria campanhas, escolhe/edita template (a partir de um modelo padrão), envia lista de contatos (CSV), envia para aprovação. | Próprio conteúdo |

### 2.1 Matriz de permissões

| Ação | Superadmin | Admin | Cliente |
|---|:-:|:-:|:-:|
| Ver painel | ✓ | ✓ | ✓ |
| Criar/editar/excluir organizações (contas tipo VisionUp) | ✓ | — | — |
| Criar/editar/excluir clientes da própria organização | ✓ | ✓ | — |
| Aprovar/rejeitar campanhas | ✓ (todas) | ✓ (da própria organização) | — |
| **Registrar pagamento de campanha** | ✓ | ✓ (da própria organização) | — |
| Liberar campanha aprovada (dispara envio ao n8n) | ✓ | ✓ | — |
| Criar campanha | ✓ | ✓ | ✓ |
| Definir/editar template padrão da organização | ✓ | ✓ | — |
| Criar campanha a partir de template padrão | ✓ | ✓ | ✓ |
| Configurar endpoints de webhook (n8n) | ✓ | — | — |
| **Ingerir relatório de disparo (manual — upload CSV/XLSX)** | ✓ | ✓ (da própria organização) | — |
| Ver métricas | ✓ (todas as organizações) | ✓ (própria organização) | ✓ (próprias campanhas) |
| Ver auditoria / log de eventos e webhooks | ✓ | ✓ (própria organização) | — |

---

## 3. Fluxos principais

### 3.1 Autenticação
- Mantém login via Supabase Auth (e-mail + senha), sessão protegida por rota autenticada.
- Papéis armazenados em tabela própria (`profiles.role`), nunca em metadata do `auth.users`.

### 3.2 Ciclo de vida de uma campanha

```
rascunho → aguardando aprovação → aprovado → pagamento registrado* → liberado
    → enviando (callback n8n) → concluído (callback n8n)
                              ↘ rejeitado (com motivo)
                              ↘ falha no envio (callback n8n)
```
`*` **Premissa a validar:** o registro de pagamento não bloqueia a liberação da campanha — é um controle financeiro paralelo, não um gate técnico. Se a VisionUp quiser que pagamento seja pré-requisito para liberar, isso precisa ser confirmado e viraria uma trava adicional no fluxo.

1. **Cliente** cria a campanha no wizard:
   - **Identificação** — nome da campanha, remetente.
   - **Template** — seleciona um template (pode partir do **template padrão** da organização) ou cria um novo; define mídia (imagem/vídeo/documento), texto/copy, variáveis.
   - **Contatos** — upload de CSV; validação de formato de telefone.
   - **Revisão** — prévia da mensagem; envia para aprovação → dispara `campaign_created` e `campaign_submitted_for_approval`.
2. **Admin/Superadmin** vê o item em `/aprovacoes`, com **prévia completa do template renderizado** e **resumo da lista de contatos** (total, válidos, inválidos).
3. **Aprovação** → grava `approved_by`, `approved_at` → dispara webhook `campaign_approved`.
   **Rejeição** → grava `rejection_reason` → dispara webhook `campaign_rejected` → campanha volta ao cliente para edição.
4. **Registro de pagamento** (Admin/Superadmin, em qualquer momento após aprovação) → grava `payment_status`, `payment_amount` (opcional), `payment_registered_by`, `payment_registered_at` → dispara webhook `campaign_payment_registered`.
5. **Liberação** (Admin/Superadmin) → dispara webhook `campaign_released`, enviando ao n8n: dados da campanha, template renderizado e a lista de contatos (ou referência/URL assinada para download da lista, dependendo do volume). **É aqui que a responsabilidade de execução passa para o n8n.**
6. **n8n** processa, dispara via Infobip, notifica a equipe operacional via ClickUp, e retorna ao sistema (API de callback):
   - `POST /api/campaigns/{id}/status` com `enviando` quando inicia o disparo real.
   - `POST /api/campaigns/{id}/status` com `concluído` (ou `falha`) ao terminar, e opcionalmente `POST /api/campaigns/{id}/report` já com as métricas consolidadas (envio automático de relatório).
7. Cada mudança de status recebida do n8n também deve dis parar o webhook correspondente de volta para fora (ex.: `campaign_completed`) — útil se o próprio n8n quiser escutar confirmações do sistema, ou se outro sistema (ex.: ClickUp) também estiver escutando webhooks do app diretamente no futuro.

### 3.3 Templates
- Cada organização tem um ou mais templates marcados como **padrão** (`is_default = true`), usados como ponto de partida ao criar uma nova campanha.
- **A definir com a VisionUp:** a estrutura exata do "modelo padrão" (layout de cabeçalho/mídia, corpo/texto, rodapé, botões) ainda será enviada — este PRD assume que o modelo padrão é apenas um template pré-preenchido e editável, não uma trava de conteúdo. Assim que a estrutura for definida, esta seção deve ser atualizada com os campos obrigatórios do modelo.
- Nomenclatura de campos do wizard de template (herdada das melhorias já mapeadas no v1.0):
  - "Cabeçalho" → **Mídia** (imagem/vídeo/documento — sem opção de texto duplicada).
  - "Corpo" → **Texto** (copy da mensagem).

### 3.4 Gestão de clientes e organizações
- Superadmin cria/gerencia organizações (contas tipo VisionUp).
- Admin cria/edita/exclui os clientes da própria organização (equivalente ao antigo papel "Usuário").
- Exclusão em cascata: remove templates, campanhas, listas, contatos, configs pessoais e entradas de auditoria do cliente removido.
- Vínculo organização ↔ cliente deve ser visível **em ambas as direções**: na tela do cliente (já existe) e também na tela de detalhe da organização, listando todos os clientes vinculados a ela — isso corrige uma limitação identificada no MVP.

---

## 4. Arquitetura técnica

### 4.1 Princípio arquitetural central
O app é uma **camada de coleta, governança e estado** — não uma camada de execução de disparo. Toda vez que uma ação relevante acontece, o app:
1. Persiste o estado no seu próprio banco (Supabase).
2. Emite um webhook para o n8n descrevendo o evento.
3. Não espera resposta síncrona do n8n para a ação do usuário ser concluída (fire-and-forget na saída), mas **registra a tentativa de entrega** para permitir retry e auditoria (diferente do MVP v1.0, que não tinha retry — aqui isso deixa de ser opcional, pois é o coração do fluxo).

O n8n, por sua vez, chama de volta uma API do app (autenticada por token de serviço) para atualizar status e enviar relatórios.

### 4.2 Stack sugerida
- **Frontend:** a definir no kickoff técnico com Claude Code — pode reaproveitar o padrão do MVP (TanStack Start + React) ou migrar para Next.js, conforme preferência da equipe de desenvolvimento. Recomenda-se manter Tailwind + shadcn/ui para não perder o design system já validado.
- **Backend/dados:** Supabase (Postgres + Auth + Storage + Edge Functions/API routes).
- **Automação/lógica de negócio de disparo:** n8n (externo, mantido pela ATX/BluePrint).
- **Disparo real de mensagens:** Infobip (chamado exclusivamente pelo n8n).
- **Notificação da equipe operacional:** ClickUp (chamado exclusivamente pelo n8n).

### 4.3 Modelo de dados (tabelas principais e novas)
- `organizations` — contas tipo VisionUp.
- `profiles` — id, role (`superadmin` | `admin` | `cliente`), organization_id, full_name.
- `templates` — + `is_default` (boolean), mídia, texto, variáveis, status.
- `contact_lists` + `contacts` — listas CSV com `is_valid` por contato.
- `campaigns` — status, template_id, contact_list_id, rejection_reason, **+ `payment_status`, `payment_amount`, `payment_registered_by`, `payment_registered_at`, `payment_notes`**.
- `campaign_reports` **(nova)** — campaign_id, origem (`manual` | `automatico`), enviados, entregues, lidos, falhados, custo, importado_por, importado_em.
- `webhook_configs` — evento, URL de destino (n8n), ativo, **+ segredo HMAC** (ausente no MVP — recomenda-se adicionar agora, já que a confiabilidade do fluxo depende diretamente desses webhooks).
- `webhook_deliveries` **(nova)** — evento, payload, URL, status (`entregue`/`falhou`/`retentando`), tentativas, último envio — necessária para dar visibilidade e retry, hoje uma lacuna conhecida do MVP.
- `audit_log` — trilha imutável de ações sensíveis (inclui aprovação, rejeição, registro de pagamento, ingestão manual de relatório).

### 4.4 Catálogo de eventos/webhooks (saída, app → n8n)

Esta é a peça central do requisito: **cada ação relevante do sistema precisa emitir um evento mapeável no n8n**.

| Evento | Disparado quando |
|---|---|
| `client_created` / `client_updated` / `client_deleted` | Admin cria/edita/remove um cliente |
| `organization_created` / `organization_updated` | Superadmin cria/edita uma organização |
| `template_created` / `template_updated` | Cliente/Admin cria ou edita um template |
| `template_set_as_default` | Um template é marcado como padrão da organização |
| `campaign_created` | Cliente inicia uma nova campanha (rascunho salvo) |
| `campaign_submitted_for_approval` | Cliente envia a campanha para aprovação |
| `campaign_approved` | Admin/Superadmin aprova a campanha |
| `campaign_rejected` | Admin/Superadmin rejeita a campanha (inclui motivo) |
| `campaign_payment_registered` | Admin/Superadmin registra o pagamento da campanha |
| `campaign_released` | Admin/Superadmin libera a campanha — **este é o evento que entrega ao n8n tudo que ele precisa para executar o disparo** (template renderizado + lista de contatos) |
| `campaign_sending_started` | Callback do n8n informando que o disparo começou na Infobip |
| `campaign_completed` | Callback do n8n informando que o disparo terminou com sucesso |
| `campaign_failed` | Callback do n8n informando falha no disparo |
| `campaign_report_added` | Relatório de métricas ingerido (com atributo `origem`: manual ou automático) |
| `contact_list_uploaded` | Cliente envia um novo CSV de contatos |
| `contact_list_validated` | Sistema termina de validar o formato dos contatos |

> Todos os payloads incluem, no mínimo: `event`, `campaign_id` (quando aplicável), `organization_id`, `actor` (id e papel de quem executou a ação), `timestamp`, e um bloco `data` específico do evento.

### 4.5 API de entrada (n8n → app)

Endpoints autenticados por token de serviço (não pelo login do usuário), usados exclusivamente pelo n8n:

| Endpoint | Propósito |
|---|---|
| `POST /api/campaigns/{id}/status` | Atualiza status da campanha (`enviando`, `concluído`, `falha`) |
| `POST /api/campaigns/{id}/report` | Ingestão **automática** de relatório de disparo (métricas vindas da Infobip via n8n) |

### 4.6 Ingestão manual de relatórios
- Tela para Admin/Superadmin fazer upload de CSV/XLSX exportado diretamente do painel da Infobip.
- O sistema faz o parsing e normaliza para o mesmo schema de `campaign_reports`, marcando `origem = manual` e registrando quem importou.
- Deve haver validação do arquivo (colunas esperadas) com mensagens de erro claras em caso de formato incompatível.

### 4.7 Segurança
- RLS ativa em todas as tabelas `public.*`, com policies por `organization_id` para Admin e por `profile_id` (autor) para Cliente.
- Função `has_role` com `SECURITY DEFINER` para evitar recursão de RLS (mantido do MVP).
- Webhooks de saída assinados com HMAC (segredo por `webhook_config`), para permitir que o n8n valide a autenticidade do evento — item novo em relação ao MVP, recomendado dado o papel crítico dos webhooks nesta arquitetura.
- Endpoints de callback do n8n protegidos por token de serviço dedicado (não reaproveitar chave pública do Supabase).
- Autorização sempre validada pelo perfil do chamador no banco, nunca pelo corpo da requisição.

---

## 5. Design system (herdado do v1.0, com ajustes de nomenclatura)

- Institucional e sóbrio; densidade controlada; feedback imediato (toasts, badges de status).
- Tokens semânticos (oklch) em claro/escuro; proibido cor hardcoded em componentes.
- Glossário de nomenclatura atualizado:

| Termo interno/técnico | Termo exibido |
|---|---|
| campaign | **Campanha** (substitui "Disparo/Demanda" do v1.0) |
| template header/mídia | **Mídia** |
| template body | **Texto** |
| sender | Remetente |
| role: superadmin | Superadministrador |
| role: admin | Administrador |
| role: cliente | Cliente |
| pending_approval | Aguardando aprovação |
| ready_to_send | Liberado |
| payment_status: pending | Pagamento pendente |
| payment_status: paid | Pagamento registrado |

- Wizard de campanha deve incluir, no passo de identificação, campo de **Nome do Perfil** (perfil de WhatsApp Business vinculado ao remetente) — herdado da lista de melhorias do v1.0, ainda válido nesta versão.
- Passo de prioridade (Baixa/Média/Alta), se mantido, precisa de explicação inline sobre o impacto de cada nível — **a definir**, pois a regra de priorização de fila ainda não está documentada em nenhuma versão do PRD.

---

## 6. Integrações (papel de cada uma)

### 6.1 n8n — motor de automação (única integração direta do app)
- Recebe todos os webhooks de saída do app (seção 4.4).
- Responsável por: validar dados, formatar e disparar mensagens via Infobip, notificar a equipe via ClickUp, e retornar status/relatórios ao app (seção 4.5).

### 6.2 Infobip — envio de WhatsApp
- Chamado exclusivamente pelo n8n. O app não mantém mais integração direta de envio; pode manter apenas o armazenamento de credenciais (`infobip_configs`) para uso pelo n8n, se for essa a forma de acesso combinada.

### 6.3 ClickUp — notificação da equipe operacional
- Chamado exclusivamente pelo n8n. O app não tem nenhuma integração direta com o ClickUp.

### 6.4 Integrações descontinuadas
- Qualquer chamada direta do app à API de envio da Infobip ou à API do ClickUp é removida desta versão — essas responsabilidades migram para o n8n.

---

## 7. Métricas e observabilidade

- **Central de métricas do Admin:** volume total diário/por período de envios (ex.: "3 campanhas aprovadas = 23 mil envios"), quebrado por status de pagamento — item novo, direto da melhoria pedida pela VisionUp.
- **Central de métricas do Superadmin:** visão agregada entre todas as organizações.
- Métricas vêm de `campaign_reports` (origem manual ou automática) e não apenas da contagem de status de campanha — diferente do v1.0, que só contava campanhas por status.
- Log de entrega de webhooks (`webhook_deliveries`) visível para Superadmin, com status de tentativas — corrige a lacuna de observabilidade do MVP.
- `audit_log` cobre: organizações, clientes, aprovação/rejeição, registro de pagamento e ingestão manual de relatório.

---

## 8. Requisitos não-funcionais

- **Confiabilidade de webhooks:** retry com backoff é requisito de MVP nesta versão (não mais item de roadmap futuro), dado que o fluxo de negócio depende inteiramente da entrega dos eventos ao n8n.
- **Idempotência:** callbacks do n8n (`/status`, `/report`) devem ser idempotentes, pois falhas de rede podem levar a reenvios.
- **Segurança:** HMAC nos webhooks de saída; token de serviço dedicado nos endpoints de entrada; RLS mantida em todas as tabelas.
- **Auditabilidade:** toda ação sensível (aprovação, rejeição, pagamento, ingestão de relatório) grava em `audit_log`.
- **Internacionalização:** pt-BR fixo, como no MVP.

---

## 9. Premissas e itens a validar com a VisionUp / ATX-BluePrint

Estes pontos ficaram em aberto na descrição recebida e precisam de confirmação antes (ou durante) do desenvolvimento:

1. **Pagamento não bloqueia liberação** — confirmar se é isso mesmo, ou se a campanha só pode ser liberada após pagamento registrado.
2. **Estrutura do "template padrão"** — o formato exato ainda será enviado; esta versão assume que é apenas um template pré-preenchido editável.
3. **Formato/canal de entrega da lista de contatos para o n8n no evento `campaign_released`** — enviar o CSV inteiro no payload ou uma URL assinada de download (recomendado para listas grandes, evitando payloads pesados de webhook).
4. **Regra de priorização (Baixa/Média/Alta)** — ainda não documentada; precisa ser definida para saber se afeta ordem de fila no n8n ou é só informativa.
5. **Escopo de credenciais Infobip no app** — confirmar se o app ainda armazena `infobip_configs` (para o n8n consumir) ou se as credenciais passam a viver só no n8n.
6. **Multi-tenant além da VisionUp** — confirmar se o MVP de migração já deve suportar múltiplas organizações administradoras desde o início, ou se pode ser VisionUp-only por ora, com multi-tenant como evolução.

---

## 10. Roadmap sugerido (fora do escopo do MVP desta migração)

1. Exportação de métricas e relatórios consolidados (CSV/XLSX) por período.
2. Suporte a múltiplos idiomas.
3. SSO (OAuth Google/Microsoft) para organizações administradoras maiores.
4. Painel de saúde de integrações (status de conexão com n8n, última entrega bem-sucedida por evento).
5. Regras de priorização de fila configuráveis por organização.