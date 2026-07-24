# Manual do Superadministrador — Disparo Certo

Este manual é para quem administra a plataforma como um todo (papel **Superadministrador**): organizações, catálogo de mensagens, webhooks, relatórios, auditoria e as configurações gerais do sistema.

## Sumário
1. [Visão geral do menu](#1-visão-geral-do-menu)
2. [Organizações e administradores](#2-organizações-e-administradores)
3. [Catálogo de Variações (o "banco de templates")](#3-catálogo-de-variações-o-banco-de-templates)
4. [Aprovações](#4-aprovações)
5. [Campanhas e a timeline de andamento](#5-campanhas-e-a-timeline-de-andamento)
6. [Webhooks (integração com o n8n)](#6-webhooks-integração-com-o-n8n)
7. [Relatórios](#7-relatórios)
8. [Auditoria](#8-auditoria)
9. [Central do Sistema (feature flags)](#9-central-do-sistema-feature-flags)
10. [Minha conta](#10-minha-conta)
11. [Dúvidas comuns](#11-dúvidas-comuns)

---

## 1. Visão geral do menu

| Item | Pra que serve |
|---|---|
| Organizações | Cadastrar contas (organizações) e seus administradores |
| Campanhas | Ver todas as campanhas de todas as organizações |
| Aprovações | Aprovar/rejeitar/liberar campanhas de qualquer organização |
| Catálogo de Variações | Cadastrar os modelos de mensagem que todo mundo usa |
| Webhooks | Configurar pra onde o sistema avisa o n8n de cada evento |
| Relatórios | Importar/baixar/excluir planilhas de resultado de disparo |
| Auditoria | Log de ações sensíveis do sistema |
| Central do Sistema | Ligar/desligar funcionalidades opcionais |

## 2. Organizações e administradores

Em **Organizações**:
1. **Criar organização**: só o nome. Depois de criada, clique nela pra abrir a página de detalhe.
2. Na página de detalhe você:
   - Edita o nome da organização.
   - **Cria administradores** dessa organização (nome + e-mail — o sistema gera uma senha temporária, copie e repasse na hora).
   - Vê a lista de administradores e clientes vinculados, com botões pra **editar nome**, **redefinir senha** e **excluir** cada um.
   - Também pode cadastrar clientes diretamente por ali.

## 3. Catálogo de Variações (o "banco de templates")

Essa é a tela mais importante do seu papel: é daqui que vem **todo** o texto de mensagem usado nas campanhas do sistema inteiro — nenhum admin ou cliente digita mensagem do zero.

- **Criar um novo template**: escreva o texto usando `{{1}}`, `{{2}}`... onde quiser que a variável entre (ex.: "Olá {{1}}, seu boleto {{2}} vence em {{3}}"). Opcionalmente, anexe uma **mídia padrão** (imagem/vídeo), um **rodapé padrão** e até 3 **botões padrão** — tudo isso já vem pré-preenchido pra quem for usar esse template numa campanha (mas a pessoa ainda pode trocar por algo específico daquela campanha, se quiser).
- **Editar**: clique em "Editar" na lista pra mudar texto, mídia, rodapé ou botões de um template já existente.
- **Ativar/Desativar**: só templates **ativos** aparecem pra admin/cliente escolherem no wizard. Desative um template que não deve mais ser usado sem precisar excluir o histórico.
- **Excluir**: remove o template do catálogo (não afeta campanhas que já usaram uma cópia dele).

> Dica: mantenha sempre pelo menos um template ativo — sem isso, ninguém consegue avançar na etapa "Mensagem" do wizard de campanha.

## 4. Aprovações

Mesma tela e mesmas ações que o administrador tem (ver manual do admin, item 5), só que aqui você vê e age sobre campanhas de **todas** as organizações, não só de uma.

## 5. Campanhas e a timeline de andamento

Em **Campanhas** você vê todas as campanhas do sistema, com uma coluna extra **Cliente** mostrando quem criou cada uma (clique no nome pra filtrar só as campanhas daquela pessoa).

Clique em **Ver detalhes** numa campanha pra abrir a página dela. Depois que uma campanha é **liberada**, você pode registrar atualizações de andamento ali:
- Escolha um **status** (Template aprovado, Template reprovado, Aguardando validação Meta, Disparo iniciado, Disparo em andamento, Concluído, Outro) e/ou escreva um **comentário** — pelo menos um dos dois é obrigatório.
- Clique em **Registrar**. Cada entrada fica salva permanentemente na linha do tempo (não dá pra editar ou apagar depois — se precisar corrigir algo, registre uma entrada nova explicando).
- Admin e cliente daquela campanha veem essa timeline (só leitura) — é uma forma de manter todo mundo informado sobre o que está acontecendo no disparo real, sem precisar de mensagens por fora do sistema.

## 6. Webhooks (integração com o n8n)

O sistema nunca dispara mensagem nem fala com o ClickUp diretamente — quem faz isso é o **n8n**, um sistema de automação externo. O papel dessa tela é dizer pro sistema **pra onde avisar** o n8n a cada evento (campanha criada, aprovada, liberada, agendada, etc.).

- Pra cada evento, configure a **URL de destino** no n8n e ative.
- Cada endpoint tem um **segredo (HMAC)** — usado pelo n8n pra confirmar que o aviso realmente veio daqui. Clique no ícone de olho pra ver o segredo atual, ou regenere se precisar trocar.
- Se uma entrega falhar, ela aparece pra **reenvio manual**; também dá pra clicar em **"Processar fila agora"** pra forçar uma nova tentativa das entregas pendentes.

> Se você não configurar a URL de um evento, o sistema simplesmente não avisa ninguém sobre ele — não dá erro, só fica em silêncio. Vale conferir essa tela sempre que uma automação nova for combinada com o time do n8n.

## 7. Relatórios

Em **Relatórios**, você vê as campanhas já liberadas:
- **Relatório automático**: chega sozinho via retorno do n8n depois do disparo.
- **Relatório manual**: quando o relatório só está disponível direto no painel da operadora (Infobip), importe o arquivo (CSV ou XLSX) aqui — o sistema lê e guarda tanto os números quanto o arquivo original (pra quem tiver acesso poder baixar depois).
- **Excluir**: remove um relatório (e o arquivo, se houver) — use com cuidado, não tem como desfazer.

## 8. Auditoria

Tela só de leitura com as últimas ações sensíveis do sistema (quem aprovou, rejeitou, criou organização, etc.) — útil pra investigar "quem fez o quê e quando".

## 9. Central do Sistema (feature flags)

Aqui você liga e desliga funcionalidades específicas do sistema, sem precisar de ajuste técnico. Exemplos hoje disponíveis: permitir que clientes excluam suas próprias campanhas, permitir personalização de perfil de WhatsApp na campanha, permitir que administradores editem o nome de exibição da organização, liberar edição livre do texto da mensagem.

Cada toggle só **restringe** uma funcionalidade — nunca dá a alguém uma permissão que o sistema não já daria por padrão. Essa tela tende a crescer com o tempo, conforme novas funcionalidades opcionais forem adicionadas.

## 10. Minha conta

No rodapé do menu, clique em **Minha conta** pra trocar sua senha quando quiser.

## 11. Dúvidas comuns

**Um admin/cliente reclamou que não consegue avançar na etapa "Mensagem" da campanha.**
Confira o Catálogo de Variações — provavelmente não há nenhum template ativo no momento.

**Uma campanha foi liberada mas o n8n não recebeu nada.**
Veja em Webhooks se o evento `campaign_released` tem uma URL configurada e ativa, e confira o histórico de entregas (reenvie manualmente se necessário).

**Como eu sei se uma campanha teve o texto editado manualmente (fora do padrão)?**
Aparece um aviso destacado tanto na etapa de confirmação do cliente quanto no card de aprovação — fica visível antes de você aprovar.

**Excluí um template do catálogo por engano — as campanhas que já usaram ele quebram?**
Não. Cada campanha grava sua própria cópia do texto/mídia no momento em que é criada — excluir o template do catálogo só impede que ele seja escolhido em campanhas novas.
