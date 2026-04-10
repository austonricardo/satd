import { analyzeRepository } from "./pipeline.js";
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
      await downloadCsv(STATE.latestResult.rows, `${safeRepo}-${STATE.latestResult.branch}-satd.csv`);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "start_analysis") {
    (async () => {
      if (STATE.running) {
        sendResponse({ ok: false, error: "Já existe uma análise em execução." });
        return;
      }

      STATE.running = true;
      STATE.latestResult = null;

      try {
        const settings = await getSettings();
        const result = await analyzeRepository(message.repoContext, settings, broadcastProgress);
        STATE.latestResult = result;
        sendResponse({ ok: true, result });
      } catch (error) {
        sendResponse({ ok: false, error: error.message || "Falha no pipeline." });
      } finally {
        STATE.running = false;
      }
    })();

    return true;
  }

  return false;
});
