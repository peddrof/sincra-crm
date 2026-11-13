# 03 — Módulos

Status: **F1** = Fase 1, **F2/F3/F4** = fases seguintes, **Ideia** = sugestão ainda não aprovada.

## CRM (F1)

- Organizações: hospital, clínica, operadora, fundo, outro.
- Pessoas ligadas às organizações (cargo, contato, se pode assinar e com base em qual documento).
- Negócios com funil por tipo:
  - **Hospitais e clínicas:** prospecção → reunião → documentos → análise do fundo → contrato → operando → perdido
  - **Médicos:** contato → cadastro → adesão → operando → perdido
  - Sem funil de fundo/investidor (decidido em 10/11/2026). Fundos podem existir como organização, sem funil.
- Etapas configuráveis em tabela, não fixas no código.
- Linha do tempo por organização: interações, documentos, contratos, decisões, eventos.

## Feed de atualizações (F1)

- Eventos automáticos de todos os módulos.
- Eventos do GitHub (push na branch principal, PR mergeado, deploy), reescritos em linguagem simples pela IA.
  Adiado até a publicação.
- Posts manuais com texto, anexo e menção.
- Filtros por pessoa, área e cliente; comentários e reações; não lidos por pessoa.
- Push no celular (PWA + Web Push) conforme preferência de cada sócio. Adiado até a publicação.
- Resumo diário/semanal gerado por IA (F2).

## Documentos dos hospitais (F1)

- Modelos de checklist (base: lista padrão já usada com o Grupo VITA, que está no vault).
- Lista de documentos por organização, status por item (pendente, recebido, aprovado, rejeitado).
- Os sócios sobem os arquivos; não há portal externo (decidido em 10/11/2026).
- Arquivos salvos na pasta do cliente no Drive.

## Contratos (F1)

- Modelos com variáveis, versionados. Só modelos revisados e ativos podem ser usados.
- Quais tipos entram: em aberto até o Felipe enviar o contrato base.
- Contratos negociados (cessão de recebíveis com hospital e fundo) → fluxo de revisão.
- Preenchimento a partir do CRM; campos faltantes destacados.
- Verificação de signatário antes de gerar o PDF final.
- Gera PDF para download; o cliente assina pelo gov.br (sem API de assinatura).
- Sócio sobe o PDF assinado; arquivo salvo na pasta do cliente no Drive.

## Contexto / Drive (F2)

- Sincronização da pasta "Org Sincra" (notificações de mudança da Drive API).
- Pasta por cliente vinculada à organização.
- Indexação para busca semântica (pgvector).
- "Pergunte à Sincra": respostas com link para o documento de origem.

## Reuniões (F2)

- Integração com Google Calendar: reunião vira atividade do negócio; resumo do cliente antes da call.
- Upload de áudio/transcrição → extração por IA → tela de confirmação → atualização do CRM e do contrato.
- Tarefas criadas a partir dos próximos passos, com responsável e prazo.

## Instagram (F3)

- Caixa de entrada de DMs e comentários do @sincra.app via API oficial.
- Vincular conversa a pessoa/organização do CRM.
- Responder pela plataforma.

## WhatsApp (F4)

- Caixa de entrada via WhatsApp Cloud API.
- Templates aprovados para mensagens fora da janela de atendimento.
- Depende de decisão sobre guardar conversas (ver decisões pendentes).

## Outros (Ideia)

- **Dossiê para o fundo:** pacote do hospital (documentos + resumo + números) gerado com um clique.
- **Simulador e proposta:** calcula antecipação com a taxa do negócio e gera PDF.
- **Carteira de operações:** recebíveis por hospital e operadora, vencimentos, alertas de atraso.
  Deve compartilhar o banco com o MVP de faturista.
- **Follow-ups automáticos:** lembrete quando contrato fica parado sem assinatura, quando documento não chega etc.
- **Registro de decisões** por cliente.
- **Painel:** funil, volume antecipado, receita por taxa.
- **Base de abordagem comercial:** como falar com cada tipo de cliente, objeções comuns.
