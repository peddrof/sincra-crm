# CLAUDE.md — Plataforma interna da Sincra

Contexto para o Claude Code. Leia este arquivo e `docs/` antes de propor ou escrever código.

## O que é

Plataforma de gestão **interna** da Sincra Tecnologia Ltda. (sócios: Felipe Miranda, Pedro Veríssimo, João Lessa).
Não é o produto da Sincra para médicos e hospitais. É a ferramenta que os sócios usam para tocar a empresa:
CRM, contratos, documentos, contexto do Drive, feed de atualizações e, depois, Instagram e WhatsApp.

A Sincra faz antecipação de recebíveis médicos (hospitais e médicos), com fundo parceiro. Contrapartes típicas:
hospitais, clínicas, médicos, operadoras de saúde (quem paga os recebíveis) e fundos/investidores.

## Status das definições

Diferencie sempre o que está decidido do que é sugestão. Hoje:

- **Decidido pelo Felipe:** existir a plataforma; módulos de CRM, gerador de contratos a partir dos dados do cliente,
  integração com o Drive, Instagram vinculado, WhatsApp no futuro, feed de atualizações dos sócios
  (incluindo pushes do Pedro no código).
- **Decidido em 10/11/2026** (detalhes em `docs/07-decisoes-pendentes.md`):
  - Felipe constrói com o Claude Code. App local (Node, sem containers) + projeto Supabase na nuvem só para desenvolvimento;
    o Pedro publica depois no domínio da Sincra.
  - **Sem assinatura eletrônica integrada:** a plataforma gera o PDF, o cliente assina pelo gov.br e um sócio sobe o PDF assinado.
  - **Sem portal externo:** os sócios sobem os documentos dos hospitais.
  - Dois funis: hospitais e clínicas; médicos. Sem funil de fundo.
  - Taxas padrão em % ao mês (3,5% hospital, 6% médico), configuráveis.
  - A plataforma só grava no Drive dentro da pasta de cada cliente.
  - Adiados até a publicação: webhook do GitHub e push no celular.
