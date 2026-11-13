# Modelos de contrato

Vazio de propósito. Entram aqui apenas modelos **revisados por advogado**.

Formato sugerido por modelo:

```
nda/
├── v1.docx            texto aprovado, com variáveis no formato {{razao_social}}
└── variaveis.json     lista de variáveis, origem no CRM e se é obrigatória
```

Exemplo de `variaveis.json`:

```json
[
  { "key": "razao_social", "source": "organization.legal_name", "required": true },
  { "key": "cnpj", "source": "organization.cnpj", "required": true },
  { "key": "representante_nome", "source": "signer.full_name", "required": true },
  { "key": "data", "source": "system.today", "required": true }
]
```

A automação substitui as variáveis e gera o PDF. Não altera, cria nem remove cláusulas.
