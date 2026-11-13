# 09 — Identidade visual

Fonte oficial: **Brandbook Sincra** (artefato no Claude). Este arquivo resume o que vale para a plataforma interna.
Se algo aqui divergir do brandbook, o brandbook vence. Tokens prontos em `design/tokens.css`.

## Como aplicar na plataforma

A plataforma interna é uma interface de produto, então segue as regras de **produto** do brandbook:

- **Inter em toda a interface** (texto, botões, tabelas, valores, datas). O brandbook reserva a Plus Jakarta Sans
  para títulos de comunicação (site, posts, slides, documentos) e diz "nunca no produto".
  Exceção possível: tela de login e documentos gerados (PDF de proposta, dossiê), que são comunicação.
- **Muito branco, azul só onde há ação.** Proporção de referência do site: ~66% branco, ~14% Superfície,
  ~12% Azul Sincra, ~6% Tinta, ~2% status.
- **No máximo um céu por tela.** Na plataforma, o céu cabe na tela de login ou num cabeçalho de destaque — não em
  listas, kanban ou formulários.
- **Números tabulares** (`font-variant-numeric: tabular-nums`) em valores, datas e tabelas.
- **Caixa de sentença** em tudo: maiúscula só na primeira palavra e em nomes próprios ("Novo contrato", não "Novo Contrato").

## Paleta principal

| Nome | HEX | Uso |
|---|---|---|
| Azul Sincra | `#147DFF` | Ação, destaque, céu |
| Azul profundo | `#003DFF` | **Só** no degradê do símbolo |
| Azul tinta | `#0B63D9` | Links e texto azul |
| Tinta | `#13161F` | Texto, valores, fundo escuro |
| Branco | `#FFFFFF` | Fundo principal |
| Superfície | `#F8F9FA` | Blocos e painéis |

## Escala do azul

| 25 | 50 | 100 | 200 | 300 | 400 | Sincra | Tinta | Profundo |
|---|---|---|---|---|---|---|---|---|
| `#F3F8FF` | `#E7F2FF` | `#D6E8FF` | `#9CC5FF` | `#6EAFFF` | `#3F92FF` | `#147DFF` | `#0B63D9` | `#003DFF` |

## Neutros (quanto mais claro, menos importante)

| Tinta | Tinta 2 | Tinta 3 | Cinza | Cinza 2 | Cinza 3 | Linha | Superfície |
|---|---|---|---|---|---|---|---|
| `#13161F` | `#2F3440` | `#464C59` | `#6A7180` | `#8A919E` | `#B4BAC4` | `#E6E9EE` | `#F8F9FA` |

- Texto corrido: Tinta, Tinta 2 ou Tinta 3.
- Texto secundário: Cinza.
- **Cinza 2 e Cinza 3 não servem para texto** (contraste abaixo do mínimo) — só ícones, rótulos repetidos e linhas.

## Status

O status **sempre vem com a palavra**, nunca só com a cor. Formato: pílula com ponto, texto e fundo claro.

| Tipo | Texto | Fundo | Exemplo do brandbook |
|---|---|---|---|
| Concluído | `#1A7F4B` | `#E9F7EF` | Pago |
| Atenção | `#8F5A00` | `#FFF6DD` | Pendência |
| Crítico | `#B42318` | `#FEF0EE` | Em atraso |
| Andamento | `#0B63D9` | `#E7F2FF` | Em análise |
| Neutro | `#6A7180` | `#F8F9FA` + borda `#E6E9EE` | Faturado |

Mapeamento sugerido para a plataforma (ajustável):

| Tipo | Estados da plataforma |
|---|---|
| Concluído | contrato assinado, documento aprovado, tarefa concluída, negócio operando/ganho |
| Atenção | aguardando assinatura, documento pendente, tarefa vencendo |
| Crítico | assinatura recusada, documento rejeitado, tarefa atrasada |
| Andamento | em revisão, em análise do fundo |
| Neutro | rascunho, cancelado, perdido, arquivado |

## Tipografia

| Família | Pesos | Onde |
|---|---|---|
| Inter | 400, 500, 600 | Toda a interface da plataforma e o logotipo |
| Plus Jakarta Sans | 600 | Só comunicação (login, PDFs gerados), nunca no miolo do produto |

Ambas no Google Fonts (SIL OFL). No Next.js, carregar com `next/font/google`.

Hierarquia: o brandbook define estilos para slides (1920 px). Na interface, usar a mesma hierarquia em escala menor.
Sugestão para a plataforma:

| Estilo | Fonte | Tamanho/entrelinha | Peso | Cor |
|---|---|---|---|---|
| Título de página | Inter | 28/34 | 600, tracking −2% | Tinta |
| Linha fina | Inter | 16/24 | 500 | Cinza → Tinta |
| Título de bloco | Inter | 18/24 | 600, tracking −1,5% | Tinta |
| Corpo | Inter | 14/22 | 400 | Tinta 3 |
| Rótulo | Inter | 12/16 | 600 | Azul tinta ou Cinza |
| Valor em destaque | Inter | 24–32 | 600, tracking −2,5%, tabular | Tinta, com "R$" em Cinza 2 |

