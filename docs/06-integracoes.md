# 06 — Integrações

Valores e regras levantados em nov/2026. Confirmar nas documentações oficiais antes de implementar.

## Google Drive (F1/F2)

- Uso: criar pasta por organização, salvar uploads e contratos assinados, depois indexar conteúdo da pasta "Org Sincra".
- API: Drive API v3. Notificações de mudança via `changes.watch` (canal com renovação periódica).
- Autenticação: OAuth com a conta dona da pasta, ou service account com a pasta compartilhada com ela.
- Cuidado: não mover nem apagar arquivos do Drive automaticamente.

## Google Calendar (F2)

- Uso: reunião marcada vira atividade no negócio; resumo do cliente antes da call.
- API: Calendar API v3, `events.watch` ou sincronização periódica.

## Assinatura eletrônica — descartada em 10/11/2026

Decisão: sem provedor de assinatura. A plataforma gera o PDF, o cliente assina pelo gov.br e um sócio sobe o PDF assinado.
O levantamento abaixo fica como referência caso o volume de contratos justifique rever.

- Por quê (ZapSign): brasileira, API simples, link de assinatura fácil de mandar por WhatsApp, assinatura com selfie/SMS.
- Planos de API (nov/2026): API Start US$ 39/mês com 80 documentos/mês; API Grow US$ 94/mês com 200;
  API Scale US$ 224/mês com 500. Há plano gratuito web com poucos documentos — útil para testar.
- Base legal: assinatura eletrônica com validade pela MP 2.200-2/2001; avançada e qualificada (ICP-Brasil) disponíveis.
- Fluxo: criar documento a partir de PDF → definir signatários → obter link de assinatura → webhook de status.
- Alternativas: Clicksign, D4Sign, DocuSign.
- Documentação: https://docs.zapsign.com.br

## GitHub (F1)

- Uso: eventos de código no feed.
- Configurar webhook no repositório do produto (e/ou desta plataforma) para `push` e `pull_request`.
- Validar `X-Hub-Signature-256` com `GITHUB_WEBHOOK_SECRET`.
- Filtrar: só branch principal e PR mergeado.
- Reescrever mensagens com a Claude API em uma frase simples; guardar original no `payload`.

## Claude API (F1/F2)

- F1: reescrita de eventos do GitHub.
- F2: resumo de reuniões, extração de campos, resumo do feed, busca no contexto (RAG com pgvector).

## Web Push (F1)

- PWA com `manifest.json` + service worker.
- Chaves VAPID; biblioteca `web-push` no servidor.
- iPhone: funciona com o app adicionado à tela inicial (iOS 16.4+).

## Instagram (F3)

- API: Instagram API com login pelo Instagram (conta profissional; não precisa de Página do Facebook).
- Permissões: `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`.
- Webhooks: `messages`, `comments` e outros. O app precisa estar em modo Live para receber webhooks.
- Como o app acessa só a conta da própria Sincra, verificar se o acesso padrão basta ou se é preciso passar pela revisão da Meta.
- Documentação: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login

## WhatsApp (F4)

- API: WhatsApp Cloud API (Meta), direto ou via provedor (BSP).
- Cobrança por mensagem de template entregue desde 1º/jul/2025. Brasil, a partir de jul/2026 em BRL:
  marketing ≈ R$ 0,32; utilidade e autenticação ≈ R$ 0,035; mensagens de atendimento (resposta dentro da janela) gratuitas.
- Fora da janela de atendimento, só com template aprovado.
- Precisa de número para a API e verificação do negócio na Meta.
- Documentação: https://developers.facebook.com/docs/whatsapp/pricing
