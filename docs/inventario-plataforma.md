# Inventário da plataforma Sincra

Estado em 11/11/2026. Campos com * são obrigatórios. Valores entre `crases` são os aceitos pelo sistema.

## Menu (barra lateral)

Início · Feed · Negócios · Organizações · Contatos · Reuniões · Conexões · Tarefas · Documentos · Configurações · Sair

---

## Início (dashboard)

- Saudação + botões: Ver funil · Agendar reunião
- Indicadores: Negócios abertos · Valor em negociação · Documentos pendentes · Tarefas atrasadas
- Presença no Brasil (mapa)
  - Organizações (círculos, por Tipo | Situação) e pessoas (quadrados em tons de Tinta, por profundidade) no mesmo mapa
  - Filtros de pessoas: visão e prioridade; legenda clicável por grupo; pessoas sem cidade em "Contatos sem localização"
  - Legenda clicável (mostra/esconde categoria)
  - Clique no ponto: tipo, cidade/UF, responsável, situação, pessoas, negócio aberto, notas, botão Abrir organização
  - Borda tracejada = sem cidade (ponto no centro do estado)
- Atenção (alertas automáticos do sócio logado)
- Minhas tarefas (até 6 abertas)
- Próximas reuniões (agendadas)
- Últimas atualizações (feed, não lidas primeiro)
- Documentos em aberto (barra de progresso por lista)
- Andamento da plataforma (recolhido)

## Feed

- Postar atualização
  - Texto* (menção com `@Felipe`, `@Pedro`, `@Lessa`)
  - Área: `comercial` · `produto` · `fundo` · `operacao` · `geral`
  - Organização (opcional)
  - Anexo (até 8 MB)
- Filtros
  - Tipo: Posts dos sócios · Organizações e pessoas · Negócios · Tarefas · Documentos · Alertas automáticos · Reuniões · Configurações e integrações
  - Área · Organização · Pessoa
  - Só menções a mim · Só não lidos
- Marcar tudo como lido
- Em cada item: marcar como lido · reagir · comentar · editar/apagar o próprio comentário · apagar o próprio post · link para o registro

## Negócios (funil)

- Kanban por funil, arrastar cartão entre colunas (mouse ou teclado)
- Filtros: Funil · Responsável
- Cartão: nome · organização · responsável · valor · taxa · atalho "Abrir lista de documentos" (etapa Documentos)
- Funis e etapas
  - Hospitais e clínicas: Prospecção → Reunião → Documentos → Análise do fundo → Contrato → Operando → Perdido
  - Médicos: Contato → Cadastro → Adesão → Operando → Perdido
  - Fundo e parcerias: Proposta → Negociação → Contrato → Assinado → Perdido
  - Operando = `ganho` · Perdido = `perdido` · demais = `aberto`

### Cadastro de negócio

| Campo | Formato / opções |
|---|---|
| Nome do negócio* | texto (ex.: Antecipação 2027) |
| Organização* | organização já cadastrada |
| Responsável | `Felipe` · `Pedro` · `Lessa` |
| Funil* | Hospitais e clínicas · Médicos |
| Etapa* | etapa do funil escolhido |
| Taxa (% ao mês) | número > 0 e < 100 (padrão: 3,5 hospital / 6 médico) |
| Valor estimado (R$) | ex.: 250.000,00 |
| Previsão de fechamento | data AAAA-MM-DD |
| Notas | texto |

### Página do negócio

Dados · Pessoas no negócio (qualquer pessoa, médica ou não, com papel) · Mover para a etapa · Editar dados · Agendar reunião · Abrir lista de documentos · Tarefas · Documentos · Histórico

## Organizações

- Lista com filtros: Tipo · Etapa · Responsável
- Clique na linha abre painel lateral (dados, negócios, pessoas, documentos, reuniões, atividade · Agendar reunião · Abrir página completa · Esc fecha)
- Botão Nova organização

### Cadastro de organização

| Campo | Formato / opções |
|---|---|
| Tipo* | `hospital` · `clinica` · `medico` · `operadora` · `fundo` · `outro` |
| Nome* | como a Sincra chama (nome fantasia) |
| Razão social | texto |
| CNPJ | numérico ou alfanumérico, com dígito válido |
| Responsável na Sincra | `Felipe` · `Pedro` · `Lessa` |
| Site | URL |
| Cidade | nome da cidade (usada no mapa) |
| UF | sigla de 2 letras |
| Observações | texto |

