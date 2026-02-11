/**
 * Conversor DOCX → E-Book (texto com tags) — roda no browser.
 * Porta da lógica do backend Python (docx_to_ebook.py).
 */
(function (global) {
  "use strict";

  var NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

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
      subscript: !!rPr && hasAttr(rPr, "vertAlign"), // simplificado
      superscript: !!rPr && hasAttr(rPr, "vertAlign"),
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
      if (r.bold && r.italic && r.underline) {
        var fa = formatarAspas(t, numeroAspas);
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
      } else if ((t.indexOf('"') !== -1 || t.indexOf("%") !== -1)) {
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

  function processParagraph(doc, paragrafoStrip, paragrafoIndice, proxParagrafo, paragrafosTotais, listaParagrafos, listaAuxiliar, padraoTitulo, padraoFormula) {
    var texto = "";
    var paras = doc.paragraphs;

    if (paragrafoStrip.toUpperCase().slice(0, 7) === "UNIDADE") {
      return "<h2 class=\"title-vg\">" + paragrafoStrip.toUpperCase() + "</h2>";
    }

    if (paragrafoStrip && /^\d/.test(paragrafoStrip)) {
      var match = paragrafoStrip.match(padraoTitulo);
      if (match) {
        var valorTitulo = match[1];
        var num = valorTitulo.replace(/\./g, "").length;
        if (num === 1) return paragrafoStrip.replace(valorTitulo + " ", "<h4 class=\"subtitlei-vg\">") + "</h4>";
        if (num === 2) return "<p></p><h5 class=\"subtitleii-vg\">" + paragrafoStrip.replace(valorTitulo + " ", "") + "</h5>";
        return "<p></p><h6 class=\"subtitleiii-vg\">" + paragrafoStrip.replace(valorTitulo + " ", "") + "</h6>";
      }
    }

    var lower = paragrafoStrip.toLowerCase();
    if (lower.indexOf("#introdução#") !== -1) {
      texto = "<div class=\"L-INTRODUCAO\" data-interaction=\"true\"><div>{\"texto\":\"";
      for (var i = 0; i < listaParagrafos.length; i++) {
        texto += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
      }
      return texto + "\"}</div>Introdução</div>";
    }
    if (lower.indexOf("#conclusão#") !== -1) {
      texto = "<div class=\"L-CONCLUSION\" data-interaction=\"true\"><div>{\"texto\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        texto += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
      }
      return texto + "\"}</div>Conclusão</div>";
    }
    if (lower.indexOf("#referências#") !== -1) {
      texto = "<div class=\"L-REFERENCIASBB\" data-interaction=\"true\"><div>{\"texto\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        texto = formatarTextoEstilo(paras[listaParagrafos[i]].runs, texto);
        var pt = paras[listaParagrafos[i]].text;
        if (texto.indexOf("<>") !== -1 && pt.indexOf("<") !== -1 && pt.indexOf(">") !== -1) {
          var link = pt.split("<")[1].split(">")[0];
          texto = texto.replace("<>", "%3Ca%20href='" + link + "'%20target='_blank'%20rel='noopener'%3E" + link + "%3C/a%3E");
        }
      }
      return texto + "\"}</div>Referências Bibliográficas</div><p></p>";
    }
    if (lower.indexOf("#apresentação#") !== -1 || lower.indexOf("#destaque#") !== -1) {
      texto = "<div class=\"D-DESTAQUE\" data-interaction=\"true\"><div>{\"destaque\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        texto += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
      }
      return texto + "\"}</div>Destaque</div>";
    }
    if (lower.indexOf("#citação#") !== -1) {
      texto = "<div class=\"D-CDIRETA\" data-interaction=\"true\"><div>{\"texto\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        texto += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
      }
      return texto + "\"}</div>Recuo</div>";
    }
    if (lower.indexOf("#caixa#") !== -1) {
      texto = "<div class=\"D-CAIXA\" data-interaction=\"true\"><div>{\"caixa\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        var aux = formatarBoxTexto(paras[listaParagrafos[i]].runs);
        if (i === 0) texto += "%3Cp%20style='text-align:%20justify;'%3E" + aux + "%3C/p%3E%0A%3Cul%3E%0A";
        else texto += "%3Cli%20style='text-align:%20justify;'%3E" + aux + "%3Cbr%20/%3E%3Cbr%20/%3E%3C/li%3E%0A";
      }
      return texto + "%3C/ul%3E\"}</div>Caixa</div>";
    }
    if (lower.indexOf("#glossário#") !== -1) {
      texto = "<div class=\"U-SEARCHBLOCK\" data-interaction=\"true\"><div>{\"title\":\"Glossário\",\"conteudo\":\"%3Col%3E%0A";
      for (i = 0; i < listaParagrafos.length; i++) {
        aux = formatarBoxTexto(paras[listaParagrafos[i]].runs).replace(": ", ": %3C/strong%3E");
        texto += "%3Cli%20style='text-align:%20justify;'%3E%3Cstrong%3E" + aux + "%3Cbr%20/%3E%3Cbr%20/%3E%3C/li%3E%0A";
      }
      return texto + "%3C/ol%3E\"}</div>Bloco Busca</div>";
    }
    if (lower.indexOf("#video#") !== -1) {
      var conteudo = paragrafoStrip.replace(/#Video#/gi, "").trim();
      return "<div class=\"T-VIDEO\" data-interaction=\"true\"><div>{\"link\":\"" + conteudo + "\",\"video\":\"\",\"pdf\":\"\"}</div>Vídeo</div>";
    }
    if (lower.indexOf("figura ") === 0 && paras[paragrafoIndice + 1]) {
      var titulo = paras[paragrafoIndice].text.split(":");
      var fonte = paras[paragrafoIndice + 1].text.split(":");
      var figura = "https://i.pinimg.com/736x/be/09/97/be0997e2d5732322bf552c6f2883c86e.jpg";
      listaAuxiliar.push(proxParagrafo);
      return "<div class=\"T-FIGURA\" data-interaction=\"true\"><div>{\"titulo\":\"" + (titulo[1] || "").trim() + "\",\"fonte\":\"" + (fonte[1] || "").trim() + "\",\"accessibility\":\"" + (titulo[1] || "").trim() + "\",\"imagem\":\"" + figura + "\"}</div>Figura</div>";
    }
    if (lower.indexOf("quadro ") === 0 && paras[paragrafoIndice + 1]) {
      var tabela = "%3Ctable%20style='border-collapse:%20collapse;%20width:%20100%25;'%20border='1'%3E%0A%3Ctbody%3E%0A%3Ctr%3E%0A%3Ctd%20style='width:%20100%25;'%3EQuadro%3C/td%3E%0A%3C/tr%3E%0A%3C/tbody%3E%0A%3C/table%3E";
      titulo = paras[paragrafoIndice].text.split(":");
      fonte = paras[paragrafoIndice + 1].text.split(":");
      listaAuxiliar.push(proxParagrafo);
      return "<div class=\"T-QUADRO\" data-interaction=\"true\"><div>{\"titulo\":\"" + (titulo[1] || "").trim() + "\",\"fonte\":\"" + (fonte[1] || "").trim() + "\",\"texto\":\"" + tabela + "\",\"accessibility\":\"" + (titulo[1] || "").trim() + "\",\"quadro\":\"\"}</div>Quadro</div>";
    }
    if (lower.indexOf("#reflita#") !== -1) {
      texto = "<div class=\"B-REFLITA\" data-interaction=\"true\"><div>{\"conteudo\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        texto += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
      }
      return texto + "\",\"link\":\"\",\"pdf\":\"\"}</div>Reflita</div>";
    }
    if (lower.indexOf("#saiba mais#") !== -1) {
      texto = "<div class=\"U-SAIBAMAIS\" data-interaction=\"true\"><div>{\"conteudo\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        if (paras[listaParagrafos[i]].text.indexOf("http") === 0) {
          texto += "\",\"link\":\"" + paras[listaParagrafos[i]].text + "\",\"pdf\":\"\"}}</div>Saiba Mais</div>";
          return texto;
        }
        texto += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
      }
      return texto;
    }
    if (lower.indexOf("#atenção#") !== -1) {
      texto = "<div class=\"U-ATENCAO\" data-interaction=\"true\"><div>{\"conteudo\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        texto += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
      }
      return texto + "\",\"pdf\":\"\"}</div>Atenção</div>";
    }
    if (lower.indexOf("#dica#") !== -1) {
      texto = "<div class=\"B-DICA\" data-interaction=\"true\"><div>{\"conteudo\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        texto += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
      }
      return texto + "\",\"imagem\":\"\"}</div>Dica</div>";
    }
    if (lower.indexOf("#técnico#") !== -1) {
      texto = "<div class=\"D-PROGRAMACAO\" data-interaction=\"true\"><div>{\"texto\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        texto += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
      }
      return texto + "\"}</div>Técnico</div>";
    }
    if (lower.indexOf("#dica de livro#") !== -1 || lower.indexOf("#dica do professor#") !== -1 || lower.indexOf("#dica de leitura#") !== -1) {
      if (lower.indexOf("#dica de livro#") !== -1) texto = "<div class=\"B-GREEN\" data-interaction=\"true\"><div>{\"titulo\":\"Dica de Livro\",\"conteudo\":\"";
      else if (lower.indexOf("#dica de leitura#") !== -1) texto = "<div class=\"B-GREEN\" data-interaction=\"true\"><div>{\"titulo\":\"Dica de Leitura\",\"conteudo\":\"";
      else texto = "<div class=\"B-GREEN\" data-interaction=\"true\"><div>{\"titulo\":\"Dica do Professor(a)\",\"conteudo\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        texto += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
      }
      return texto + "\",\"imagem\":\"https://dbunicv.realize.pro.br/files/bbe7a7d8253ab4d19c641e74a008e50d.jpg\"}</div>Esquerda</div>";
    }
    if (lower.indexOf("#indicação de filme#") !== -1 || lower.indexOf("#na web#") !== -1 || lower.indexOf("#dica de filme#") !== -1) {
      var link = "";
      if (lower.indexOf("#indicação de filme#") !== -1 || lower.indexOf("#dica de filme#") !== -1) texto = "<div class=\"B-BLUE\" data-interaction=\"true\"><div>{\"titulo\":\"Indicação de Filme\",\"conteudo\":\"";
      else texto = "<div class=\"B-BLUE\" data-interaction=\"true\"><div>{\"titulo\":\"Na Web\",\"conteudo\":\"";
      for (i = 0; i < listaParagrafos.length; i++) {
        var tx = paras[listaParagrafos[i]].text;
        if (tx.indexOf("http") !== 0) {
          texto += "%3Cp%20style='text-align:%20justify;'%3E" + formatarBoxTexto(paras[listaParagrafos[i]].runs) + "%3C/p%3E%0A";
        } else link = tx;
      }
      return texto + "\",\"imagem\":\"https://dbunicv.realize.pro.br/files/851d95d42b89c5b0b24155447cf81d6b.jpg\"}</div>Direita</div><div class=\"T-VIDEO\" data-interaction=\"true\"><div>{\"link\":\"" + link + "\",\"video\":\"\",\"pdf\":\"\"}</div>Vídeo</div>";
    }
    if (lower.indexOf("#infográfico interativo#") !== -1) {
      texto = "";
      for (i = 0; i < listaParagrafos.length; i++) {
        aux = formatarBoxTexto(paras[listaParagrafos[i]].runs);
        var colonIdx = aux.indexOf(":");
        var part0 = colonIdx !== -1 ? aux.slice(0, colonIdx) : aux;
        var part1 = colonIdx !== -1 ? aux.slice(colonIdx + 1) : "";
        texto += "<div class=\"I-ZSANFONA\" data-interaction=\"true\"><div>{\"titulo\":\"<strong>" + part0 + ":</strong>\",\"conteudo\":\"%3Cp%20style='text-align:%20justify;'%3E" + part1 + "%3C/p%3E%0A\"}</div>Sanfona</div>\n";
      }
      return texto.slice(0, texto.lastIndexOf("\n"));
    }
    if (lower.indexOf("#forca") !== -1) {
      conteudo = paragrafoStrip.replace(/#Forca/gi, "").trim();
      return "<div class=\"I-JOGOFORCA\" data-interaction=\"true\"><div>{\"palavra\":\"" + conteudo + "\"}</div>Forca</div><p></p>";
    }

    // Parágrafo normal
    if (proxParagrafo - 1 < 0) return "";
    var p = paras[proxParagrafo - 1];
    texto = "";
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

  function processDocument(doc) {
    var paragrafosTotais = doc.paragraphs.length;
    if (paragrafosTotais === 0) return [];
    var html = [];
    var proxParagrafo = 0;
    var boleano = true;
    var listaParagrafos = [];
    var listaAuxiliar = [];
    var paragrafoIndice = -1;
    var marcaNoTexto = [];
    var padraoTitulo = /^(.*?)\s/;
    var padraoFormula = /\{\{(.*?)\}\}/;

    for (var idx = 0; idx < doc.paragraphs.length; idx++) {
      var paragrafo = doc.paragraphs[idx];
      var paragrafoStrip = paragrafo.text.trim();
      if (paragrafoStrip.indexOf("#") !== -1 && paragrafoStrip.indexOf("%") === 0) {
        var parts = paragrafoStrip.split("#");
        if (parts.length >= 3) paragrafoStrip = "#" + parts[1].split("#")[0] + "#";
      }

      if (paragrafoStrip.indexOf("#") === 0 && paragrafoStrip.lastIndexOf("#") === paragrafoStrip.length - 1 && proxParagrafo < paragrafosTotais - 1 && marcaNoTexto.length === 0) {
        marcaNoTexto.push(paragrafoStrip.toLowerCase());
        if (doc.paragraphs[proxParagrafo + 1] && doc.paragraphs[proxParagrafo + 1].text.indexOf("#") !== 0) {
          listaParagrafos = [];
          while (boleano) {
            proxParagrafo++;
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
        result = processParagraph(doc, paragrafoStrip, paragrafoIndice, proxParagrafo, paragrafosTotais, listaParagrafos, listaAuxiliar, padraoTitulo, padraoFormula);
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

  /**
   * Converte um DOCX (ArrayBuffer) para o texto no formato E-Book.
   * @param {ArrayBuffer} arrayBuffer - Bytes do arquivo .docx
   * @returns {Promise<string>} Conteúdo do .txt (linhas separadas por \n)
   */
  function convertDocxToEbook(arrayBuffer) {
    return new Promise(function (resolve, reject) {
      if (typeof global.JSZip === "undefined") {
        reject(new Error("JSZip não carregado. Inclua o script JSZip antes do conversor."));
        return;
      }
      global.JSZip.loadAsync(arrayBuffer)
        .then(function (zip) {
          var entry = zip.file("word/document.xml");
          if (!entry) {
            reject(new Error("Arquivo inválido ou corrompido (document.xml não encontrado)."));
            return;
          }
          return entry.async("string");
        })
        .then(function (xmlStr) {
          var parser = new global.DOMParser();
          var xmlDoc = parser.parseFromString(xmlStr, "text/xml");
          var doc = { paragraphs: parseDocxXml(xmlDoc) };
          var html = processDocument(doc);
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
