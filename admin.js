/**
 * Admin: gerenciar tags e config; baixar JSON para commit no repo.
 */
(function () {
  "use strict";

  var adminLink = document.getElementById("admin-link");
  var adminOverlay = document.getElementById("admin-overlay");
  var adminClose = document.getElementById("admin-close");
  var maxSizeInput = document.getElementById("max-size");
  var tagListEl = document.getElementById("tag-list");
  var btnAddTag = document.getElementById("btn-add-tag");
  var tagForm = document.getElementById("tag-form");
  var formTitle = document.getElementById("form-title");
  var btnSaveTag = document.getElementById("btn-save-tag");
  var btnCancelTag = document.getElementById("btn-cancel-tag");
  var btnDownloadConfig = document.getElementById("btn-download-config");

  var currentConfig = null;
  var editingIndex = -1;

  function openAdmin() {
    var cfg = window.appConfig ? window.appConfig() : null;
    if (!cfg) {
      fetch("tags-config.json")
        .then(function (res) { return res.json(); })
        .then(function (data) {
          currentConfig = JSON.parse(JSON.stringify(data));
          renderAdmin();
        })
        .catch(function () {
          currentConfig = { maxFileSizeMB: 100, tags: [] };
          renderAdmin();
        });
    } else {
      currentConfig = JSON.parse(JSON.stringify(cfg));
      renderAdmin();
    }
    adminOverlay.classList.add("admin-overlay--open");
  }

  function closeAdmin() {
    adminOverlay.classList.remove("admin-overlay--open");
    tagForm.classList.add("hidden");
  }

  function renderAdmin() {
    maxSizeInput.value = currentConfig.maxFileSizeMB || 100;
    renderTagList();
  }

  function renderTagList() {
    tagListEl.innerHTML = "";
    if (!currentConfig.tags || currentConfig.tags.length === 0) {
      var emptyMsg = document.createElement("li");
      emptyMsg.style.cssText = "text-align: center; color: var(--text-secondary); padding: 1rem;";
      emptyMsg.textContent = "Nenhuma tag configurada. Adicione uma tag para começar.";
      tagListEl.appendChild(emptyMsg);
      return;
    }
    currentConfig.tags.forEach(function (tag, idx) {
      var li = document.createElement("li");
      li.className = "tag-item";
      var patterns = Array.isArray(tag.pattern) ? tag.pattern : [tag.pattern];
      var patternText = patterns.map(function (p) { return "<span class=\"tag-item__pattern\">" + p + "</span>"; }).join(" ");
      li.innerHTML =
        "<div class=\"tag-item__header\">" +
        "<span class=\"tag-item__name\">" + tag.name + "</span>" +
        "<div class=\"tag-item__actions\">" +
        "<button class=\"tag-item__btn tag-item__btn--edit\" data-index=\"" + idx + "\">Editar</button>" +
        "<button class=\"tag-item__btn tag-item__btn--delete\" data-index=\"" + idx + "\">Remover</button>" +
        "</div>" +
        "</div>" +
        "<div class=\"tag-item__meta\">Tipo: " + tag.type + " | Pattern: " + patternText + "</div>";
      tagListEl.appendChild(li);
    });

    var editBtns = tagListEl.querySelectorAll(".tag-item__btn--edit");
    var deleteBtns = tagListEl.querySelectorAll(".tag-item__btn--delete");
    editBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        editTag(parseInt(btn.getAttribute("data-index"), 10));
      });
    });
    deleteBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        deleteTag(parseInt(btn.getAttribute("data-index"), 10));
      });
    });
  }

  function editTag(index) {
    editingIndex = index;
    var tag = currentConfig.tags[index];
    formTitle.textContent = "Editar tag";
    document.getElementById("tag-id").value = tag.id || "";
    document.getElementById("tag-name").value = tag.name || "";
    var patterns = Array.isArray(tag.pattern) ? tag.pattern : [tag.pattern];
    document.getElementById("tag-pattern").value = patterns.join(", ");
    document.getElementById("tag-type").value = tag.type || "block";
    document.getElementById("tag-template").value = tag.outputTemplate || "";
    document.getElementById("tag-options").value = JSON.stringify(tag.options || {}, null, 2);
    tagForm.classList.remove("hidden");
    document.getElementById("tag-id").focus();
  }

  function deleteTag(index) {
    if (confirm("Remover a tag \"" + currentConfig.tags[index].name + "\"?")) {
      currentConfig.tags.splice(index, 1);
      renderTagList();
    }
  }

  function saveTag() {
    var id = document.getElementById("tag-id").value.trim();
    var name = document.getElementById("tag-name").value.trim();
    var patternStr = document.getElementById("tag-pattern").value.trim();
    var type = document.getElementById("tag-type").value;
    var template = document.getElementById("tag-template").value.trim();
    var optionsStr = document.getElementById("tag-options").value.trim();

    if (!id || !name || !patternStr || !template) {
      alert("Preencha ID, Nome, Pattern e Output Template.");
      return;
    }

    var patterns = patternStr.split(",").map(function (p) { return p.trim(); }).filter(function (p) { return p.length > 0; });
    var pattern = patterns.length === 1 ? patterns[0] : patterns;

    var options = {};
    try {
      options = optionsStr ? JSON.parse(optionsStr) : {};
    } catch (e) {
      alert("Options JSON inválido: " + e.message);
      return;
    }

    var tag = {
      id: id,
      name: name,
      pattern: pattern,
      type: type,
      outputTemplate: template
    };
    if (Object.keys(options).length > 0) tag.options = options;

    if (editingIndex >= 0) {
      currentConfig.tags[editingIndex] = tag;
    } else {
      currentConfig.tags.push(tag);
    }

    renderTagList();
    cancelTagForm();
  }

  function cancelTagForm() {
    tagForm.classList.add("hidden");
    editingIndex = -1;
    document.getElementById("tag-id").value = "";
    document.getElementById("tag-name").value = "";
    document.getElementById("tag-pattern").value = "";
    document.getElementById("tag-type").value = "block";
    document.getElementById("tag-template").value = "";
    document.getElementById("tag-options").value = "{}";
  }

  function downloadConfig() {
    currentConfig.maxFileSizeMB = parseInt(maxSizeInput.value, 10) || 100;
    var json = JSON.stringify(currentConfig, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "tags-config.json";
    a.click();
    URL.revokeObjectURL(url);

    if (window.setAppConfig) window.setAppConfig(currentConfig);
  }

  adminLink.addEventListener("click", function (e) {
    e.preventDefault();
    openAdmin();
  });

  adminClose.addEventListener("click", closeAdmin);
  adminOverlay.addEventListener("click", function (e) {
    if (e.target === adminOverlay) closeAdmin();
  });

  btnAddTag.addEventListener("click", function () {
    editingIndex = -1;
    formTitle.textContent = "Adicionar tag";
    tagForm.classList.remove("hidden");
    document.getElementById("tag-id").focus();
  });

  btnSaveTag.addEventListener("click", saveTag);
  btnCancelTag.addEventListener("click", cancelTagForm);
  btnDownloadConfig.addEventListener("click", downloadConfig);
})();
