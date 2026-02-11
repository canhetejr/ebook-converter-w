# Conversor E-Book (Web)

Aplicação web para converter arquivos DOCX com tags no formato E-Book (arquivo de texto). **Tudo roda no navegador** — não há API nem servidor; basta publicar os arquivos estáticos (GitHub Pages) e abrir o site.

## Características

- **100% no browser:** conversão DOCX → texto com JavaScript (JSZip + DOM Parser).
- **Tags configuráveis:** arquivo `tags-config.json` define todas as tags, tipos e templates de saída.
- **Área admin integrada:** edite tags, ajuste o limite de tamanho e baixe o JSON atualizado para commit.
- **Suporte a imagens:** extrai imagens do DOCX (word/media/) e inclui como data URLs (base64) na saída.
- **Design Apple:** interface limpa, leve, com fundo claro, tipografia sistemática e estados visuais claros.

## Estrutura

- **index.html** — Página única: zona de upload (drag-and-drop), conversão, admin.
- **styles.css** — Estilos (paleta Apple, dark mode opcional).
- **app.js** — Orquestração: carrega config, upload, validação, conversão, download.
- **converter.js** — Lógica de conversão modular (guiada por `tags-config.json`).
- **admin.js** — Painel admin: CRUD de tags, edição do limite de tamanho, download do JSON.
- **tags-config.json** — Configuração: `maxFileSizeMB` e array `tags` (id, name, pattern, type, outputTemplate, options).

## Uso

1. Abra o site (localmente ou na URL do GitHub Pages).
2. Arraste um arquivo .docx para a zona de upload ou clique para escolher.
3. Clique em **Converter**. O arquivo .txt será gerado e baixado automaticamente (mesmo nome do .docx, com extensão .txt).
4. Após a conversão, use **Baixar para Realize** para gerar `contentHTML.json` e coloque o arquivo em `config/contentHTML.json` da pasta do projeto Realize, se você usa o programa Realize.

Requisitos: arquivo Word (.docx) com tags conforme configuradas em `tags-config.json`. Limite padrão: **100 MB** (ajustável no config).

## Configuração de tags (tags-config.json)

O arquivo `tags-config.json` define:

- **maxFileSizeMB** (number): tamanho máximo aceito (ex.: 100).
- **tags** (array): cada tag com:
  - **id** (string): identificador único.
  - **name** (string): nome exibido (admin e ajuda).
  - **pattern** (string ou array): padrão(es) em minúsculas para reconhecer no texto (ex.: `"#introdução#"` ou `["#destaque#", "#apresentação#"]`).
  - **type** (string): `"block"` (conteúdo entre tags), `"single"` (linha única), `"title"` (títulos), `"image"` (figura/quadro), `"special"` (regras customizadas).
  - **outputTemplate** (string): template de saída com placeholders (ex.: `{{content}}`, `{{link}}`, `{{titulo}}`, `{{imagem}}`).
  - **options** (objeto, opcional): opções específicas (ex.: `hasLink`, `formatAsList`, `extractFromMedia`).

Exemplo mínimo:

```json
{
  "maxFileSizeMB": 100,
  "tags": [
    {
      "id": "introducao",
      "name": "Introdução",
      "pattern": "#introdução#",
      "type": "block",
      "outputTemplate": "<div>{{content}}</div>"
    }
  ]
}
```

## Área admin

1. Clique em **"Configurar tags"** no header.
2. Painel lateral abre com:
   - Campo "Tamanho máximo de arquivo (MB)".
   - Lista de tags (editar/remover).
   - Botão "Adicionar tag" para criar nova.
3. Edições ficam em memória; clique em **"Baixar JSON"** para gerar o `tags-config.json` atualizado.
4. Substitua o arquivo no repositório com o baixado e faça commit.
5. No próximo acesso ao site, o novo config será carregado.

Não há salvamento automático; o fluxo é: editar no admin → baixar JSON → commit no Git → deploy.

## Imagens

Quando o DOCX contém imagens (pasta `word/media/` interna ao ZIP) e uma tag do tipo `"image"` (ex.: Figura, Quadro) com `options.extractFromMedia: true`, o conversor:

- Extrai as imagens em ordem.
- Converte para base64 (data URL).
- Preenche o placeholder `{{imagem}}` no template com o data URL.

Fallback: se não houver imagens suficientes, usa URL padrão do template ou vazio.

## Uso com o programa Realize

O conversor gera HTML com blocos no formato esperado pela plataforma Realize. Para evitar “tela em branco” ou fechamento ao importar no programa Realize:

1. **Baixar para Realize:** após converter, clique em **Baixar para Realize** para gerar `contentHTML.json` (arquivo com `{"html": "..."}`). Coloque esse arquivo em `config/contentHTML.json` na pasta do seu projeto Realize.
2. **JSON válido:** títulos, links e textos vindos do Word são escapados para que o JSON dentro de cada bloco seja válido (evitando erro de parse no Realize).
3. **Validação:** se algum bloco tiver JSON inválido (por exemplo aspas no texto), um aviso será exibido após o download. Corrija o documento Word e converta novamente.
4. **Classes (slugs) compatíveis:** as tags principais usam as mesmas classes que o Realize reconhece:
   - **D-CAIXA-DE-TEXTO** — Introdução, Conclusão, Referências, Caixa.
   - **D-BLOCO-DE-CONTEUDO** — Destaque, Reflita (e blocos de conteúdo genérico).
   - **T-VIDEO**, **I-IMAGEM**, **I-ZSANFONA**, etc. conforme definido em `tags-config.json`.

Outras tags (Saiba Mais, Atenção, Glossário, etc.) podem usar classes próprias; para compatibilidade total com o Realize, confira o `resources.json` do seu projeto e ajuste os templates no admin se necessário.

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

Depois acesse `http://localhost:8080`. O config e o conversor funcionam offline; imagens são extraídas do DOCX sem requisição externa.

## Dependências (incluídas via CDN)

- **JSZip** (3.10.1) — Leitura do arquivo .docx (ZIP) no browser. Carregado via unpkg em `index.html`.

O restante usa apenas APIs nativas do navegador (FileReader, DOMParser, Blob, fetch).

## Personalização

Para adicionar ou ajustar tags:

1. Use a área admin (recomendado) ou edite `tags-config.json` manualmente.
2. Faça commit do JSON atualizado.
3. Publique no GitHub Pages.

O conversor se adapta automaticamente ao config; não é necessário alterar código JavaScript para novas tags simples (apenas templates e padrões no JSON).
