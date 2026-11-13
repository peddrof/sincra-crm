# 02 — Arquitetura

## Componentes

Hoje o app roda local (Next.js no Node) ligado a um projeto Supabase na nuvem só de desenvolvimento. O Pedro publica depois no domínio da Sincra; webhooks e push
só funcionam a partir daí. Sem portal externo e sem provedor de assinatura (decisões de 10/11/2026).

```
                    ┌──────────────────────────────┐
  Sócios (web)      │   Next.js (local → domínio)  │
  ───────────────►  │   - telas internas           │
                    │   - rotas de API             │
                    │   - webhooks (após publicar) │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │   Supabase                   │
                    │   - Postgres (+ RLS)         │
                    │   - Auth (sócios)            │
                    │   - Storage (uploads temp.)  │
                    │   - pgvector (busca)         │
                    │   - Edge Functions / cron    │
                    └──────────────┬───────────────┘
                                   │
     ┌───────────────┬──────────────┼───────────────┐
     ▼               ▼              ▼               ▼
 Google Drive    GitHub         Claude API      Meta (fase 3+)
 + Calendar      (webhook,      (resumos,       Instagram /
                 após publicar) extração,       WhatsApp
                                busca)
```

Assinatura: fora da plataforma, pelo gov.br.

## Fontes da verdade

| Informação | Onde vive | Observação |
|---|---|---|
| Organizações, pessoas, negócios, etapas, taxas, tarefas | Banco | A plataforma é a fonte |
| Documentos (contrato social, contratos assinados, balanços) | Drive, pasta do cliente | Banco guarda referência e status |
| Notas, atas, base de conhecimento | Drive / vault "Org Sincra" | Plataforma lê e indexa |
| Eventos (feed) | Banco | |
| Conversas de Instagram/WhatsApp | A decidir | Ver decisões pendentes |

## Fluxos principais

### Reunião → contrato
1. Reunião acontece (Calendar cria a atividade no negócio).
2. Sócio sobe áudio ou transcrição.
3. IA extrai: dados cadastrais, próximos passos, decisões, campos do contrato.
4. Tela de confirmação: sócio revisa e aprova.
5. CRM atualiza; se houver contrato padrão aplicável, ele é gerado com os campos preenchidos.
6. Verificação do signatário → PDF final gerado e baixado → cliente assina pelo gov.br.
7. Sócio sobe o PDF assinado → status atualizado → arquivo salvo na pasta do cliente no Drive → evento no feed.

### Documentos do hospital
1. Negócio entra na etapa "documentos" → plataforma cria uma lista com os itens padrão.
2. Sócio recebe os arquivos do hospital (e-mail, WhatsApp, reunião) e sobe item a item.
3. Arquivos vão para a pasta do hospital no Drive; status por item no banco; evento no feed.

### Feed
Todo módulo grava em `activity_events`. Depois da publicação, o GitHub entra por webhook
e as notificações push saem conforme a preferência de cada sócio.

## Segurança

- Login apenas para os sócios (Supabase Auth, e-mails liberados manualmente).
- RLS em todas as tabelas: só usuário autenticado e ativo em `profiles` acessa.
- Sem acesso externo: clientes não acessam a plataforma.
- Webhooks (após a publicação) validados por assinatura/segredo.