- **Decidido pelo Pedro em 22/11/2026** (#19–#23 em `docs/07-decisoes-pendentes.md`; confirmar com o Felipe o que revisa decisões dele):
  publicação na Vercel do Pedro em `*.vercel.app` (fora do sincra.app), banco = projeto Supabase do Felipe,
  login por e-mail e senha, reuniões sem IA na plataforma (resumo no Claude/ChatGPT, `IA_PROVEDOR=manual`),
  Drive pela API com a conta Gmail da Sincra.
- **Sugestão (ainda não aprovada):** framework (Next.js), modelo de dados, regras de notificação.
- **Em aberto:** quais contratos entram no gerador (aguardando o contrato base do Felipe); repositórios no feed.

Não trate sugestão como decisão. Se algo depender de uma decisão em aberto, pergunte ou deixe configurável.

## Stack

- **Decidido:** app roda local com Node (`npm run dev`). Banco num projeto Supabase **na nuvem, só de desenvolvimento**:
  Postgres, Auth, Storage, pgvector.
- **Sem Docker, WSL nem virtualização** (desativada na máquina). Antes de instalar ferramenta ou rodar comando que
  exija isso, pare e pergunte ao Felipe. Supabase CLI via `npx`, só comandos que falam com o projeto remoto:
  `link`, `db push`, `gen types typescript --project-id`, `functions deploy`. Nunca `start`, `db reset`, `db diff`, `db pull`.
- Edge Functions e webhooks: por enquanto, rotas de API do Next.js (`app/api/...`).
- **Sugestão:** Next.js (App Router) + TypeScript + Tailwind.
- **Código:** repositório privado `felipespk/sincra-plataforma` no GitHub, branch `main` (criado em 13/11/2026).
  Commit e push só quando o Felipe pedir. `.env.local` fica fora (`.gitignore`); antes de cada commit,
  conferir que nenhuma chave entrou.
- **Publicação:** depois, pelo Pedro, no domínio da Sincra (provedor a definir).
- Integrações: Google Drive API, Google Calendar API (F2), GitHub webhooks (após publicar), Meta (Instagram/WhatsApp, F3+).
  Sem API de assinatura eletrônica.

## Regras do projeto

1. **Idioma:** interface, textos e documentação em português do Brasil. Código (nomes de variáveis, tabelas) em inglês.
2. **Contratos:** a automação **só preenche campos** de modelos revisados e aprovados e gera o PDF para download.
   Nunca gerar ou reescrever cláusulas com IA. A assinatura acontece fora da plataforma (gov.br); o sócio sobe o PDF assinado.
   Contratos negociados (ex.: cessão de recebíveis com hospital e fundo) seguem fluxo de revisão.
3. **Signatário:** antes de gerar o PDF final, verificar se a pessoa tem poderes para assinar pela organização
   (contrato social ou procuração já recebidos). Se não houver evidência, bloquear ou exigir confirmação explícita registrada.
4. **Feed de eventos desde o início:** toda ação relevante grava um registro em `activity_events`.
   Ao criar qualquer mutação nova, registre o evento correspondente.
5. **LGPD:** dados de médicos e, potencialmente, de pacientes (guias, recebíveis) são pessoais ou sensíveis.
   RLS ligado em todas as tabelas, acesso restrito aos sócios, log de quem viu/alterou o que for sensível.
6. **Segredos:** nunca commitar chaves. Usar `.env.local` e as variáveis do ambiente de publicação. Ver `.env.example`.
7. **Sem acesso externo:** só os sócios usam a plataforma. Documentos de hospitais são enviados pelos sócios;
   não há portal nem link para clientes.
8. **Drive:** a pasta "Org Sincra" no Google Drive continua sendo o lugar dos documentos e notas.
   A plataforma só cria pastas e grava arquivos **dentro da pasta de cada cliente**; o resto do vault é só leitura.
   Não apaga nem reorganiza arquivos do Drive sem ação explícita de um sócio.
9. **Identidade visual:** toda interface segue o **Brandbook Sincra**:
   https://claude.ai/artifact/UAphUQy2H2KNT8Qan1MCU8
   Consulte o brandbook antes de criar ou alterar qualquer tela, componente ou texto da interface.
   Ele é a fonte oficial de cores, tipografia, logo, elementos gráficos e tom de voz.
   Não invente cores, fontes ou versões do logo fora dele. Se não conseguir abrir o link, pare e avise.

## Mapa da pasta

- `docs/01-visao.md` — objetivo e princípios
- `docs/02-arquitetura.md` — componentes e fluxo de dados
- `docs/03-modulos.md` — todos os módulos, inclusive futuros
- `docs/04-fase-1-spec.md` — **o que construir primeiro**, com telas e critérios de aceite
- `docs/05-modelo-de-dados.md` — entidades e relações
- `docs/06-integracoes.md` — APIs externas, permissões e custos
- `docs/07-decisoes-pendentes.md` — decisões tomadas (com data) e o que ainda está em aberto
- `docs/08-roadmap.md` — fases
- `docs/09-identidade-visual.md` — resumo do brandbook aplicado à plataforma
- `design/` — `tokens.css`, `tailwind-theme.css` (importados em `app/globals.css`) e o SVG do símbolo
- `components/Logo.tsx`, `components/StatusPill.tsx` — assinatura e pílula de status do brandbook; use sempre estes
- `lib/supabase/` — clientes do Supabase (`client.ts` navegador, `server.ts` servidor, `proxy.ts` sessão)
- `proxy.ts` — no Next.js 16 o `middleware` se chama `proxy`; renova a sessão do Supabase
- `supabase/config.toml` — gerado pelo `supabase init`; não vale para o projeto na nuvem (lá a configuração é pelo painel)
- `supabase/migrations/` — `20261110222040_init.sql` (esquema) e `20261110222105_harden_functions.sql`
  (`is_active_member` no schema `private`, fora da API). Nomes iguais ao histórico do projeto remoto.
- `lib/supabase/database.types.ts` — tipos gerados do projeto remoto; regerar após cada migração
- Projeto Supabase de dev: `sincra-plataforma-dev`, ref `ailthwmnfzilabdcoxav`, sa-east-1, na org pessoal do Felipe
  ("felipe agrohub project"). Nunca na org PV2CO (é do Pedro). Rodar o Security Advisor após cada migração.
- `templates/contratos/` — modelos de contrato (vazio até o Felipe enviar o contrato base revisado)

## Como começar

1. Ler `docs/04-fase-1-spec.md`.
2. Ler `docs/07-decisoes-pendentes.md` (decisões da Fase 1 fechadas em 10/11/2026).
3. Setup feito em 10/11/2026: Next.js 16 + Tailwind 4 + identidade visual + clientes do Supabase.
   Para rodar, ver `README.md` (Supabase na nuvem; sem Docker).
   Next.js 16 tem APIs novas: antes de escrever código, consulte `node_modules/next/dist/docs/` (ver `AGENTS.md`).
   `cacheComponents` está ligado: leitura de cookies/sessão fica dentro de `<Suspense>`.
   Autenticação feita em 10/11/2026: `/login` (link mágico, `shouldCreateUser: false`), `/auth/confirm`, `/sem-acesso`,
   `proxy.ts` manda quem não tem sessão para `/login`, e `lib/auth.ts` (`getSocio`) exige perfil ativo em `profiles`.
   Toda página nova da área interna fica em `app/(app)/`, que já passa pelo `getSocio`. Server Actions chamam `getSocio` de novo.
   Padrão de página interna (exigência do `cacheComponents`): o `export default` é síncrono e envolve o conteúdo assíncrono
   em `<Suspense fallback={<Carregando />}>`. `lib/supabase/server.ts` chama `connection()` antes de tudo (o cliente lê o relógio).
   Componente client com `usePathname`/`useSearchParams` também fica dentro de `<Suspense>`, inclusive em fallback.
   Organizações e pessoas (10/11/2026): `app/(app)/organizacoes/`, ações em `lib/actions/crm.ts`, CNPJ (numérico e
   alfanumérico) em `lib/validacao.ts`. Eventos de CRM são gravados por gatilho no banco (`private.registrar_evento_crm`):
   não grave evento na aplicação para organização/pessoa, senão duplica.
   Feed (10/11/2026): `app/(app)/feed/`, ações em `lib/actions/feed.ts`, visão `feed_eventos` (lido, menção, comentários).
   `activity_events` é imutável: inserção só em nome próprio, apagar só o próprio post. Anexos no bucket privado
   `feed-anexos` (8 MB), baixados por `/feed/anexo/[id]` com link assinado de 60 s. Menção = `@apelido` no texto.
   Módulo novo com mutação: crie gatilho igual ao do CRM ou grave o evento na Server Action (actor_id = sócio).
   Negócios, tarefas, documentos e configurações (10/11/2026): eventos por gatilho (`private.registrar_evento_operacao`);
   status do negócio sai da etapa (`private.ajustar_negocio`: operando = ganho, perdido = perdido) e a etapa tem de ser
   do mesmo funil. Kanban em `app/(app)/negocios/` (arrastar chama `moverNegocio`). Tarefas em `components/tarefas/`:
   quadro semanal (`QuadroSemana`, arrastar chama `moverTarefa`; qualquer sócio move, igual a Negócios). Pedido entre sócios =
   `created_by <> assignee_id`: nasce sem `due_date`, com `requested_date`; eventos por `private.registrar_evento_tarefa`
   (13/11/2026, substitui o ramo de tarefas de `registrar_evento_operacao`). Andamento em `tasks.progresso`, prioridade,
   `start_date` (vários dias), etapas em `task_steps` e lixeira por `deleted_at`: toda consulta de tarefas precisa de
   `.is("deleted_at", null)` (o alerta `alertas_followup` já ignora a lixeira).
   Documentos: modelos em `/documentos/modelos`, listas por organização em `/organizacoes/[id]/documentos/`; o navegador
   envia o arquivo direto ao bucket privado `documentos` (25 MB) e `registrarArquivo` confere a pasta e grava o registro.
   **Pendente:** contratos (aguardam o contrato base).
   Fase 2 (11/11/2026, decisões #15–#18):
   - Follow-ups: `public.alertas_followup()` (cálculo ao vivo, bloco "Atenção" na página inicial) e job `pg_cron`
     diário às 8h (`private.gerar_followups`) que publica no feed como `system`, no máximo 1 vez/semana por item.
     Prazos em `settings` (`followup_*_dias`), editáveis em Configurações.
   - Google: OAuth da conta do Felipe (`lib/google/`), token criptografado (AES-256-GCM) em `public.integracoes_google`,
     tabela sem políticas, lida só com `lib/supabase/admin.ts` (service role). Use o admin só para isso.
     Credenciais: `docs/10-integracao-google.md`. Documento recebido é copiado para a pasta do cliente no Drive
     (`lib/documentos-drive.ts`, via `after`) e some do Storage; sem Google, fica no Storage.
   - Reuniões: transcrição (Drive ou colada) → `lib/ia/extracao.ts` (Ollama local, `qwen2.5:7b`, ~2 min por reunião
     curta) → status `revisar` → sócio confirma (`confirmar`) → tarefas, decisões e pessoas no CRM + evento.
     A transcrição não é guardada no banco. Para trocar de IA, implemente outro provedor em `extracao.ts` (IA_PROVEDOR).
   - Agenda: `components/ProximasReunioes.tsx` cruza convidados com pessoas/sites das organizações (só com a API do Google).
   Ajustes de 11/11/2026 (lista do Felipe):
   - Drive pela pasta sincronizada `G:` (`lib/drive-local.ts`, referências `local:<caminho>`); API do Google fica para a publicação.
   - Reuniões: `contexto` = organização | interna | fundo; status `agendada` + página `/reunioes/agendar`, link
     "Adicionar ao Google Agenda" e convite `.ics` (`/reunioes/[id]/convite`). Aviso quando o Ollama está fechado (`iaDisponivel`).
   - Formulários usam `components/AvisoAlteracoes.tsx` (pergunta antes de sair sem salvar). Use em todo formulário novo.
   - Funil com `@dnd-kit/core` (arrastar com mouse/teclado; `DndContext` com `id` estável para não quebrar a hidratação).
   - Organizações: clique na linha abre painel lateral (`?ver=<id>`, `PainelOrganizacao.tsx`); tipo novo "médico".
   - Modelos de lista com `link_formulario` (ex.: Google Forms), copiado para cada lista aberta.
   - Comentários: autor edita e apaga; autor apaga o próprio post.
   - Visual mais azul (pedido do Felipe): botão principal em Azul Sincra, céu só no topo da página inicial, indicadores azuis.
   - Navegação em **barra lateral** (`app/(app)/layout.tsx`; no celular vira cabeçalho com a lista rolando na horizontal).
   - `/conexoes`: grafo (`react-force-graph-2d`) com a **Sincra no centro ligando todas as organizações** (nada ligado a um
     sócio só), painel de dados ao lado (clique num ponto) e indicadores. Mapa do Brasil (`components/rede/MapaBrasil.tsx`, `d3-geo`)
     fica na **página inicial** (estados em `public/geo`, coordenadas dos
     municípios em `lib/geo/municipios.json`, dados abertos MIT). O GeoJSON do IBGE precisa da correção de sentido por polígono.
     `/geo/` fica fora do `proxy` (dados públicos).
   - **Contatos** (`/contatos`): pessoa com ou sem organização (mentor, contador, advogado, investidor não viram médico nem
     ganham organização falsa). Régua em `lib/relacionamento.ts`: profundidade N0–N3, situação, prioridade P1–P3, independentes.
     `visaoDaPessoa`: sem resposta, recusas, N0 e evidência insuficiente saem da visão principal (nada é apagado);
     confirmação pendente ou sem classificação vão para a fila de revisão. Local da pessoa só quando informado/verificado (nunca pelo DDD nem
     pelo endereço da organização); natureza profissional/pessoal opcional. Mapa da página inicial mostra organizações
     (círculos coloridos) e pessoas (quadrados em tons de Tinta por profundidade) juntas; sem local, a pessoa fica em "Contatos sem localização".
   - `deal_people`: pessoas (médicas ou não) ligadas a negócios reais; não cria oportunidade.
   - `pessoa_organizacoes`: vínculos adicionais (a principal segue em `people.organization_id`); pessoas de uma organização
     via `lib/pessoas-org.ts`. **Atenção:** com essa tabela, todo embed pessoa↔organização precisa do hint
     `organizations!people_organization_id_fkey` / `people!people_organization_id_fkey` (senão a API dá PGRST201).
   - Funil **Fundo e parcerias** (`pipelines.position` define a ordem dos funis).
4. Construir na ordem: auth → organizações/pessoas → feed de eventos → negócios/funil → tarefas → documentos → contratos
   (este último quando o contrato base chegar).
