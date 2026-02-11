# Conversor E-Book (Web)

Aplicação web para converter arquivos DOCX com tags no formato E-Book (arquivo de texto). **Tudo roda no navegador** — não há API nem servidor; basta publicar os arquivos estáticos (por exemplo no GitHub Pages) e abrir o site.

## Estrutura

- **index.html** — Página única do app (upload, conversão, download).
- **styles.css** — Estilos da interface.
- **app.js** — Orquestração: drag-and-drop, validação, chamada ao conversor, download do .txt.
- **converter.js** — Lógica de conversão DOCX → texto; usa JSZip para ler o .docx no browser.

## Uso

1. Abra o site (localmente ou na URL do GitHub Pages).
2. Arraste um arquivo .docx para a zona de upload ou clique para escolher.
3. Clique em **Converter**. O arquivo .txt será gerado e baixado automaticamente (mesmo nome do .docx, com extensão .txt).

Requisitos: arquivo Word (.docx) com tags (ex.: `#Introdução#`, `#Destaque#`, `#Conclusão#`). Limite: 20 MB.

## Deploy no GitHub Pages (tudo via Git)

1. Crie um repositório no GitHub e envie o código (push da pasta do projeto).
2. No repositório: **Settings** → **Pages**.
3. Em **Source**, escolha **Deploy from a branch**.
4. **Branch:** `main` (ou a branch padrão); **Folder:** **/ (root)**.
5. Salve. Em alguns minutos o site estará em `https://<seu-usuario>.github.io/<nome-do-repo>/`.

Nenhum backend precisa ser configurado. O conversor roda no navegador (JavaScript + JSZip).

## Desenvolvimento local

Abra o `index.html` diretamente no navegador (duplo clique) ou sirva a pasta com um servidor:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080`. Não é necessário rodar a API; a conversão é feita no cliente.

## Dependências (incluídas via CDN)

- **JSZip** — Leitura do arquivo .docx (ZIP) no browser. Carregado via unpkg em `index.html`.

O restante usa apenas APIs nativas do navegador (FileReader, DOMParser, Blob).
