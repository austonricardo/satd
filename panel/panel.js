import { renderSatdChart } from "./charts.js";

const els = {
  repoInfo: document.getElementById("repo-info"),
  startBtn: document.getElementById("start-btn"),
  exportBtn: document.getElementById("export-btn"),
  loading: document.getElementById("loading"),
  statusText: document.getElementById("status-text"),
  progressFill: document.getElementById("progress-fill"),
  progressValue: document.getElementById("progress-value"),
  summary: document.getElementById("summary"),
  chartCard: document.getElementById("chart-card"),
  chart: document.getElementById("satd-chart")
};

let activeRepoContext = null;

function setProgress(progress = 0, message = "") {
  const normalized = Math.max(0, Math.min(100, Number(progress) || 0));
  els.progressFill.style.width = `${normalized}%`;
  els.progressValue.textContent = `${normalized}%`;
  if (message) els.statusText.textContent = message;
}

function setLoading(isLoading) {
  els.loading.classList.toggle("hidden", !isLoading);
  els.startBtn.disabled = isLoading;
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

function renderSummary(result) {
  const satdCount = result.rows.filter((row) => row.is_satd).length;
  const nonSatdCount = result.rows.length - satdCount;

  els.summary.innerHTML = `
    <h2>Resumo</h2>
    <ul>
      <li><strong>Repositório:</strong> ${result.repo}</li>
      <li><strong>Branch:</strong> ${result.branch}</li>
      <li><strong>Arquivos analisados:</strong> ${result.totalFiles}</li>
      <li><strong>Comentários processados:</strong> ${result.totalComments}</li>
      <li><strong>SATD detectado:</strong> ${satdCount}</li>
    </ul>
  `;
  els.summary.classList.remove("hidden");
  els.chartCard.classList.remove("hidden");
  renderSatdChart(els.chart, { satdCount, nonSatdCount });
}

async function initRepoContext() {
  const tab = await getCurrentTab();
  activeRepoContext = parseRepoContextFromUrl(tab?.url || "");

  if (!activeRepoContext) {
    els.repoInfo.textContent = "Navegue para um repositório no GitHub para habilitar a análise.";
    els.startBtn.disabled = true;
    return;
  }

  els.startBtn.disabled = false;
  els.repoInfo.textContent = `Repo: ${activeRepoContext.owner}/${activeRepoContext.repo}`;
}

els.startBtn.addEventListener("click", async () => {
  if (!activeRepoContext) return;

  setLoading(true);
  setProgress(1, "Preparando pipeline...");
  els.summary.classList.add("hidden");
  els.chartCard.classList.add("hidden");
  els.exportBtn.disabled = true;

  const response = await chrome.runtime.sendMessage({
    type: "start_analysis",
    repoContext: activeRepoContext
  });

  setLoading(false);

  if (!response?.ok) {
    setProgress(0, response?.error || "Falha na análise.");
    return;
  }

  setProgress(100, "Análise finalizada.");
  renderSummary(response.result);
  els.exportBtn.disabled = false;
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