A "linha fina" do brandbook combina duas cores numa frase: primeira parte em Cinza, segunda em Tinta.

## Logo (assinatura)

- Arquivo do símbolo: `design/assets/sincra-simbolo.svg` (quadrado arredondado com degradê `#003DFF` → `#147DFF` a 45° e os dois arcos brancos).
- O nome "Sincra" é texto em **Inter 600**, tracking ≈ −2,5%.
- Proporções (H = altura do símbolo): nome com 0,9 H; 0,3 H entre símbolo e nome; área de proteção de 0,5 H nos quatro lados.
- No cabeçalho do site: símbolo 28 px, nome 25 px, 8 px de espaço. Usar a mesma medida no cabeçalho da plataforma.
- Mínimos: assinatura com símbolo de 20 px; símbolo isolado com 16 px.
- Não existe versão vertical: em espaço quadrado (favicon, avatar, ícone do PWA) usar o símbolo isolado.

Versões:

| Versão | Fundo | Nome |
|---|---|---|
| Principal | Branco ou Superfície | Tinta |
| Sobre o céu | Céu | Branco |
| Sobre Tinta | `#13161F` | Branco |
| Uma cor (positiva/negativa) | Impressão em uma cor | — (exportar do brandbook quando precisar) |

Restrições: não distorcer, não girar, não trocar a cor do símbolo, não aplicar sombra ou brilho, não trocar a fonte do nome,
não mudar a proporção, **não usar sobre azul médio**, não usar os arcos sem o quadrado.

## Céu

- Degradê vertical, claro em cima: `#F3F8FF` → `#6EAFFF` → `#147DFF`, com feixes de luz desfocados.
- Texto sobre o céu é sempre branco.
- O degradê do símbolo (profundo, 45°) **não vira fundo**.

## Elementos gráficos

Seis recursos, cada um com uma função. Se não organiza a página, não entra.

| Elemento | Uso na plataforma |
|---|---|
| Céu | Login ou cabeçalho de destaque. Um por tela |
| Cartão de produto | Cartões brancos com valor em destaque (ex.: painel, resumo do negócio) |
| Ladrilho de ícone | Ícone de traço em quadrado branco arredondado, **sempre com a palavra** |
| Selo de previsão | "Previsão · Sincra" — marcar o que a plataforma calcula (ex.: simulador, resumo da IA) |
| Fio com pontos | Linhas finas `#E6E9EE`/`#D3D8DF` com pontos nos cruzamentos, para estruturar seções |
| Retícula | Textura de pontos num canto de cartões azuis. Uso raro |

Ícones: traço (ex.: Lucide), cor Tinta, nunca preenchidos coloridos.

## Tom de voz nos textos da interface

- **Precisa, mas não fria:** o número vem na frente, com o motivo.
- **Calma, mas não distante:** sem exclamação, sem emoji, sem alarde.
- **Por dentro, mas não hermética:** pode falar glosa, TISS, OPME, repasse, operadora.
- **Confiável, mas não exagerada:** promete só o que dá para conferir.

| Assim | Em vez de |
|---|---|
| Hospital VITA enviou 4 de 9 documentos. Faltam contrato social e balanço. | Quase lá! Faltam poucos documentos 🎉 |
| NDA com Hospital X assinado por 2 de 3 signatários. | Contrato quase pronto! |
| Contrato parado há 6 dias sem assinatura. | Atenção!!! Contrato atrasado |

Usamos: repasse, glosa, operadora, faixa, pendência. Evitamos: revolucionar, disruptivo, crédito fácil, garantido.

Observação: emojis em reações e posts do feed são conteúdo dos sócios, não texto da interface — a regra vale para o que o sistema escreve.

## Componentes base (referência)

- Raio: botões e pílulas `999px`; cartões `16–20px`; campos `10–12px`.
- Botão primário: fundo Tinta `#13161F`, texto branco, pílula (como "Agendar uma conversa" no site). Azul Sincra para ação de destaque única por tela.
- Sombras suaves e azuladas: `0 1px 3px rgba(19,22,31,.06)` em cartões; `0 24px 60px rgba(11,63,140,.14)` em destaque.
- Bordas: `1px solid #E6E9EE`.

## Checklist antes de entregar uma tela

- [ ] Só cores dos tokens; nenhum hex solto no código
- [ ] Fundo predominantemente branco/Superfície; azul só em ação e destaque
- [ ] No máximo um céu na tela; degradê do símbolo não usado como fundo
- [ ] Inter na interface; Jakarta apenas em login/PDF
- [ ] Valores e datas com números tabulares; "R$" em cinza ao lado do valor em destaque
- [ ] Todo status com palavra + cor, nas cinco categorias
- [ ] Nenhum texto em Cinza 2 ou Cinza 3
- [ ] Logo pelo componente, com tamanho ≥ mínimo e área de proteção livre
- [ ] Textos em caixa de sentença, sem exclamação nem emoji, número na frente
- [ ] Ícones de traço, acompanhados da palavra
