function normalizeClassification(item = {}) {
  const rawClassification = item.classificacao_api || item.classificacao || item.classificação || item.label || "ok";
  const normalizedLabel = String(rawClassification).toLowerCase();
  const inferredIsSatd = normalizedLabel.includes("satd") && !normalizedLabel.includes("non_satd");

  return {
    is_satd: item.is_satd == null ? inferredIsSatd : Boolean(item.is_satd),
    classificacao_api: rawClassification,
    detail: item.detail || ""
  };
}

export async function classifyDataset(dataset = [], settings = {}) {
  const {
    classifierApiUrl,
    classifierApiKey,
    timeoutMs = 10000,
    classifierModel = "default"
  } = settings;

  if (!classifierApiUrl) {
    return dataset.map(() => ({
      is_satd: false,
      classificacao_api: "not_configured",
      detail: "API não configurada"
    }));
  }

  if (!Array.isArray(dataset) || dataset.length === 0) {
    return [];
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
        dataset
      }),
      signal: controller.signal
    });

    if (!resp.ok) {
      return dataset.map(() => ({
        is_satd: false,
        classificacao_api: `http_${resp.status}`,
        detail: "Falha HTTP"
      }));
    }

    const data = await resp.json();
    const apiResults = Array.isArray(data)
      ? data
      : Array.isArray(data.results)
        ? data.results
        : [];

    const classificationById = new Map(
      apiResults
        .filter((item) => item && Number.isInteger(item.id_comentario))
        .map((item) => [item.id_comentario, normalizeClassification(item)])
    );

    return dataset.map((item) => {
      const classification = classificationById.get(item.id_comentario);
      return classification || {
        is_satd: false,
        classificacao_api: "not_returned",
        detail: "id_sem_retorno"
      };
    });
  } catch (error) {
    const detail = error?.name === "AbortError" ? "timeout" : "network_error";
    return dataset.map(() => ({
      is_satd: false,
      classificacao_api: "error",
      detail
    }));
  } finally {
    clearTimeout(timeoutId);
  }
}
