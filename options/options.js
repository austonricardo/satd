const defaults = {
  githubToken: "",
  classifierApiUrl: "",
  classifierApiKey: "",
  classifierModel: "default",
  enabledLanguages: ["java", "python"],
  includePythonDocstrings: true
};

const els = {
  githubToken: document.getElementById("githubToken"),
  classifierApiUrl: document.getElementById("classifierApiUrl"),
  classifierApiKey: document.getElementById("classifierApiKey"),
  classifierModel: document.getElementById("classifierModel"),
  langJava: document.getElementById("langJava"),
  langPython: document.getElementById("langPython"),
  includePyDoc: document.getElementById("includePyDoc"),
  saveBtn: document.getElementById("saveBtn"),
  status: document.getElementById("status")
};

async function load() {
  const settings = await chrome.storage.sync.get(defaults);

  els.githubToken.value = settings.githubToken || "";
  els.classifierApiUrl.value = settings.classifierApiUrl || "";
  els.classifierApiKey.value = settings.classifierApiKey || "";
  els.classifierModel.value = settings.classifierModel || "default";
  els.langJava.checked = settings.enabledLanguages.includes("java");
  els.langPython.checked = settings.enabledLanguages.includes("python");
  els.includePyDoc.checked = settings.includePythonDocstrings !== false;
}

els.saveBtn.addEventListener("click", async () => {
  const enabledLanguages = [];
  if (els.langJava.checked) enabledLanguages.push("java");
  if (els.langPython.checked) enabledLanguages.push("python");

  const payload = {
    githubToken: els.githubToken.value.trim(),
    classifierApiUrl: els.classifierApiUrl.value.trim(),
    classifierApiKey: els.classifierApiKey.value.trim(),
    classifierModel: els.classifierModel.value.trim() || "default",
    enabledLanguages,
    includePythonDocstrings: els.includePyDoc.checked
  };

  await chrome.storage.sync.set(payload);
  els.status.textContent = "Salvo!";
  setTimeout(() => {
    els.status.textContent = "";
  }, 1500);
});

await load();
