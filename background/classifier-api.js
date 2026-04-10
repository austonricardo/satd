export async function classifyComment(comment, settings = {}) {
  const {
    classifierApiUrl,
    classifierApiKey,
    timeoutMs = 10000,
    classifierModel = "default"
  } = settings;

  if (!classifierApiUrl) {
    return {
      is_satd: false,
      classificacao_api: "not_configured",
      detail: "API não configurada"
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(classifierApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(classifierApiKey ? { Authorization: `Bearer ${classifierApiKey}` } : {})
      },
      body: JSON.stringify({
        model: classifierModel,
        text: comment
      }),
      signal: controller.signal
    });

    if (!resp.ok) {
      return {
        is_satd: false,
        classificacao_api: `http_${resp.status}`,
        detail: "Falha HTTP"
      };
    }

    const data = await resp.json();
    return {
      is_satd: Boolean(data.is_satd),
      classificacao_api: data.classificacao_api || data.label || "ok",
      detail: data.detail || ""
    };
  } catch (error) {
    return {
      is_satd: false,
      classificacao_api: "error",
      detail: error?.name === "AbortError" ? "timeout" : "network_error"
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
