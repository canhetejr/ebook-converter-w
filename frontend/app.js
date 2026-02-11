(function () {
    const API_BASE = "http://127.0.0.1:8000";
    const form = document.getElementById("form");
    const fileInput = document.getElementById("file");
    const submitBtn = document.getElementById("submit");
    const statusEl = document.getElementById("status");
    const errorEl = document.getElementById("error");

    function setStatus(text, className) {
        statusEl.textContent = text;
        statusEl.className = "status" + (className ? " " + className : "");
    }

    function setError(text) {
        errorEl.textContent = text || "";
    }

    fileInput.addEventListener("change", function () {
        submitBtn.disabled = !fileInput.files || fileInput.files.length === 0;
        setError("");
        setStatus("");
    });

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        setError("");
        setStatus("Convertendo…", "processing");
        submitBtn.disabled = true;

        const file = fileInput.files[0];
        if (!file) {
            setError("Escolha um arquivo.");
            setStatus("");
            submitBtn.disabled = false;
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(API_BASE + "/convert", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json().catch(function () {
                    return { detail: res.statusText };
                });
                const msg = Array.isArray(data.detail) ? data.detail.map(function (x) { return x.msg; }).join(" ") : (data.detail || "Erro na conversão.");
                setError(msg);
                setStatus("");
                submitBtn.disabled = false;
                return;
            }

            const blob = await res.blob();
            const name = res.headers.get("Content-Disposition");
            let filename = "ebook.txt";
            if (name) {
                const match = name.match(/filename="?([^";\n]+)"?/);
                if (match) filename = match[1].trim();
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            setStatus("Arquivo gerado e baixado.", "success");
        } catch (err) {
            setError("Falha na requisição. Verifique se a API está rodando em " + API_BASE);
            setStatus("");
        }

        submitBtn.disabled = false;
    });
})();