### Página da organização

Dados · Pessoas (Adicionar pessoa) · Negócios (Novo negócio) · Documentos (Abrir lista) · Contratos (aguarda contrato base) · Linha do tempo · Editar dados · Agendar reunião

### Cadastro de pessoa (dentro da organização)

| Campo | Formato / opções |
|---|---|
| Nome* | texto |
| Cargo | ex.: Diretor financeiro |
| E-mail | e-mail válido |
| Telefone | ex.: (81) 90000-0000 |
| CRM | só médicos, ex.: 12345/PE |
| Pode assinar | sim / não |
| Documento que comprova | documento já enviado da organização |
| Observações | texto |

## Contatos

- Visões: Visão principal (agrupada por P1/P2/P3) · Fila de revisão · Fora da visão principal · Todas
- Filtros: busca · Profundidade · Situação · Prioridade · Com/sem organização
- Pessoa com ou sem organização; CRM só para médicos
- Relacionamento: Tipo (`comercial` · `parceiro` · `prestador` · `mentor` · `ponte` · `interno` · `outro`) · Profundidade (`N3`…`N0`) ·
  Situação (`ativa` · `retomavel` · `em_aberto` · `sem_resposta` · `recusa` · `recusa_grosseira` · `evidencia_insuficiente`) ·
  Prioridade (`P1` · `P2` · `P3`) · Última interação · Confirmação pendente · Motivo · Próximo passo · Canal · Fontes ·
  Cidade/UF verificadas + natureza (`profissional` · `pessoal`)
- Fora da visão principal: sem resposta, recusas, N0, evidência insuficiente (nada é apagado)

## Reuniões

- Aviso se a IA local (Ollama) estiver desligada; formulários de IA ficam bloqueados
- Seções: Agendadas · Transcrições novas no Drive · Reuniões registradas
- Status: `agendada` · `processando` · `revisar` · `confirmada` · `erro`
- Contexto (em todo formulário): `organizacao` (exige organização) · `interna` (só sócios) · `fundo`

### Agendar reunião

| Campo | Formato / opções |
|---|---|
| Título* | ex.: Reunião de apresentação |
| Contexto* | organização · interna · fundo |
| Organização / Negócio | se contexto = organização |
| Data* · Hora* | AAAA-MM-DD · HH:MM (horário de Brasília) |
| Duração | minutos |
| Local | Google Meet, endereço ou sala |
| Participantes | sócios (marcar) · pessoas da organização (marcar) · outros e-mails |
| Notas | o que será tratado |

Depois de agendar: Adicionar ao Google Agenda (link) · baixar convite .ics · cancelar · anexar transcrição (do Drive ou colando o texto).

### Registrar transcrição

- Importar do Drive: arquivo `.md`/`.txt` da pasta `60 Documentos\Transcrições`
- Colar texto
- A IA extrai: resumo · decisões · próximos passos (tarefa, responsável, prazo) · pessoas (nome, cargo, e-mail, telefone)
- Tela "Revise antes de gravar": editar tudo e confirmar → cria tarefas e pessoas, registra no feed
- Em erro: Tentar de novo · Descartar

## Conexões

- Indicadores: Organizações · Pessoas · Negócios em aberto · Valor em negociação · Em operação · Estados
- Grafo: Sincra no centro → organizações → pessoas e negócios
  - Filtros: Organizações · Pessoas · Negócios
  - Busca por nome (Enter seleciona)
  - Zoom com a roda do mouse, arrastar, clique seleciona
- Painel lateral
  - Sem seleção: Por tipo · Por situação · Mais conectadas (top 5) · Sem pessoa de contato
  - Com seleção: dados do ponto + lista de ligações + botão Abrir
- Situação da organização: `em_aberto` (negócio aberto) · `operando` (negócio ganho) · `antigo` (só perdidos ou 90 dias sem atividade) · `sem_negocio`

## Tarefas

- Abas: Semana · Andamento · Lixeira; filtro por sócio: Todos · Felipe · Pedro · Lessa (os três veem tudo)
- Semana: 7 colunas (Seg a Dom) cabendo na tela; embaixo A agendar · Atrasadas (só se houver) · Próxima semana
  - Arrastar muda a entrega (`due_date`); tarefa de vários dias anda inteira (início acompanha)
  - Tarefa com início: faixa tracejada em cada dia entre o início e a véspera da entrega
  - "+" em cada dia: tarefa para mim (ou pedido, com outro sócio filtrado)
