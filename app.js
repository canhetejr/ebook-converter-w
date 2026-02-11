/**
 * Orquestração: upload (clique + drag-and-drop), conversão no browser, download.
 * Estados: idle | fileSelected | converting | success | error
 */
(function () {
  "use strict";

  var MAX_SIZE_MB = 20;
  var MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  var dropZone = document.getElementById("drop-zone");
  var fileInput = document.getElementById("file-input");
  var btnConvert = document.getElementById("btn-convert");
  var btnAnother = document.getElementById("btn-another");
  var btnRetry = document.getElementById("btn-retry");
  var statusEl = document.getElementById("status");
  var errorEl = document.getElementById("error");
  var fileInfoEl = document.getElementById("file-info");
  var spinnerEl = document.querySelector(".drop-zone__spinner");

  var state = "idle";
  var selectedFile = null;

  function setState(s) {
    state = s;
    dropZone.setAttribute("data-state", s);
    dropZone.setAttribute("aria-busy", s === "converting" ? "true" : "false");
    statusEl.textContent = "";
    errorEl.textContent = "";
    statusEl.className = "status";
    errorEl.className = "error";

    switch (s) {
      case "idle":
        fileInfoEl.classList.add("hidden");
        btnConvert.classList.add("hidden");
        btnAnother.classList.add("hidden");
        btnRetry.classList.add("hidden");
        if (spinnerEl) spinnerEl.classList.add("hidden");
        selectedFile = null;
        fileInput.value = "";
        break;
      case "fileSelected":
        fileInfoEl.classList.remove("hidden");
        btnConvert.classList.remove("hidden");
        btnAnother.classList.add("hidden");
        btnRetry.classList.add("hidden");
        if (spinnerEl) spinnerEl.classList.add("hidden");
        break;
      case "converting":
        fileInfoEl.classList.remove("hidden");
        btnConvert.classList.add("hidden");
        btnAnother.classList.add("hidden");
        btnRetry.classList.add("hidden");
        if (spinnerEl) spinnerEl.classList.remove("hidden");
        statusEl.textContent = "Convertendo…";
        statusEl.className = "status status--processing";
        statusEl.setAttribute("aria-live", "polite");
        break;
      case "success":
        fileInfoEl.classList.add("hidden");
        btnConvert.classList.add("hidden");
        btnAnother.classList.remove("hidden");
        btnRetry.classList.add("hidden");
        if (spinnerEl) spinnerEl.classList.add("hidden");
        statusEl.textContent = "Pronto. Seu arquivo foi baixado.";
        statusEl.className = "status status--success";
        statusEl.setAttribute("aria-live", "polite");
        break;
      case "error":
        fileInfoEl.classList.remove("hidden");
        btnConvert.classList.add("hidden");
        btnAnother.classList.add("hidden");
        btnRetry.classList.remove("hidden");
        if (spinnerEl) spinnerEl.classList.add("hidden");
        errorEl.setAttribute("aria-live", "assertive");
        break;
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function setFile(file) {
    if (!file) {
      setState("idle");
      return;
    }
    var name = file.name || "documento.docx";
    var ext = name.slice(name.lastIndexOf(".")).toLowerCase();
    if (ext !== ".docx") {
      errorEl.textContent = "Envie apenas arquivos .docx";
      errorEl.classList.add("error--visible");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      errorEl.textContent = "Arquivo muito grande. Máximo: " + MAX_SIZE_MB + " MB.";
      errorEl.classList.add("error--visible");
      return;
    }
    selectedFile = file;
    fileInfoEl.textContent = name + " (" + formatSize(file.size) + ")";
    fileInfoEl.classList.remove("hidden");
    setState("fileSelected");
  }

  function downloadText(content, baseName) {
    var name = (baseName || "ebook").replace(/\.docx$/i, "") + ".txt";
    var blob = new Blob([content], { type: "text/plain; charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function doConvert() {
    if (!selectedFile || state !== "fileSelected") return;
    setState("converting");
    errorEl.textContent = "";
    errorEl.classList.remove("error--visible");

    var reader = new FileReader();
    reader.onload = function () {
      var buffer = reader.result;
      if (typeof convertDocxToEbook === "undefined") {
        setState("error");
        errorEl.textContent = "Conversor não carregado. Verifique se o script converter.js está incluído.";
        errorEl.classList.add("error--visible");
        return;
      }
      convertDocxToEbook(buffer)
        .then(function (text) {
          downloadText(text, selectedFile.name);
          setState("success");
        })
        .catch(function (err) {
          setState("error");
          errorEl.textContent = err && err.message ? err.message : "Arquivo inválido ou corrompido.";
          errorEl.classList.add("error--visible");
        });
    };
    reader.onerror = function () {
      setState("error");
      errorEl.textContent = "Não foi possível ler o arquivo.";
      errorEl.classList.add("error--visible");
    };
    reader.readAsArrayBuffer(selectedFile);
  }

  dropZone.addEventListener("click", function (e) {
    if (e.target === dropZone || e.target.closest(".drop-zone__inner")) {
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0];
    setFile(f || null);
  });

  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add("drop-zone--dragover");
  });

  dropZone.addEventListener("dragleave", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("drop-zone--dragover");
  });

  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("drop-zone--dragover");
    var files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) setFile(files[0]);
  });

  btnConvert.addEventListener("click", function (e) {
    e.preventDefault();
    doConvert();
  });

  btnAnother.addEventListener("click", function (e) {
    e.preventDefault();
    setState("idle");
  });

  btnRetry.addEventListener("click", function (e) {
    e.preventDefault();
    if (selectedFile) {
      setState("fileSelected");
      errorEl.textContent = "";
      errorEl.classList.remove("error--visible");
    } else {
      setState("idle");
    }
  });

  dropZone.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  setState("idle");
})();
