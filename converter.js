/**
 * Conversor DOCX → E-Book (texto com tags) — modular, guiado por config.
 * Suporta extração de imagens do DOCX (word/media/).
 */
(function (global) {
  "use strict";

  var NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

  // Config padrão (fallback se não receber config)
  var DEFAULT_CONFIG = {
    maxFileSizeMB: 100,
    tags: []
  };

  function hasAttr(el, localName) {
    if (!el || !el.getElementsByTagNameNS) return false;
    var pr = el.getElementsByTagNameNS(NS, localName)[0];
    return !!pr;
  }

  function getStyleName(pEl) {
    var pPr = pEl.getElementsByTagNameNS(NS, "pPr")[0];
    if (!pPr) return "";
    var pStyle = pPr.getElementsByTagNameNS(NS, "pStyle")[0];
    if (!pStyle) return "";
    return pStyle.getAttribute("w:val") || pStyle.getAttribute("val") || "";
  }

  function getRunProps(rEl) {
    var rPr = rEl.getElementsByTagNameNS(NS, "rPr")[0];
    return {
      bold: !!rPr && hasAttr(rPr, "b"),
      italic: !!rPr && hasAttr(rPr, "i"),
      underline: !!rPr && hasAttr(rPr, "u"),
    };
  }

  function getRunText(rEl) {
    var ts = rEl.getElementsByTagNameNS(NS, "t");
    var out = "";
    for (var i = 0; i < ts.length; i++) {
      out += ts[i].textContent || "";
    }
    return out;
  }

  function parseDocxXml(xmlDoc) {
    var paragraphs = [];
    var pEls = xmlDoc.getElementsByTagNameNS(NS, "p");
    for (var i = 0; i < pEls.length; i++) {
      var pEl = pEls[i];
      var runs = [];
      var fullText = "";
      var rEls = pEl.getElementsByTagNameNS(NS, "r");
      for (var j = 0; j < rEls.length; j++) {
        var rEl = rEls[j];
        var props = getRunProps(rEl);
        var text = getRunText(rEl);
        runs.push({ text: text, bold: props.bold, italic: props.italic, underline: props.underline });
        fullText += text;
      }
      var styleName = getStyleName(pEl);
      paragraphs.push({ text: fullText, runs: runs, styleName: styleName });
    }
    return paragraphs;
  }

  function formatarAspas(texto, numeroAspas) {
    var t = texto;
    var n = numeroAspas;
    if (t.indexOf('"') !== -1) {
      if (n % 2 === 0) {
        t = t.replace(/"/g, "\u201c");
        n += 1;
      } else {
        t = t.replace(/"/g, "\u201d");
        n -= 1;
      }
    }
    return { texto: t, numeroAspas: n };
  }

  function formatarBoxTexto(runs) {
    var out = "";
    var numeroAspas = 0;
    for (var i = 0; i < runs.length; i++) {
      var r = runs[i];
      var t = r.text;
      var fa;
      if (r.bold && r.italic && r.underline) {
        fa = formatarAspas(t, numeroAspas);
        t = fa.texto;
        numeroAspas = fa.numeroAspas;
        t = t.replace(/%/g, "%25");
        t = "%3Cspan%20style=%22text-decoration:%20underline;%22%3E%3Cstrong%3E%3Cem%3E" + t + "%3C/em%3E%3C/strong%3E%3C/span%3E";
      } else if (r.bold && r.underline) {
        fa = formatarAspas(t, numeroAspas);
        t = fa.texto;
        numeroAspas = fa.numeroAspas;
        t = t.replace(/%/g, "%25");
        t = "%3Cspan%20style=%22text-decoration:%20underline;%22%3E%3Cstrong%3E" + t + "%3C/strong%3E%3C/span%3E";
      } else if (r.bold && r.italic && t !== " ") {
        fa = formatarAspas(t, numeroAspas);
        t = fa.texto;
        numeroAspas = fa.numeroAspas;
        t = t.replace(/%/g, "%25");
        t = "%3Cstrong%3E%3Cem%3E" + t + "%3C/em%3E%3C/strong%3E";
      } else if (r.bold && t !== " ") {
        fa = formatarAspas(t, numeroAspas);
        t = fa.texto;
        numeroAspas = fa.numeroAspas;
        t = t.replace(/%/g, "%25");
        t = "%3Cstrong%3E" + t + "%3C/strong%3E";
      } else if (r.italic && t !== " ") {
        fa = formatarAspas(t, numeroAspas);
        t = fa.texto;
        numeroAspas = fa.numeroAspas;
        t = t.replace(/%/g, "%25");
        t = "%3Cem%3E" + t + "%3C/em%3E";
      } else if (r.underline) {
        fa = formatarAspas(t, numeroAspas);
        t = fa.texto;
        numeroAspas = fa.numeroAspas;
        t = t.replace(/%/g, "%25");
        t = "%3Cspan%20style=%22text-decoration:%20underline;%22%3E" + t + "%3C/span%3E";
      } else if (t.indexOf('"') !== -1 || t.indexOf("%") !== -1) {
        fa = formatarAspas(t, numeroAspas);
        t = fa.texto;
        numeroAspas = fa.numeroAspas;
        if (t.indexOf("%") !== -1) t = t.replace(/%/g, "%25");
      }
      t = t.replace(/%3C\/span%3E%3Cspan%20style=%22text-decoration:%20underline;%22%3E/g, "");
      out += t;
    }
    return out;
  }

  function formatarTextoEstilo(runs, texto) {
    var out = "";
    for (var i = 0; i < runs.length; i++) {
      var r = runs[i];
      var t = r.text;
      if (r.bold && t !== " ") t = "%3Cstrong%3E" + t + "%3C/strong%3E";
      if (r.italic && t !== " ") t = "%3Cem%3E" + t + "%3C/em%3E";
      out += t;
    }
    texto += "%3Cp%20style='text-align:%20justify;'%3E" + out + "%3C/p%3E%0A";
    texto = texto.replace(/%3Cstrong%3E%3Cstrong%3E/g, "%3Cstrong%3E").replace(/%3C\/strong%3E%3C\/strong%3E/g, "%3C/strong%3E");
    texto = texto.replace(/%3C\/strong%3E%3Cstrong%3E/g, "").replace(/%3C\/strong%3E %3Cstrong%3E/g, " ");
    texto = texto.replace(/%3C\/strong%3E%3C\/em%3E%3Cem%3E%3Cstrong%3E/g, "").replace(/%3Cem%3E%3Cem%3E/g, "%3Cem%3E");
    texto = texto.replace(/%3C\/em%3E%3C\/em%3E/g, "%3C/em%3E").replace(/%3C\/em%3E %3C\/em%3E/g, " ");
    texto = texto.replace(/%3C\/em%3E %3Cem%3E/g, " ").replace(/%3C\/em%3E%3Cem%3E/g, "");
    return texto;
  }

  function substituirFormula(formula) {
    var esp = ["+", "-", "=", ":", "*", "/", ")"];
    var out = "";
    var sup = false, sub = false, union = false;
    var s = formula.trim();
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === "^") {
        sup = true;
        c = sub ? "</sub><sup>" : "<sup>";
        if (sub) sub = false;
      } else if (c === "_") {
        sub = true;
        c = sup ? "</sup><sub>" : "<sub>";
        if (sup) sup = false;
      } else if (sup || sub) {
        if (esp.indexOf(c) !== -1) {
          if (sup && !union) { sup = false; c = "</sup>" + c; }
          else if (sub && !union) { sub = false; c = "</sub>" + c; }
        }
        if (c === "(") union = true;
        else if (c === ")") {
          union = false;
          if (sup) { sup = false; c += "</sup>"; }
          else if (sub) { sub = false; c += "</sub>"; }
        }
      }
      out += c;
    }
    return out.replace(/<sub> <\/sub>/g, "").replace(/<sup> <\/sup>/g, "").replace(/ /g, "");
  }

  function matchPattern(text, pattern) {
    var lower = text.toLowerCase();
    if (Array.isArray(pattern)) {
      for (var i = 0; i < pattern.length; i++) {
        if (lower.indexOf(pattern[i].toLowerCase()) !== -1) return pattern[i];
      }
      return null;
    }
    if (pattern.indexOf("^") === 0) {
      var re = new RegExp(pattern);
      return re.test(text) ? pattern : null;
    }
    return lower.indexOf(pattern.toLowerCase()) !== -1 ? pattern : null;
  }

  function processTag(tag, paras, paragrafoStrip, paragrafoIndice, proxParagrafo, listaParagrafos, listaAuxiliar, images) {
    var lower = paragrafoStrip.toLowerCase();
    var matched = matchPattern(paragrafoStrip, tag.pattern);
    if (!matched) return null;

    var output = tag.outputTemplate;
    var opts = tag.options || {};

    if (tag.type === "block") {
      var content = "";
      if (opts.formatAsList) {
        for (var i = 0; i < listaParagrafos.length; i++) {
          var aux = formatarBoxTexto(paras[listaParagrafos[i]].runs);
          if (i === 0) content += "%3Cp%20style='text-align:%20justify;'%3E" + aux + "%3C/p%3E%0A%3Cul%3E%0A";
          else content += "%3Cli%20style='text-align:%20justify;'%3E" + aux + "%3Cbr%20/%3E%3Cbr%20/%3E%3C/li%3E%0A";
        }
        content += "%3C/ul%3E";
      } else if (opts.formatAsGlossary) {
        content = "%3Col%3E%0A";
        for (i = 0; i < listaParagrafos.length; i++) {
          aux = formatarBoxTexto(paras[listaParagrafos[i]].runs).replace(": ", ": %3C/strong%3E");
          content += "%3Cli%20style='text-align:%20justify;'%3E%3Cstrong%3E" + aux + "%3Cbr%20/%3E%3Cbr%20/%3E%3C/li%3E%0A";
        }
        content += "%3C/ol%3E";
      } else if (opts.useEstilo) {
        for (i = 0; i < listaParagrafos.length; i++) {
          content = formatarTextoEstilo(paras[listaParagrafos[i]].runs, content);
          var pt = paras[listaParagrafos[i]].text;
          if (content.indexOf("<>") !== -1 && pt.indexOf("<") !== -1 && pt.indexOf(">") !== -1) {
            var link = pt.split("<")[1].split(">")[0];
            content = content.replace("<>", "%3Ca%20href='" + link + "'%20target='_blank'%20rel='noopener'%3E" + link + "%3C/a%3E");
          }
        }
      } else if (opts.splitByColon) {
        var items = "";
        for (i = 0; i < listaParagrafos.length; i++) {
          aux = formatarBoxTexto(paras[listaParagrafos[i]].runs);
          var colonIdx = aux.indexOf(":");
          var part0 = colonIdx !== -1 ? aux.slice(0, colonIdx) : aux;
          var part1 = colonIdx !== -1 ? aux.slice(colonIdx + 1) : "";
          var itemOut = opts.itemTemplate || "{{titulo}}: {{content}}";
          itemOut = itemOut.replace(/\{\{titulo\}\}/g, part0).replace(/\{\{content\}\}/g, "%3Cp%20style='text-align:%20justify;'%3E" + part1 + "%3C/p%3E%0A");
          items += itemOut + "\n";
        }
        output = output.replace(/\{\{items\}\}/g, items.slice(0, items.lastIndexOf("\n")));
        return output;
      } else if (opts.checkForLink) {
        var linkFound = "";
        for (i = 0; i < listaParagrafos.length; i++) {
          if (paras[listaParagrafos[i]].text.indexOf("http") === 0) {
            linkFound = paras[listaParagrafos[i]].text;
          } else {
            content += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
          }
        }
        output = output.replace(/\{\{link\}\}/g, linkFound);
      } else if (opts.extractVideoLink) {
        linkFound = "";
        for (i = 0; i < listaParagrafos.length; i++) {
          var tx = paras[listaParagrafos[i]].text;
          if (tx.indexOf("http") === 0) linkFound = tx;
          else content += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
        }
        var titulo = "";
        if (opts.dynamicTitle) {
          for (var key in opts.dynamicTitle) {
            if (lower.indexOf(key) !== -1) {
              titulo = opts.dynamicTitle[key];
              break;
            }
          }
        }
        output = output.replace(/\{\{titulo\}\}/g, titulo).replace(/\{\{link\}\}/g, linkFound);
      } else {
        for (i = 0; i < listaParagrafos.length; i++) {
          content += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
        }
      }
      if (opts.dynamicTitle && !opts.extractVideoLink) {
        titulo = "";
        for (key in opts.dynamicTitle) {
          if (lower.indexOf(key) !== -1) {
            titulo = opts.dynamicTitle[key];
            break;
          }
        }
        output = output.replace(/\{\{titulo\}\}/g, titulo);
      }
      output = output.replace(/\{\{content\}\}/g, content);
      return output;
    }

    if (tag.type === "single") {
      if (opts.extractLink) {
        var linkContent = paragrafoStrip.replace(new RegExp(matched, "gi"), "").trim();
        return output.replace(/\{\{link\}\}/g, linkContent);
      }
      if (opts.extractWord) {
        var word = paragrafoStrip.replace(new RegExp(matched, "gi"), "").trim();
        return output.replace(/\{\{palavra\}\}/g, word);
      }
    }

    if (tag.type === "image" && paragrafoIndice + 1 < paras.length) {
      var titulo = paras[paragrafoIndice].text.split(":");
      var fonte = paras[paragrafoIndice + 1].text.split(":");
      var imagem = "";
      if (opts.extractFromMedia && images.length > 0) {
        imagem = images.shift();
      } else {
        imagem = "https://i.pinimg.com/736x/be/09/97/be0997e2d5732322bf552c6f2883c86e.jpg";
      }
      listaAuxiliar.push(proxParagrafo);
      output = output.replace(/\{\{titulo\}\}/g, (titulo[1] || "").trim());
      output = output.replace(/\{\{fonte\}\}/g, (fonte[1] || "").trim());
      output = output.replace(/\{\{imagem\}\}/g, imagem);
      if (opts.defaultTable) {
        output = output.replace(/\{\{tabela\}\}/g, opts.defaultTable);
      }
      return output;
    }

    if (tag.type === "title") {
      if (opts.uppercase) {
        return output.replace(/\{\{text\}\}/g, paragrafoStrip.toUpperCase());
      }
      if (opts.isNumeric) {
        var match = paragrafoStrip.match(/^(.*?)\s/);
        if (match) {
          var valorTitulo = match[1];
          var num = valorTitulo.replace(/\./g, "").length;
          if (num === 1) return "<h4 class=\"subtitlei-vg\">" + paragrafoStrip.replace(valorTitulo + " ", "") + "</h4>";
          if (num === 2) return "<p></p><h5 class=\"subtitleii-vg\">" + paragrafoStrip.replace(valorTitulo + " ", "") + "</h5>";
          return "<p></p><h6 class=\"subtitleiii-vg\">" + paragrafoStrip.replace(valorTitulo + " ", "") + "</h6>";
        }
      }
      return output.replace(/\{\{text\}\}/g, paragrafoStrip);
    }

    return null;
  }

  function processParagraph(doc, paragrafoStrip, paragrafoIndice, proxParagrafo, listaParagrafos, listaAuxiliar, config, images) {
    var paras = doc.paragraphs;
    if (proxParagrafo - 1 < 0) return "";

    for (var i = 0; i < config.tags.length; i++) {
      var tag = config.tags[i];
      var result = processTag(tag, paras, paragrafoStrip, paragrafoIndice, proxParagrafo, listaParagrafos, listaAuxiliar, images);
      if (result !== null) return result;
    }

    // Parágrafo normal (sem tag)
    var p = paras[proxParagrafo - 1];
    var texto = "";
    for (i = 0; i < p.runs.length; i++) {
      var run = p.runs[i];
      var rt = run.text;
      if (run.bold && rt !== " ") rt = "<strong>" + rt + "</strong>";
      if (run.italic && rt !== " ") rt = "<em>" + rt + "</em>";
      if (run.underline) rt = "<u>" + rt + "</u>";
      texto += rt;
    }

    if (p.styleName && p.styleName.indexOf("List") === 0) {
      texto = "<li style=\"text-align: justify;\">" + texto + "<br/><br/></li>";
    } else {
      texto = (texto.trim() !== "" ? "<p style=\"text-align: justify;\">" + texto + "</p>" : "<p>" + texto + "</p>");
    }

    texto = texto.replace(/\n/g, "</p>|<p style=\"text-align: justify;\">");
    texto = texto.replace(/<strong><strong>/g, "<strong>").replace(/<\/strong><\/strong>/g, "</strong>").replace(/<\/strong><strong>/g, "").replace(/<\/strong> <strong>/g, " ");
    texto = texto.replace(/<\/strong><\/em><em><strong>/g, "").replace(/<em><em>/g, "<em>").replace(/<\/em><\/em>/g, "</em>").replace(/<\/em> <\/em>/g, " ").replace(/<\/em> <em>/g, " ").replace(/<\/em><em>/g, "");

    var formulaMatch = texto.match(/\{\{(.*?)\}\}/g);
    if (formulaMatch) {
      for (i = 0; i < formulaMatch.length; i++) {
        var fm = formulaMatch[i].slice(2, -2);
        texto = texto.replace("{{" + fm + "}}", "<em>" + substituirFormula(fm) + "</em>");
      }
    }

    if (texto.indexOf("</p>|<p") !== -1) {
      var partes = texto.split("|");
      var out = [];
      for (i = 0; i < partes.length; i++) {
        var lin = partes[i].replace(/<p style="text-align: justify;"><\/p>/g, "<p></p>");
        out.push(lin);
      }
      return out;
    }

    if (texto !== "<p></p>" && texto !== "<p> </p>") return texto;
    return "";
  }

  function processDocument(doc, config, images) {
    var paragrafosTotais = doc.paragraphs.length;
    if (paragrafosTotais === 0) return [];
    var html = [];
    var proxParagrafo = 0;
    var boleano = true;
    var listaParagrafos = [];
    var listaAuxiliar = [];
    var paragrafoIndice = -1;
    var marcaNoTexto = [];

    for (var idx = 0; idx < doc.paragraphs.length; idx++) {
      var paragrafo = doc.paragraphs[idx];
      var paragrafoStrip = paragrafo.text.trim();
      if (paragrafoStrip.indexOf("#") !== -1 && paragrafoStrip.indexOf("%") === 0) {
        var parts = paragrafoStrip.split("#");
        if (parts.length >= 3) paragrafoStrip = "#" + parts[1].split("#")[0] + "#";
      }

      if (paragrafoStrip.indexOf("#") === 0 && paragrafoStrip.lastIndexOf("#") === paragrafoStrip.length - 1 && proxParagrafo < paragrafosTotais - 1 && marcaNoTexto.length === 0) {
        marcaNoTexto.push(paragrafoStrip.toLowerCase());
        if (proxParagrafo + 1 < paragrafosTotais && doc.paragraphs[proxParagrafo + 1].text.indexOf("#") !== 0) {
          listaParagrafos = [];
          while (boleano) {
            proxParagrafo++;
            if (proxParagrafo >= paragrafosTotais) {
              boleano = false;
              break;
            }
            var pt = doc.paragraphs[proxParagrafo].text;
            if (pt.trim() !== "" && !/^\s*$/.test(pt)) {
              listaParagrafos.push(proxParagrafo);
              listaAuxiliar.push(proxParagrafo);
            }
            if (proxParagrafo < paragrafosTotais - 1) {
              var nextT = doc.paragraphs[proxParagrafo + 1].text;
              if (nextT.trim() !== "" && !/^\s*$/.test(nextT)) {
                boleano = nextT.trim().indexOf("#") !== 0 && nextT.trim().indexOf("%") !== 0;
              }
            } else {
              boleano = false;
            }
          }
        }
      }

      boleano = true;
      paragrafoIndice = idx;
      proxParagrafo = paragrafoIndice + 1;

      if (marcaNoTexto.indexOf(paragrafoStrip.toLowerCase()) !== -1) marcaNoTexto.push(paragrafoStrip.toLowerCase());
      if (listaAuxiliar.indexOf(paragrafoIndice) !== -1 || marcaNoTexto.length === 3) {
        if (marcaNoTexto.indexOf(paragrafoStrip.toLowerCase()) !== -1) marcaNoTexto = [];
      }

      var result;
      try {
        result = processParagraph(doc, paragrafoStrip, paragrafoIndice, proxParagrafo, listaParagrafos, listaAuxiliar, config, images);
      } catch (e) {
        throw new Error("Erro ao processar parágrafo: " + e.message);
      }

      if (Array.isArray(result)) {
        for (var k = 0; k < result.length; k++) {
          if (result[k] !== "" && (html.length === 0 || html[html.length - 1] !== result[k])) html.push(result[k]);
        }
      } else if (result !== "" && result !== "<p></p>" && (html.length === 0 || html[html.length - 1] !== result)) {
        html.push(result);
      }
      listaParagrafos = [];
    }
    return html;
  }

  function extractImages(zip) {
    var images = [];
    var mediaFiles = [];
    zip.folder("word/media").forEach(function (relativePath, file) {
      if (!file.dir) mediaFiles.push(file);
    });
    if (mediaFiles.length === 0) return Promise.resolve(images);

    var promises = mediaFiles.map(function (file) {
      return file.async("base64").then(function (base64) {
        var ext = file.name.split(".").pop().toLowerCase();
        var mime = "image/" + (ext === "jpg" ? "jpeg" : ext);
        return "data:" + mime + ";base64," + base64;
      });
    });
    return Promise.all(promises);
  }

  /**
   * Converte um DOCX (ArrayBuffer) para o texto no formato E-Book.
   * @param {ArrayBuffer} arrayBuffer - Bytes do arquivo .docx
   * @param {Object} config - Configuração de tags (opcional; usa padrão se não fornecido)
   * @returns {Promise<string>} Conteúdo do .txt (linhas separadas por \n)
   */
  function convertDocxToEbook(arrayBuffer, config) {
    return new Promise(function (resolve, reject) {
      if (typeof global.JSZip === "undefined") {
        reject(new Error("JSZip não carregado. Inclua o script JSZip antes do conversor."));
        return;
      }
      var cfg = config || DEFAULT_CONFIG;
      var zip;
      global.JSZip.loadAsync(arrayBuffer)
        .then(function (z) {
          zip = z;
          var entry = zip.file("word/document.xml");
          if (!entry) {
            reject(new Error("Arquivo inválido ou corrompido (document.xml não encontrado)."));
            return;
          }
          return entry.async("string");
        })
        .then(function (xmlStr) {
          return extractImages(zip).then(function (images) {
            return { xmlStr: xmlStr, images: images };
          });
        })
        .then(function (data) {
          var parser = new global.DOMParser();
          var xmlDoc = parser.parseFromString(data.xmlStr, "text/xml");
          var doc = { paragraphs: parseDocxXml(xmlDoc) };
          var html = processDocument(doc, cfg, data.images);
          resolve(html.join("\n"));
        })
        .catch(function (err) {
          if (err && err.message) reject(err);
          else reject(new Error("Arquivo inválido ou corrompido."));
        });
    });
  }

  global.convertDocxToEbook = convertDocxToEbook;
})(typeof window !== "undefined" ? window : this);
