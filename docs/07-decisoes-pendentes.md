# 07 — Decisões

Registro do que foi decidido e do que ainda está em aberto. Ao fechar um item, marque a decisão, quem decidiu e a data.

## Fase 1 — decididas em 10/11/2026

| # | Decisão | Decisão tomada | Quem / quando |
|---|---|---|---|
| 1 | Quem constrói e quanto tempo por semana | Felipe constrói com o Claude Code. Pedro segue no MVP de faturista e entra na publicação | Felipe, 10/11/2026 |
| 2 | Stack e hospedagem | App Next.js rodando **local, direto no Node** (sem containers). Banco num **projeto Supabase na nuvem só para desenvolvimento** (não é produção), criado pelo Felipe. **Sem Docker/WSL**: a virtualização está desativada na máquina. Migração aplicada com `supabase link` + `supabase db push` (ou colada no SQL Editor); tipos gerados do projeto remoto. Edge Functions/webhooks viram rotas de API do Next.js por enquanto. Depois o Pedro publica no domínio da Sincra | Felipe, 10/11/2026 (revisado no mesmo dia: Supabase local descartado) |
| 3 | Assinatura eletrônica | **Sem provedor de assinatura (ZapSign descartado).** A plataforma só gera o contrato em PDF para download. O cliente assina pelo **gov.br**. Um sócio sobe o PDF assinado na plataforma: o status muda para assinado, o arquivo vai para a pasta do cliente no Drive e o evento entra no feed | Felipe, 10/11/2026 |
| 4 | Quais contratos entram no gerador | Em aberto até o Felipe enviar o contrato base. Até lá, `templates/contratos/` fica vazio e nenhum modelo é ativado | Felipe, 10/11/2026 |
| 5 | Revisão jurídica dos modelos | O contrato base já vem revisado. Versões novas seguem a mesma regra: só entram no gerador revisadas | Felipe, 10/11/2026 |
| 6 | Quem escreve no Drive | A plataforma pode criar pastas e gravar arquivos **somente dentro da pasta de cada cliente**. O resto do vault "Org Sincra" continua só com o Felipe | Felipe, 10/11/2026 |
| 7 | Funis | **Dois funis.** Hospitais e clínicas: prospecção → reunião → documentos → análise do fundo → contrato → operando → perdido. Médicos: contato → cadastro → adesão → operando → perdido. **Sem funil de fundo/investidor.** Etapas continuam configuráveis em tabela | Felipe, 10/11/2026 |
| 8 | Taxas padrão | 3,5% **ao mês** para hospital e 6% **ao mês** para médico. Configuráveis em `settings` | Felipe, 10/11/2026 |
| 9 | Repositórios no feed | Decidir quando o webhook do GitHub for ligado (depois da publicação) | Felipe, 10/11/2026 |

### Consequências das decisões

- **Sem portal externo.** Os documentos dos hospitais são enviados pelos próprios sócios na plataforma; o hospital não acessa nada. (Felipe, 10/11/2026)
- **Adiados até a publicação:** webhook do GitHub no feed e push no celular (PWA + Web Push). Rodando local, não há endereço público para receber webhooks nem HTTPS para push. (Felipe, 10/11/2026)

### A confirmar (assumido para não travar)

- A etapa "análise do fundo" continua no funil de hospitais e clínicas — a resposta tirou o funil de fundo, não essa etapa.
- Clínicas usam a taxa padrão de hospital (3,5% ao mês), já que estão no mesmo funil.
- A verificação de signatário (regra 3 do CLAUDE.md) passa a valer na geração do PDF, já que não há mais "envio para assinatura".
- **Documentos no Storage do Supabase até a conexão com o Drive** (10/11/2026). A decisão #6 manda gravar na pasta do
  cliente no Drive, mas isso exige um cliente OAuth do Google criado pelo Felipe. Conta de serviço não serve: em Drive
  pessoal (Gmail) ela não tem cota para ser dona dos arquivos. Enquanto isso, os arquivos ficam no bucket privado
  `documentos`, com registro em `documents.storage_path`; quando o Drive entrar, copiar para a pasta do cliente.
- Médicos pessoa física: o funil "Médicos" exige organização no negócio. Por ora, cadastrar o médico como organização
  do tipo "Outro".

## Fase 2 — decididas em 10/11/2026

