import { renderSatdChart } from "./charts.js";

const els = {
  repoInfo: document.getElementById("repo-info"),
  extractBtn: document.getElementById("extract-btn"),
  analyzeBtn: document.getElementById("analyze-btn"),
  exportBtn: document.getElementById("export-btn"),
  loading: document.getElementById("loading"),
  statusText: document.getElementById("status-text"),
  progressFill: document.getElementById("progress-fill"),
  progressValue: document.getElementById("progress-value"),
  summary: document.getElementById("summary"),
  datasetCard: document.getElementById("dataset-card"),
  datasetCount: document.getElementById("dataset-count"),
  datasetTableBody: document.querySelector("#dataset-table tbody"),
  chartCard: document.getElementById("chart-card"),
  chart: document.getElementById("satd-chart")
};

let activeRepoContext = null;
let latestResult = null;

function setProgress(progress = 0, message = "") {
  const normalized = Math.max(0, Math.min(100, Number(progress) || 0));
  els.progressFill.style.width = `${normalized}%`;
  els.progressValue.textContent = `${normalized}%`;
  if (message) els.statusText.textContent = message;
}

function setLoading(isLoading) {
  els.loading.classList.toggle("hidden", !isLoading);
  els.extractBtn.disabled = isLoading || !activeRepoContext;
  els.analyzeBtn.disabled = isLoading || !latestResult?.rows?.length || latestResult.analyzed;
  els.exportBtn.disabled = isLoading || !latestResult?.rows?.length;
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function parseRepoContextFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const [owner, repo, section, maybeBranch] = parts;
    return {
      owner,
      repo,
      branch: section === "tree" ? maybeBranch : null,
      repoUrl: `https://github.com/${owner}/${repo}`
    };
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderDatasetTable(result) {
  const rows = result?.rows || [];
  els.datasetCount.textContent = `${rows.length} registro${rows.length === 1 ? "" : "s"}`;
  els.datasetTableBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.id_comentario)}</td>
      <td>${escapeHtml(row.projeto_branch_versao)}</td>
      <td><a href="${escapeHtml(row.url_arquivo)}" target="_blank" rel="noreferrer">${escapeHtml(row.url_arquivo)}</a></td>
      <td>${escapeHtml(row.comentario)}</td>
      <td>${escapeHtml(row.is_satd)}</td>
      <td>${escapeHtml(row.classificacao_api)}</td>
    </tr>
  `).join("");
  els.datasetCard.classList.remove("hidden");
}

function renderSummary(result) {
  const satdCount = result.rows.filter((row) => row.is_satd === true).length;
  const nonSatdCount = result.rows.filter((row) => row.is_satd === false).length;

  els.summary.innerHTML = `
    <h2>Resumo</h2>
    <ul>
      <li><strong>Repositório:</strong> ${escapeHtml(result.repo)}</li>
      <li><strong>Branch:</strong> ${escapeHtml(result.branch)}</li>
      <li><strong>Arquivos analisados:</strong> ${escapeHtml(result.totalFiles)}</li>
      <li><strong>Comentários processados:</strong> ${escapeHtml(result.totalComments)}</li>
      <li><strong>SATD detectado:</strong> ${satdCount}</li>
    </ul>
  `;
  els.summary.classList.remove("hidden");
  els.chartCard.classList.remove("hidden");
  renderSatdChart(els.chart, { satdCount, nonSatdCount });
}

function renderResult(result) {
  latestResult = result;
  renderDatasetTable(result);

  if (result?.analyzed) {
    renderSummary(result);
  } else {
    els.summary.classList.add("hidden");
    els.chartCard.classList.add("hidden");
  }

  setLoading(false);
}

async function initRepoContext() {
  const tab = await getCurrentTab();
  activeRepoContext = parseRepoContextFromUrl(tab?.url || "");

  if (!activeRepoContext) {
    els.repoInfo.textContent = "Navegue para um repositório no GitHub para habilitar a extração.";
    els.extractBtn.disabled = true;
    return;
  }

  els.extractBtn.disabled = false;
  els.repoInfo.textContent = `Repo: ${activeRepoContext.owner}/${activeRepoContext.repo}`;

  const response = await chrome.runtime.sendMessage({ type: "get_latest_result" });
  if (response?.latestResult?.repo === `${activeRepoContext.owner}/${activeRepoContext.repo}`) {
    renderResult(response.latestResult);
  }
}

els.extractBtn.addEventListener("click", async () => {
  if (!activeRepoContext) return;

  latestResult = null;
  setLoading(true);
  setProgress(1, "Preparando extração...");
  els.summary.classList.add("hidden");
  els.chartCard.classList.add("hidden");
  els.datasetCard.classList.add("hidden");

  const response = await chrome.runtime.sendMessage({
    type: "extract_repository",
    repoContext: activeRepoContext
  });

  if (!response?.ok) {
    setLoading(false);
    setProgress(0, response?.error || "Falha na extração.");
    return;
  }

  setProgress(100, "Extração finalizada. Revise o dataset e clique em Analisar.");
  renderResult(response.result);
});

els.analyzeBtn.addEventListener("click", async () => {
  if (!latestResult?.rows?.length) return;

  setLoading(true);
  setProgress(1, "Preparando análise...");
  els.summary.classList.add("hidden");
  els.chartCard.classList.add("hidden");

  const response = await chrome.runtime.sendMessage({ type: "analyze_dataset" });

  if (!response?.ok) {
    setLoading(false);
    setProgress(0, response?.error || "Falha na análise.");
    return;
  }

  setProgress(100, "Análise finalizada.");
  renderResult(response.result);
});

els.exportBtn.addEventListener("click", async () => {
  const resp = await chrome.runtime.sendMessage({ type: "export_csv" });
  if (!resp?.ok) {
    setProgress(100, resp?.error || "Falha ao exportar CSV.");
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "analysis_progress") return;
  const payload = message.payload || {};
  setProgress(payload.progress, payload.message);
});

await initRepoContext();
