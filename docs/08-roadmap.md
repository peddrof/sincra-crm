# 08 — Roadmap

Sugestão de fases. O Felipe constrói com o Claude Code, em local (decisão #1, 10/11/2026).

## Fase 1 — Núcleo
Auth · organizações e pessoas · negócios e funil · feed de atualizações (interno) ·
tarefas · documentos dos hospitais · gerador de contratos (PDF para assinar no gov.br).

## Publicação (Pedro, no domínio da Sincra)
Hospedagem · webhook do GitHub no feed · PWA + push no celular.

Saída: a plataforma já substitui planilha, lista de documentos por WhatsApp e contrato montado à mão.

## Fase 2 — Contexto
Sincronização e busca na pasta "Org Sincra" · Google Calendar · reunião → extração por IA → confirmação → CRM e contrato ·
resumo diário/semanal do feed · follow-ups automáticos.

Situação em 11/11/2026:
- Feito: follow-ups automáticos (alertas + job diário), conexão com o Google, documentos indo para a pasta do cliente
  no Drive, agenda com resumo do cliente, reunião → extração com IA local → confirmação → CRM.
- Falta: busca na pasta "Org Sincra" ("Pergunte à Sincra", com índice e embeddings locais) e resumo diário/semanal
  do feed com IA. O preenchimento de contrato a partir da reunião espera o módulo de contratos.

## Fase 3 — Instagram
Caixa de entrada de DMs e comentários do @sincra.app, vinculada ao CRM.

## Fase 4 — WhatsApp e operação
Caixa de entrada WhatsApp · carteira de operações (recebíveis, vencimentos, atrasos) ·
dossiê para o fundo · simulador e proposta · painel.

## Atalho se a Fase 1 apertar
Integrações por n8n ou Zapier (Drive, GitHub → feed) e interface construída aos poucos por cima.
