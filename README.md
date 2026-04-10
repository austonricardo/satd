# GitHub SATD Analyzer (Chrome Extension)

Extensão MV3 para analisar comentários em repositórios GitHub, classificar SATD por API externa e exportar dataset CSV.

## Estrutura do projeto

```
.
├── manifest.json
├── background/
│   ├── service-worker.js
│   ├── github-api.js
│   ├── pipeline.js
│   ├── classifier-api.js
│   └── csv-exporter.js
├── content/
│   └── github-context.js
├── panel/
│   ├── panel.html
│   ├── panel.js
│   ├── panel.css
│   └── charts.js
├── core/
│   ├── language-config.js
│   └── comment-extractors/
│       ├── java.js
│       └── python.js
└── options/
    ├── options.html
    └── options.js
```

## Fluxo V1

1. Usuário abre um repositório no GitHub.
2. Side panel inicia análise.
3. Service worker lista arquivos via Git Trees API.
4. Pipeline filtra linguagens (Java/Python) e extrai comentários.
5. Cada comentário é classificado por API externa (com tolerância a falhas).
6. Resultado final exibe resumo + infográfico no painel.
7. Usuário exporta CSV via `chrome.downloads`.

## Dataset CSV

Colunas exportadas:
- `projeto_branch_versao`
- `url_arquivo`
- `comentario`
- `is_satd`
- `classificacao_api`
