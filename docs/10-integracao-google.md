# 10 — Integração com o Google (Drive e Calendar)

> **Hoje (11/11/2026) a plataforma usa a pasta sincronizada, não a API.** Com o app Google Drive para computador,
> a pasta aparece em `G:\Meu Drive\ORG. SINCRA` e a plataforma (rodando no PC do Felipe) lê e grava direto nela.
> Configuração: variáveis `DRIVE_LOCAL_*` no `.env.local` (ver `.env.example`). A agenda está desligada.
> O passo a passo abaixo é para quando a plataforma for publicada e precisar falar com o Google pela API.

Passo a passo para criar as credenciais. Feito uma vez, pelo Felipe, na conta Google dona da pasta "Org Sincra".

A plataforma usa OAuth com a conta do Felipe, e não conta de serviço: em Drive pessoal (Gmail), conta de serviço
não tem cota para ser dona dos arquivos que cria.

## 1. Projeto no Google Cloud

1. Abra https://console.cloud.google.com e entre com a conta dona da pasta "Org Sincra".
2. No seletor de projetos (topo), **Novo projeto** → nome `Sincra Plataforma` → Criar. Deixe ele selecionado.

## 2. Ativar as APIs

Menu → **APIs e serviços → Biblioteca**. Procure e clique em **Ativar** em:

- Google Drive API
- Google Calendar API

## 3. Tela de consentimento (Google Auth Platform)

Menu → **APIs e serviços → Tela de consentimento OAuth** (ou "Google Auth Platform").

1. **Primeiros passos / Branding:** nome do app `Sincra Plataforma`, e-mail de suporte = o seu.
2. **Público (Audience):** tipo **Externo**.
3. **Usuários de teste:** adicione o seu e-mail.
4. **Publicar:** em Público, clique em **Publicar app** ("Em produção").
   Em modo de teste o Google derruba o acesso a cada 7 dias. Em produção sem verificação, o Google mostra o aviso
   "O Google não verificou este app" no login: clique em **Avançado → Acessar Sincra Plataforma**. Para uso só dos
   sócios isso basta; não precisa pedir verificação.

## 4. Cliente OAuth

Menu → **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth** (ou "Clientes → Criar cliente").

- Tipo: **Aplicativo da Web**
- Nome: `Sincra Plataforma (local)`
- **URIs de redirecionamento autorizados:** `http://localhost:3000/integracoes/google/retorno`
  (quando o Pedro publicar, acrescentar o mesmo caminho no domínio da Sincra)

Copie o **ID do cliente** e a **Chave secreta do cliente**.

## 5. Pastas do Drive

Abra cada pasta no Drive pelo navegador. O ID é o trecho da URL depois de `/folders/`.

- **Pasta dos clientes:** onde ficam (ou vão ficar) as pastas de cada cliente, dentro de "Org Sincra".
  A plataforma cria uma subpasta por organização aqui e só grava dentro delas (decisão #6).
- **Pasta das transcrições:** dentro de "Org Sincra", onde as transcrições das reuniões são salvas.

## 6. Chave secreta do Supabase

No painel do Supabase (projeto `sincra-plataforma-dev`): **Project Settings → API Keys → Secret keys** → copie a chave.
Ela guarda o acesso ao Google em nome da Sincra (todos os sócios usam a mesma conexão). Fica só no servidor.

## 7. Preencher o `.env.local`

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_DRIVE_CLIENTES_FOLDER_ID=...
GOOGLE_DRIVE_TRANSCRICOES_FOLDER_ID=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Depois: na plataforma, **Configurações → Conectar Google**, entre com a conta dona da pasta e autorize.

## Permissões pedidas

| Escopo | Para quê |
|---|---|
| `drive` | Ler a pasta "Org Sincra" e as transcrições; criar pastas de cliente e gravar documentos nelas |
| `calendar.readonly` | Listar as próximas reuniões |
| `openid`, `email` | Saber qual conta foi conectada |

O acesso ao Drive é amplo por exigência da API (ler pastas que a plataforma não criou). A regra do projeto continua:
a plataforma só grava dentro das pastas de clientes e nunca apaga nem move arquivos do Drive.
