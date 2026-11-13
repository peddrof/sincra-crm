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

## IA local (reuniões)

A leitura das transcrições usa o Ollama no próprio PC (nada sai da máquina). Instalado com `winget install Ollama.Ollama`
e o modelo com `ollama pull qwen2.5:7b` (4,7 GB). O app Ollama precisa estar aberto (ele inicia com o Windows);
se não estiver, rode `ollama serve`. Neste notebook, uma reunião curta leva cerca de 2 minutos.

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

Ninguém se cadastra sozinho (cadastro desligado no painel e `shouldCreateUser: false` no login). Para liberar alguém:

1. No painel: Authentication → Users → Add user → Create new user, com o e-mail e "Auto Confirm User" marcado.
2. No SQL Editor, criar o perfil ativo (sem ele, a pessoa entra e cai em "Acesso não liberado"):

```sql
insert into public.profiles (id, full_name, nickname)
select id, 'Nome Completo', 'Apelido' from auth.users where email = 'email@do.socio';
```

Para bloquear alguém: `update public.profiles set active = false where id = '...'`.

O envio de e-mail padrão do Supabase só entrega para membros da organização no painel e tem limite baixo por hora.
Para os três sócios receberem o link, eles entram na organização do Supabase ou vocês configuram um SMTP próprio.

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
