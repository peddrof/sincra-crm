# 05 — Modelo de dados

Rascunho. A migração correspondente está em `supabase/migrations/0001_init.sql`.

As entidades seguem a mesma estrutura do vault "Org Sincra" (organizações, pessoas, negócios, conversas, ações,
documentos, decisões), para plataforma e vault falarem a mesma língua.

## Entidades

| Tabela | O que é | Vault |
|---|---|---|
| `profiles` | Sócios com acesso | — |
| `organizations` | Hospital, clínica, operadora, fundo, outro | organizações |
| `people` | Pessoas ligadas a organizações | pessoas |
| `pipelines`, `pipeline_stages` | Funis e etapas configuráveis | — |
| `deals` | Negócios | negócios |
| `interactions` | Reuniões, ligações, e-mails, notas, mensagens | conversas |
| `tasks` | Tarefas | ações |
| `decisions` | Decisões registradas | decisões |
| `document_checklists`, `document_checklist_items` | Modelos de lista de documentos | — |
| `document_requests`, `document_request_items` | Solicitação enviada a uma organização | — |
| `documents` | Arquivos (referência ao Drive) | documentos |
| `contract_templates` | Modelos de contrato | — |
| `contracts`, `contract_signers` | Contratos gerados e signatários | — |
| `activity_events` | Feed | — |
| `event_comments`, `event_reactions`, `event_reads` | Interação no feed | — |
| `notification_preferences`, `push_subscriptions` | Notificações | — |
| `settings` | Configurações (ex.: taxas padrão) | — |

## Relações principais

```
organizations 1─N people
organizations 1─N deals ─N─1 pipeline_stages ─N─1 pipelines
deals 1─N interactions / tasks / decisions / contracts / documents
organizations 1─N document_requests 1─N document_request_items ─1─1 documents
contract_templates 1─N contracts 1─N contract_signers ─N─1 people
activity_events → (entity_type, entity_id) aponta para qualquer entidade
```

## `activity_events`

| Coluna | Uso |
|---|---|
| `actor_type` | `user`, `system`, `github` (sem portal externo nem provedor de assinatura) |
| `actor_id` | sócio, quando `actor_type = user` |
| `event_type` | ex.: `organization.created`, `deal.stage_changed`, `contract.signed`, `code.pushed`, `post.created` |
| `area` | `comercial`, `produto`, `fundo`, `operacao`, `geral` |
| `entity_type`, `entity_id` | o que mudou |
| `organization_id` | para filtrar o feed por cliente |
| `summary` | frase exibida no feed |
| `payload` | dados brutos (ex.: commits originais) |
| `mentions` | sócios mencionados |

## Observações

- Taxas padrão ficam em `settings`, não em constantes no código.
- `people.can_sign` + `people.signing_evidence_document_id` sustentam a verificação de signatário.
- `documents.drive_file_id` é a referência; o arquivo mora no Drive.
- `deals.amount_estimate` em centavos (`bigint`) para evitar erro de arredondamento.
