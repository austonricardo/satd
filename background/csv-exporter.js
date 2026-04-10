function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildCsv(rows) {
  const header = [
    "projeto_branch_versao",
    "url_arquivo",
    "comentario",
    "is_satd",
    "classificacao_api"
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push([
      csvEscape(row.projeto_branch_versao),
      csvEscape(row.url_arquivo),
      csvEscape(row.comentario),
      csvEscape(row.is_satd),
      csvEscape(row.classificacao_api)
    ].join(","));
  }
  return lines.join("\n");
}

export async function downloadCsv(rows, filename = "satd-analysis.csv") {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url,
    filename,
    saveAs: true
  });

  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
