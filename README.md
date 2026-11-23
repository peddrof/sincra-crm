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

## Publicação (Vercel)

Publicada pelo Pedro na Vercel (time PV2CO), num endereço `*.vercel.app`, separado do sincra.app. O banco continua
o projeto Supabase do Felipe. `vercel.json` fixa as funções em São Paulo (`gru1`), perto do Supabase (sa-east-1).

Variáveis na Vercel (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (endereço publicado) e, para o Drive, as `GOOGLE_*`
(`docs/10-integracao-google.md`). Não definir `DRIVE_LOCAL_*` nem `IA_PROVEDOR=ollama` lá: dependem do PC.

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