| # | Decisão | Decisão tomada | Quem / quando |
|---|---|---|---|
| 15 | IA para ler transcrições | **Modelo local com Ollama**, no PC do Felipe: grátis e nada sai da máquina (LGPD). Lento (minutos por reunião) e só funciona com o PC ligado. O código fica preparado para trocar de fornecedor (Claude pago, por exemplo) sem refazer | Felipe, 10/11/2026 |
| 16 | Entrada das reuniões | **Transcrição em texto** que já vai para uma **pasta dentro de "Org Sincra"** no Drive. Sem áudio | Felipe, 10/11/2026 |
| 17 | Google (Drive e Calendar) | **Revisada em 11/11/2026:** o OAuth não foi possível. Drive pela **pasta sincronizada do Google Drive para computador** (`G:\Meu Drive\ORG. SINCRA`): documentos em `60 Documentos\Clientes\<organização>`, transcrições lidas de `60 Documentos\Transcrições` (.md/.txt). **Agenda desligada.** O código do OAuth fica pronto para quando a plataforma for publicada | Felipe, 11/11/2026 |
| 18 | Follow-ups automáticos | Os quatro alertas: negócio parado na etapa, documento pendente, tarefa atrasada, organização sem contato. Prazos configuráveis | Felipe, 10/11/2026 |

Ajustes decididos em 11/11/2026 (Felipe):
- Reuniões podem ser **com organização, internas (só sócios) ou com o fundo**; organização só é obrigatória no primeiro caso.
- Agendamento de reunião fica na plataforma, com botão para levar ao Google Agenda (sem API) e convite `.ics`.
- Novo tipo de organização **Médico** (substitui o uso de "Outro" para médico pessoa física).
- Modelos de lista de documentos têm **link de formulário** (Google Forms para o hospital enviar documentos).
- Pedro e Lessa cadastrados como sócios ativos (usuário + perfil) em 11/11/2026; entram pelo link mágico no e-mail.
- Ollama **não** inicia com o Windows por enquanto; a plataforma avisa quando ele está fechado.
- **Revisa a #7:** novo funil **Fundo e parcerias** (Proposta → Negociação → Contrato → Assinado → Perdido) para negócios com
  gestoras e parceiros, como a Baobá. Sem taxa padrão. Funis com ordem fixa (`pipelines.position`).
- Inventário de 11/11/2026 importado: 15 organizações, 30 pessoas, 5 negócios. A Sincra não entra como organização;
  pessoas sem organização confirmada ficaram sem organização (a organização provisória "Contatos avulsos" foi removida
  quando a plataforma passou a aceitar pessoa sem organização); "Hospital VITA Curitiba" foi juntado à "Vita Curitiba".
- Régua de relacionamento (complemento de 11/11/2026): profundidade N0–N3, situação e prioridade P1–P3 por pessoa.
  Fora da visão principal: sem resposta visível, recusas e vínculo não demonstrado. "Recusa grosseira" só com evidência
  ou confirmação do Felipe (nenhuma marcada até agora). Pedro e Lessa não entram como contatos (são sócios com login).
- 12/11/2026: localizações dos contatos informadas pelo Felipe; Hospital São José (Ituiutaba/MG) criado com Jaisson e
  Rogério; pessoa pode estar em mais de uma organização (Jabez e Marlon: Vita Curitiba + Hospital VITA Batel).
- 13/11/2026: Tarefas viraram quadro semanal com colunas por dia (não por pessoa). Os três sócios veem as tarefas de
  todos e podem pedir tarefa um ao outro: o pedido fica em "A agendar" com a data pedida, e quem recebeu escolhe o dia
  arrastando (desde 13/11 qualquer sócio pode arrastar qualquer cartão, igual a Negócios). Escolher dia, remarcar e concluir um pedido aparecem no feed para os três.
  Na mesma data: andamento (Para começar, Em andamento, Pausada, Concluída), prioridade, tarefa de vários dias com
  etapas, lixeira com restaurar e apagar de vez, cartões compactos ou abertos no padrão do design enviado pelo Felipe.

Consequências: com Ollama local, a extração só roda enquanto o app estiver rodando no PC do Felipe. Ao publicar,
será preciso decidir outro fornecedor para o servidor (ou manter a extração como passo feito do PC do Felipe).

## Fases seguintes — em aberto

| # | Decisão | Observação |
|---|---|---|
| 10 | Guardar conversas de WhatsApp | Decidido antes: conversas de WhatsApp não vão para o vault. A caixa de entrada na plataforma guardaria no banco — decisão nova, com impacto de LGPD |
| 11 | Instagram dentro da plataforma vale o esforço? | O Meta Business Suite já tem caixa de entrada; o ganho é ligar DM ao CRM |
| 12 | Número de WhatsApp para a API | Número dedicado da empresa |
| 13 | Dados de pacientes | Se recebíveis/guias entrarem, são dados de saúde: definir acesso, retenção e base legal |
| 14 | Integração com o MVP de faturista | Mesmo banco ou banco separado com sincronização |
