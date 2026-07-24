# Manual do Administrador — Disparo Certo

Este manual é para quem gerencia uma organização (papel **Administrador**): cadastra clientes, aprova campanhas e libera disparos.

## Sumário
1. [Primeiro acesso](#1-primeiro-acesso)
2. [Visão geral do menu](#2-visão-geral-do-menu)
3. [Gerenciar clientes](#3-gerenciar-clientes)
4. [Campanhas](#4-campanhas)
5. [Aprovar, rejeitar e liberar campanhas](#5-aprovar-rejeitar-e-liberar-campanhas)
6. [Configurações da organização](#6-configurações-da-organização)
7. [Minha conta](#7-minha-conta)
8. [Dúvidas comuns](#8-dúvidas-comuns)

---

## 1. Primeiro acesso

Você recebe um e-mail e uma senha temporária de quem administra a plataforma (superadmin). Faça login e, se quiser, troque a senha em **Minha conta** (item 7).

## 2. Visão geral do menu

- **Clientes** — cadastro dos clientes da sua organização.
- **Campanhas** — todas as campanhas da sua organização (você também pode criar campanhas).
- **Aprovações** — fila de aprovação/liberação.
- **Configurações** — nome de exibição da organização.

## 3. Gerenciar clientes

Na tela **Clientes**:
- **Criar cliente**: informe nome e e-mail. O sistema gera uma **senha temporária** — copie e repasse pro cliente na hora, ela não aparece de novo depois. Você também pode aproveitar essa tela pra definir o **nome de exibição** da organização (o que os clientes veem no lugar do nome interno).
- **Editar**: clique em "Editar" na linha do cliente pra corrigir o nome.
- **Redefinir senha**: gera uma nova senha temporária pro cliente — use se ele esquecer a senha.
- **Excluir**: remove o cliente e tudo vinculado a ele (campanhas, listas de contato). Ação irreversível — só disponível se essa opção estiver liberada pra sua conta.

## 4. Campanhas

Na tela **Campanhas** você vê todas as campanhas da sua organização (de todos os clientes) e também pode **criar uma nova campanha** você mesmo, seguindo o mesmo assistente que o cliente usa (identificação → mensagem → contatos → agendamento opcional → confirmação — veja o manual do cliente pra o passo a passo detalhado de cada etapa).

Ações disponíveis por campanha:
- **Ver detalhes** — abre a página da campanha, com o andamento pós-liberação.
- **Baixar lista de contatos** / **baixar relatório** — quando disponíveis.
- **Continuar** / **Editar e reenviar** — pra campanhas em rascunho ou rejeitadas.
- **Excluir** — pra campanhas em rascunho ou rejeitadas (se liberado pra sua conta).

## 5. Aprovar, rejeitar e liberar campanhas

Na tela **Aprovações**, organizada em abas (Pendentes / Aprovados / Liberadas / Rejeitados):

1. **Revisar**: cada card mostra a prévia completa da mensagem (com mídia, se houver) e o total de contatos. Se o texto foi editado manualmente pelo cliente (fora do padrão do catálogo), aparece um aviso — revise com atenção antes de aprovar.
2. **Aprovar**: confirma que a campanha está pronta para seguir. Pede confirmação antes de executar.
3. **Rejeitar**: abre uma caixa pra você explicar o motivo — o cliente vê esse motivo e pode corrigir e reenviar.
4. **Liberar campanha** (depois de aprovada): dispara o disparo de verdade — a partir daqui a campanha sai da sua mão e vai para o processamento real. **Ação irreversível, pede confirmação.**

## 6. Configurações da organização

Em **Configurações**, você pode editar o **nome de exibição** da sua organização — é o nome que os seus clientes veem no lugar do nome interno cadastrado pelo superadmin. Essa opção pode estar desativada pela administração da plataforma; se estiver, o campo aparece bloqueado.

## 7. Minha conta

No rodapé do menu, clique em **Minha conta** pra trocar sua senha quando quiser.

## 8. Dúvidas comuns

**Posso aprovar campanha da minha própria organização mesmo tendo sido eu quem criou?**
Sim, não há bloqueio pra isso hoje.

**Depois que eu libero, ainda dá pra cancelar?**
Não pelo sistema — liberar é o ponto sem volta em que o disparo passa a ser executado. Confirme tudo antes de clicar em "Liberar campanha".

**Por que não consigo excluir uma campanha aprovada/liberada?**
Por design: só campanhas em rascunho ou rejeitadas podem ser excluídas — as que já avançaram no fluxo mantêm o histórico real do que foi (ou vai ser) enviado.

**O que é a timeline de "andamento" na página de detalhe?**
É um registro operacional (validação do template no Meta, progresso do disparo etc.) que só o superadmin atualiza — você acompanha como leitura, é útil pra saber por que um disparo ainda não saiu.
