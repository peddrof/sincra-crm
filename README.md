# Sincra — Plataforma interna

Ferramenta de gestão dos sócios da Sincra: CRM, contratos, documentos, contexto do Drive,
feed de atualizações e, depois, Instagram e WhatsApp.

Stack: Next.js 16 (App Router, TypeScript, Tailwind 4) rodando direto no Node + um projeto Supabase na nuvem
só para desenvolvimento. Sem Docker nem WSL. A publicação no domínio da Sincra fica com o Pedro.
Decisões em `docs/07-decisoes-pendentes.md`.

## Pré-requisitos

- Node.js 20 ou mais novo
- Projeto Supabase de desenvolvimento (painel do Supabase) com as chaves em `.env.local` (modelo em `.env.example`)

## Rodar

```bash
npm install
npm run dev
```

App em http://localhost:3000.

## Reuniões (resumo pelo Claude ou ChatGPT)

Padrão desde 22/11/2026 (`IA_PROVEDOR=manual` ou vazio): os sócios resumem a reunião no Claude ou no ChatGPT, com a
assinatura deles, e trazem o texto para a plataforma (.md na pasta de transcrições do Drive ou colado). Em
**Reuniões → Copiar prompt** há o prompt que faz a resposta sair em JSON; nesse formato, resumo, decisões, próximos
passos e pessoas chegam preenchidos na tela de revisão. Com texto livre, ele vira o resumo e o resto é preenchido à mão.

Opcional, só no PC: `IA_PROVEDOR=ollama` usa o Ollama local (`ollama pull qwen2.5:7b`), como no começo do projeto.

## Google (Drive e agenda)

Passo a passo das credenciais em `docs/10-integracao-google.md`. Depois de preencher o `.env.local`, reinicie o
`npm run dev` e use **Configurações → Conectar Google**.

## Banco (projeto remoto, via Supabase CLI com npx)

Uma vez por máquina, faça login na CLI (abre o navegador):

```bash
npx supabase login
```

Ligar a pasta ao projeto e aplicar as migrações de `supabase/migrations/`:

```bash
npx supabase link --project-ref <project-ref>
```

```bash
npx supabase db push
```

O `link` pede a senha do banco. O projeto foi criado pelo conector do Supabase, então, se for usar a CLI,
redefina a senha em Project Settings → Database e coloque em `SUPABASE_DB_PASSWORD` no `.env.local`.

Gerar os tipos TypeScript a partir do projeto remoto:

```bash
npx supabase gen types typescript --project-id <project-ref> --schema public > lib/supabase/database.types.ts
```

Não use `supabase start`, `db reset`, `db diff` nem `db pull`: eles precisam de Docker.

## Cadastrar um sócio

Login por **e-mail e senha** (desde 22/11/2026; antes era link mágico, que dependia do e-mail padrão do Supabase).
Ninguém se cadastra sozinho (cadastro desligado no painel). Para liberar alguém:

1. No painel: Authentication → Users → Add user → Create new user, com e-mail, senha provisória e "Auto Confirm User".
2. No SQL Editor, criar o perfil ativo (sem ele, a pessoa entra e cai em "Acesso não liberado"):

```sql
insert into public.profiles (id, full_name, nickname)
select id, 'Nome Completo', 'Apelido' from auth.users where email = 'email@do.socio';
```

Para quem já existe sem senha (Felipe, Pedro e Lessa entravam por link), defina uma provisória no SQL Editor:

```sql
update auth.users
set encrypted_password = extensions.crypt('SENHA-PROVISORIA', extensions.gen_salt('bf'))
where email = 'email@do.socio';
```

Cada sócio troca a própria senha em **Configurações → Minha senha**.
Confira em Authentication → Providers → Email que o login por e-mail está ligado e o cadastro desligado.

Para bloquear alguém: `update public.profiles set active = false where id = '...'`.

## Publicação (Vercel + Cloudflare)

Endereço: **https://gestao.sincra.app** (decisão #24). Código em `peddrof/sincra-crm`, projeto `sincra-crm` na Vercel
(time PV2CO). `vercel.json` fixa as funções em São Paulo (`gru1`), perto do Supabase (sa-east-1).

**Login:** Cloudflare Zero Trust (Access) com Google, na frente do domínio. O `proxy.ts` confere o token da
Cloudflare em toda requisição (quem chama a Vercel direto leva 403) e `/auth/cloudflare` abre a sessão do Supabase
para o mesmo e-mail, sem senha. O e-mail do Google de cada sócio precisa ser o mesmo da conta dele no Supabase.
Sair encerra as duas sessões. O login por senha continua para rodar no PC (sem as variáveis `CF_ACCESS_*`).

Variáveis na Vercel (Production):

| Variável | De onde vem |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys (secret). Tipo Sensitive |
| `NEXT_PUBLIC_APP_URL` | `https://gestao.sincra.app` |
| `CF_ACCESS_TEAM_DOMAIN` | Cloudflare Zero Trust → Settings → Custom Pages (ex.: `sincra.cloudflareaccess.com`) |
| `CF_ACCESS_AUD` | Zero Trust → Access → Applications → gestao → Overview → Application Audience (AUD) Tag |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DRIVE_CLIENTES_FOLDER_ID`, `GOOGLE_DRIVE_TRANSCRICOES_FOLDER_ID` | `docs/10-integracao-google.md` |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Tipo Sensitive |
| `IA_PROVEDOR` | `manual` (já definida) |

Não definir `DRIVE_LOCAL_*` nem `IA_PROVEDOR=ollama` lá: dependem do PC.

Cloudflare (zona sincra.app):
1. DNS: `CNAME gestao → cname.vercel-dns.com`, **com proxy (nuvem laranja)**; sem proxy o Access não atua.
   SSL/TLS da zona em **Full (strict)**. A Vercel pode mostrar aviso de configuração por ver IPs da Cloudflare; funciona.
2. Zero Trust → Access → Applications → Add → Self-hosted: domínio `gestao.sincra.app`, login pelo Google,
   política Allow com os e-mails dos três sócios.
3. Vercel → Deployment Protection: Vercel Authentication em "All except custom domains", para os endereços
   `*.vercel.app` não ficarem abertos (o 403 do proxy já barra, isto é a segunda camada).

Documentos gravados na pasta sincronizada quando a plataforma rodava no PC (referências `local:`) só abrem por esse PC;
os arquivos continuam no Drive. Os novos, com o Google conectado, vão pela API para a pasta do cliente.

## Estrutura

```
sincra-plataforma/
├── CLAUDE.md                 contexto e regras para o Claude Code
├── AGENTS.md                 aviso do Next.js 16 para agentes (gerado pelo next dev)
├── app/                      rotas (App Router); área interna em app/(app)/
│                             (feed, negocios, organizacoes, tarefas, documentos, configuracoes)
├── components/               Logo, StatusPill, campos, tarefas, documentos
├── lib/                      auth, validação, regras de cada módulo e Server Actions (lib/actions/)
├── lib/supabase/             clientes do Supabase (navegador, servidor, proxy) e tipos gerados
├── proxy.ts                  renova a sessão do Supabase a cada requisição
├── design/                   tokens.css, tema Tailwind e símbolo (Brandbook Sincra)
├── docs/                     visão, arquitetura, módulos, spec da Fase 1, modelo de dados, decisões
├── supabase/
│   ├── config.toml           gerado pelo supabase init (o projeto na nuvem se configura pelo painel)
│   └── migrations/0001_init.sql
└── templates/contratos/      modelos revisados (vazio até chegar o contrato base)
```