- Andamento: colunas Para começar · Em andamento · Pausada · Concluída (últimos 30 dias); arrastar muda o andamento
- Círculo do cartão: conclui (ou reabre) sem abrir o painel
- Cartões: Compactos (título, responsável, etapas; abre ao clicar) ou Abertos (padrão do design: título + criada em,
  linha, chips de prioridade, responsável, período, Atrasada, pedido p/, etapas e barra de progresso); preferência guardada no navegador
- Painel da tarefa (clique): andamento · etapas (marcar, tirar, adicionar) · título · descrição · prioridade · início · entrega · data pedida (quem pediu) · Mover para a lixeira
- Prioridade: Urgente · Importante · Normal · Baixa
- Qualquer sócio arrasta e edita qualquer tarefa (igual a Negócios); mover não troca o responsável; data pedida: só quem pediu
- Nova tarefa (recolhida): Título* · Responsável · Início (opcional) · Entrega (ou Data pedida) · Prioridade · Organização
- Pedido: tarefa para outro sócio nasce em A agendar com a data pedida (`requested_date`); quem recebeu arrasta para o dia
- Lixeira: quem pediu ou quem recebeu manda; Restaurar · Apagar de vez (confirma) · Esvaziar lixeira (confirma); some de quadro, início, negócio e alertas
- Feed: pediu · agendou · remarcou · tirou do dia · começou · pausou · concluiu (dia e andamento só em pedidos); link abre o painel da tarefa
- Status no banco: `status` aberta/concluida/cancelada + `progresso` a_fazer/em_andamento/pausada + `deleted_at` (lixeira)

## Documentos

- Abrir lista de documentos: Organização* + Modelo*
- Listas abertas com progresso
- Modelos (`/documentos/modelos`)
  - Nome do modelo* · Para o tipo (tipo de organização) · Documentos (um por linha) · Link do formulário (ex.: Google Forms)
  - Editar link do modelo · copiar link · arquivar modelo
- Página da lista: link do formulário (copiar) · por item: enviar arquivo (até 25 MB) · Baixar arquivo · Aprovar · Recusar (motivo) · Reabrir item
- Status do item: `pendente` · `recebido` · `aprovado` · `rejeitado`
- Arquivos vão para `G:\Meu Drive\ORG. SINCRA\60 Documentos\Clientes\<organização>`

## Configurações

- Sócios com acesso (ativos/inativos)
- Taxas padrão: Hospitais e clínicas (% ao mês) · Médicos (% ao mês)
- Prazos dos alertas (dias): Negócio parado na etapa · Documento pendente · Organização sem contato
- Drive (pasta sincronizada): caminhos da raiz, clientes e transcrições

## Automáticos (sem tela própria)

- Alertas diários às 08:00: negócio parado · documento pendente · tarefa atrasada · organização sem contato
- Tudo que muda em organização, pessoa, negócio, tarefa, documento e reunião vira evento no feed
- Login por link mágico no e-mail (sem senha). Sócios: Felipe, Pedro, Lessa

## Ainda não existe

- Contratos (aguarda contrato base)
- "Pergunte à Sincra" (busca com IA no Drive)
- Resumo do feed com IA
- Instagram · WhatsApp · carteira de operações

---

## Formato para devolver os dados

Uma tabela por cadastro, com estas colunas exatas. Deixe vazio o que não souber.

**organizacoes**: tipo · nome · razao_social · cnpj · responsavel · site · cidade · uf · observacoes

**pessoas**: organizacao (nome igual ao da tabela acima) · nome · cargo · email · telefone · crm · pode_assinar (sim/não) · observacoes

**negocios**: organizacao · nome · funil (Hospitais e clínicas / Médicos) · etapa · responsavel · taxa · valor · previsao (AAAA-MM-DD) · notas

**tarefas**: titulo · responsavel · prazo (AAAA-MM-DD) · organizacao · negocio

**modelos_documentos**: nome_modelo · tipo · link_formulario · documentos (um por linha)

**reunioes_agendadas**: titulo · contexto · organizacao · data · hora · duracao · local · participantes · notas
