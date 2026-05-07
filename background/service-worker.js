import { analyzeExtractedDataset, extractRepository } from "./pipeline.js";
import { downloadCsv } from "./csv-exporter.js";

const STATE = {
  latestResult: null,
  running: false
};

async function getSettings() {
  const defaults = {
    githubToken: "",
    classifierApiUrl: "",
    classifierApiKey: "",
    classifierModel: "default",
    enabledLanguages: ["java", "python"],
    includePythonDocstrings: true
  };

  return chrome.storage.sync.get(defaults);
}

function broadcastProgress(payload) {
  chrome.runtime.sendMessage({ type: "analysis_progress", payload }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "get_latest_result") {
    sendResponse({ running: STATE.running, latestResult: STATE.latestResult });
    return true;
  }

  if (message?.type === "export_csv") {
    (async () => {
      if (!STATE.latestResult?.rows?.length) {
        sendResponse({ ok: false, error: "Nenhum resultado para exportar." });
        return;
      }

      const safeRepo = STATE.latestResult.repo.replace(/\//g, "-");
      const suffix = STATE.latestResult.analyzed ? "satd" : "dataset-extraido";
      await downloadCsv(STATE.latestResult.rows, `${safeRepo}-${STATE.latestResult.branch}-${suffix}.csv`);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "extract_repository") {
    (async () => {
      if (STATE.running) {
        sendResponse({ ok: false, error: "Já existe um processamento em execução." });
        return;
      }

      STATE.running = true;
      STATE.latestResult = null;

      try {
        const settings = await getSettings();
        const result = await extractRepository(message.repoContext, settings, broadcastProgress);
        STATE.latestResult = result;
        sendResponse({ ok: true, result });
      } catch (error) {
        sendResponse({ ok: false, error: error.message || "Falha na extração." });
      } finally {
        STATE.running = false;
      }
    })();

    return true;
  }

  if (message?.type === "analyze_dataset") {
    (async () => {
      if (STATE.running) {
        sendResponse({ ok: false, error: "Já existe um processamento em execução." });
        return;
      }

      if (!STATE.latestResult?.rows) {
        sendResponse({ ok: false, error: "Extraia o dataset do repositório antes de analisar." });
        return;
      }

      STATE.running = true;

      try {
        const settings = await getSettings();
        const result = await analyzeExtractedDataset(STATE.latestResult, settings, broadcastProgress);
        STATE.latestResult = result;
        sendResponse({ ok: true, result });
      } catch (error) {
        sendResponse({ ok: false, error: error.message || "Falha na análise." });
      } finally {
        STATE.running = false;
      }
    })();

    return true;
  }

  if (message?.type === "start_analysis") {
    sendResponse({ ok: false, error: "Use primeiro a extração do repositório e depois a análise do dataset." });
    return true;
  }

  return false;
});
