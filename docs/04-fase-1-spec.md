# 04 — Especificação da Fase 1

Objetivo: em poucas semanas, os sócios conseguem registrar clientes, acompanhar o funil, organizar os documentos
dos hospitais, gerar contratos a partir dos dados do cliente e ver o que os outros fizeram.

Decisões que moldam esta spec (ver `07-decisoes-pendentes.md`, 10/11/2026): app local com Supabase na nuvem (projeto de desenvolvimento);
sem assinatura eletrônica integrada (cliente assina pelo gov.br); sem portal externo; dois funis;
webhook do GitHub e push no celular adiados até a publicação.

Fora da Fase 1: Instagram, WhatsApp, busca no Drive, extração de reunião por IA, painel.

---

## 1. Autenticação

- Login por e-mail (magic link) via Supabase Auth.
- Só e-mails cadastrados em `profiles` com `active = true` entram.
- Perfil: nome, apelido, foto, área principal.

**Aceite:** um e-mail fora da lista não acessa nada; RLS bloqueia leitura direta pela API.

## 2. Organizações e pessoas

Telas:
- Lista de organizações com filtro por tipo, responsável e etapa do negócio ativo.
- Página da organização: dados, pessoas, negócios, documentos, contratos, linha do tempo.
- Formulário de pessoa: nome, cargo, e-mail, telefone, CRM (se médico), "pode assinar pela organização" + documento que comprova.

**Aceite:** criar/editar organização e pessoa gera evento no feed ("Lessa adicionou Hospital X").
CNPJ validado (formato e dígitos). Duplicidade de CNPJ avisada.

## 3. Negócios e funil

Telas:
- Kanban por funil, arrastando entre etapas. Dois funis:
  - **Hospitais e clínicas:** prospecção → reunião → documentos → análise do fundo → contrato → operando → perdido
  - **Médicos:** contato → cadastro → adesão → operando → perdido
- Página do negócio: organização, responsável, etapa, taxa, valor estimado, tarefas, notas, histórico.

Regras:
- Taxa padrão em **% ao mês**, vinda de `settings` (configurável): 3,5% hospitais e clínicas, 6% médicos.
  Pode ser alterada por negócio.
- Mudança de etapa gera evento.
- Entrar na etapa "documentos" (funil de hospitais e clínicas) oferece criar a lista de documentos.

**Aceite:** mover card atualiza etapa e gera evento; filtros por responsável funcionam.

## 4. Feed de atualizações

Tela:
- Feed cronológico com filtros (pessoa, área, organização, tipo).
- Cada item: quem, o quê, quando, link para a entidade.
- Comentários, reações, marcação de lido.
- Botão "postar atualização" (texto, anexo, menção @).

Fontes na Fase 1:
- Mutações internas (organização, pessoa, negócio, documento, contrato, tarefa).

Adiado até a publicação (precisa de endereço público e HTTPS):
- Webhook do GitHub: `push` na branch principal e `pull_request` fechado com merge, reescritos em uma frase simples
  pela IA, com o texto original no `payload`. Repositórios a decidir.
- PWA instalável + Web Push com preferências por sócio (menções sempre viram push; sem push para as próprias ações).

**Aceite:** toda mutação da Fase 1 aparece no feed com frase legível e link para a entidade;
menção @ aparece como não lida para o sócio mencionado.

## 5. Documentos dos hospitais

Só os sócios usam. Não há portal nem link para o hospital: o sócio recebe os arquivos (e-mail, WhatsApp, reunião)
e sobe na plataforma.

Telas:
- Modelos de checklist (lista de itens, obrigatório/opcional, descrição).
- Na organização: criar lista de documentos a partir de um modelo, ver status por item, subir arquivo por item,
  aprovar/rejeitar com comentário, ver o que falta.

Regras:
- Arquivo vai para a pasta da organização no Drive (criada se não existir) e fica registrado em `documents`.
- A plataforma só grava dentro da pasta de cada cliente no Drive.

**Aceite:** sócio sobe todos os itens de uma lista; cada upload gera evento;
arquivo aparece no Drive na pasta certa; a tela mostra "4 de 9 documentos recebidos" e quais faltam.

## 6. Contratos

Bloqueado até o Felipe enviar o contrato base revisado. Nenhum modelo é ativado antes disso.

Fluxo: gerar PDF na plataforma → baixar → cliente assina pelo gov.br → sócio sobe o PDF assinado.

Telas:
- Modelos: nome, tipo, versão, arquivo-base, lista de variáveis, revisado (sim/não, com nota), ativo.
- Novo contrato a partir de um negócio: escolhe modelo → campos pré-preenchidos do CRM → campos faltantes destacados →
  pré-visualização → **baixar PDF**.
- Signatários: escolhe pessoas da organização + sócio(s) da Sincra (constam no contrato e no controle da plataforma).
- Contrato gerado: botão **"Subir contrato assinado"**.
- Lista de contratos com status (rascunho, em revisão, gerado/aguardando assinatura, assinado, cancelado).

Regras:
- Só modelos ativos e revisados.
- Se algum signatário da contraparte não tiver `can_sign = true` com documento de comprovação,
  a geração do PDF final pede confirmação explícita e registra quem confirmou.
- Contratos negociados (ex.: cessão de recebíveis) vão para "em revisão" e exigem aprovação de um sócio antes de gerar o PDF final.
- Ao subir o PDF assinado: salva na pasta do cliente no Drive, muda o status para assinado, grava a data e gera evento.

**Aceite:** do negócio ao PDF baixado em menos de 2 minutos;
PDF assinado sobe e aparece no Drive na pasta certa; nenhuma cláusula é gerada por IA.

## 7. Tarefas (simples)

- Tarefa com título, responsável, prazo, vínculo opcional a organização/negócio.
- "Minhas tarefas" na página inicial.
- Criar e concluir tarefa gera evento.

---

## Página inicial

- Minhas tarefas
- Últimos eventos do feed (não lidos primeiro)
- Contratos aguardando assinatura (gerados e ainda sem PDF assinado)
- Listas de documentos com itens pendentes

## Ordem de implementação

1. Projeto Next.js + Supabase (dev, na nuvem) + migração + auth
2. Organizações e pessoas
3. Feed (tabela, gravação de eventos, tela) — antes dos outros módulos, para todos já gravarem
4. Negócios e funil
5. Tarefas
6. Documentos + Drive
7. Contratos (quando o contrato base chegar)
8. Depois da publicação: webhook do GitHub + PWA + push
