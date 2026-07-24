# Manual do Cliente — Disparo Certo

Este manual é para quem cria e acompanha campanhas de WhatsApp no dia a dia (papel **Cliente**).

## Sumário
1. [Primeiro acesso](#1-primeiro-acesso)
2. [Visão geral do menu](#2-visão-geral-do-menu)
3. [Criar uma campanha](#3-criar-uma-campanha)
4. [Acompanhar suas campanhas](#4-acompanhar-suas-campanhas)
5. [Baixar contatos e relatório](#5-baixar-contatos-e-relatório)
6. [Ver o andamento de uma campanha liberada](#6-ver-o-andamento-de-uma-campanha-liberada)
7. [Minha conta](#7-minha-conta)
8. [Dúvidas comuns](#8-dúvidas-comuns)

---

## 1. Primeiro acesso

Você recebe um e-mail e uma senha temporária de quem administra sua conta. Acesse a tela de login com esses dados. Se quiser, troque a senha depois em **Minha conta** (item 7).

## 2. Visão geral do menu

Como cliente, você só vê **Campanhas** no menu — é o seu espaço de trabalho. Tudo que você faz no sistema gira em torno de criar e acompanhar campanhas.

## 3. Criar uma campanha

Clique em **Nova campanha**. O processo tem até 5 etapas:

### Etapa 1 — Identificação
- Digite um **nome** para a campanha (é só pra você identificar depois, não vai na mensagem).
- Se disponível, você pode marcar **"Personalizar perfil do WhatsApp usado nesta campanha"** — permite definir um nome de exibição e uma foto de perfil diferentes pra esse disparo específico. Se não marcar, os disparos serão feitos a partir de números padronizados.

### Etapa 2 — Mensagem
O texto da mensagem vem de um catálogo pronto, mantido pela equipe — você não digita a mensagem do zero. O que você faz:
1. O texto de um modelo aparece na tela, com as partes que você precisa preencher destacadas (`{{1}}`, `{{2}}`...).
2. Não gostou desse modelo? Clique em **"Variar template"** pra ver outro.
3. Preencha cada variável destacada com a informação real da sua campanha (nome do cliente, número do boleto, data de vencimento etc. — depende do modelo).
4. Se quiser, anexe uma **imagem ou vídeo** pra essa campanha, ajuste o **rodapé** e os **botões** (o modelo já vem com um padrão, mas você pode trocar).
5. Acompanhe a prévia de como a mensagem vai aparecer no WhatsApp, ao lado.
6. Clique em **Avançar**.

> Se a sua conta tiver liberado a opção **"Editar texto"**, você também pode escrever o texto livremente a partir do modelo — mas atenção: nesse caso aparece um aviso de que a mensagem foge do padrão aprovado, **pode não ser aprovada** e pode ser **ajustada pela equipe técnica** antes do envio.

### Etapa 3 — Contatos
1. Envie um arquivo **CSV** com os contatos. Ele precisa ter uma coluna de telefone (`telefone`, `phone`, `celular` ou `whatsapp`). Nome (`nome`) e variáveis (`variavel_1`, `variavel_2`...) são opcionais.
2. Não tem um arquivo pronto? Clique em **"Baixar CSV modelo"** pra ver o formato esperado.
3. Depois de enviar, você vê uma prévia das primeiras linhas e quantos contatos são válidos/inválidos.
4. Escolha um dos dois caminhos:
   - **Avançar** — segue direto pra revisão final.
   - **Agendar campanha** — se você quiser marcar uma data/hora desejada de envio antes de revisar.

### Etapa 4 — Agendamento (só se você clicou em "Agendar campanha")
Marque a data e o horário que você gostaria que a campanha fosse enviada, ou deixe em branco e clique em **Continuar** pra pular. Isso é só uma referência pra equipe se organizar — **não envia nada automaticamente**; a liberação do disparo continua sendo feita manualmente pela equipe depois da aprovação.

### Etapa 5 — Revisar e confirmar
Confira o resumo (nome, template, contatos, data agendada se houver) e a prévia da mensagem. Clique em **Confirmar campanha** — ela vai para aprovação da equipe.

## 4. Acompanhar suas campanhas

Na tela **Campanhas** você vê todas as suas campanhas com o status atual:

| Status | O que significa |
|---|---|
| Rascunho | Você começou mas ainda não enviou pra aprovação |
| Aguardando aprovação | Enviada, esperando a equipe revisar |
| Aprovado | Aprovada, aguardando liberação pro disparo |
| Rejeitado | A equipe pediu ajuste — o motivo aparece na lista |
| Liberado / Enviando | Já foi liberada pro disparo |
| Concluído | Disparo terminado |
| Falha | Algo deu errado no disparo — fale com a equipe |

- Campanhas em **rascunho** ou **rejeitadas**: você pode clicar em **Continuar** (ou **Editar e reenviar**) pra retomar de onde parou, ou em **Excluir** pra descartar (se essa opção estiver disponível pra sua conta).
- Clique em **Ver detalhes** pra abrir a página da campanha (ver item 6).

## 5. Baixar contatos e relatório

- Na lista de campanhas, o botão de **download da lista de contatos** aparece pra qualquer campanha que já teve um arquivo enviado.
- O botão de **download do relatório** aparece quando a equipe já importou um relatório manual com planilha pra aquela campanha.

## 6. Ver o andamento de uma campanha liberada

Depois que uma campanha é liberada, clique em **Ver detalhes** pra acompanhar o andamento — a equipe pode registrar atualizações como "Aguardando validação Meta", "Disparo iniciado", "Disparo em andamento" e comentários explicando o que está acontecendo. Você só visualiza essa linha do tempo, não edita.

## 7. Minha conta

No rodapé do menu, clique em **Minha conta** pra trocar sua senha quando quiser.

## 8. Dúvidas comuns

**Minha campanha foi rejeitada, e agora?**
Veja o motivo na lista de campanhas, clique em "Editar e reenviar", ajuste o que for necessário e envie de novo pra aprovação.

**Posso escrever a mensagem do meu jeito?**
Por padrão não — o texto vem de um catálogo pra manter o padrão aprovado. Se sua conta tiver a opção de edição livre liberada, você consegue, mas com o aviso de que pode precisar de ajuste pela equipe.

**O agendamento garante que vai ser enviado naquela data?**
Não. É só uma referência pra equipe — quem decide o momento exato da liberação é a equipe responsável, depois da aprovação.

**Não recebo a lista de contatos que enviei?**
O botão de download só aparece depois que o upload é concluído com sucesso — confira se sua campanha já tem uma lista vinculada na etapa "Contatos".
