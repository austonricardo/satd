const GITHUB_API_BASE = "https://api.github.com";

function buildHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function getDefaultBranch(owner, repo, token) {
  const resp = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: buildHeaders(token)
  });
  if (!resp.ok) throw new Error(`Falha ao buscar repositório: ${resp.status}`);
  const data = await resp.json();
  return data.default_branch;
}

export async function listFilesRecursive(owner, repo, branch, token) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const resp = await fetch(url, { headers: buildHeaders(token) });
  if (!resp.ok) throw new Error(`Falha ao listar arquivos: ${resp.status}`);

  const data = await resp.json();
  return (data.tree || []).filter((node) => node.type === "blob").map((node) => node.path);
}

export async function getFileContent(owner, repo, path, branch, token) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`;
  const resp = await fetch(url, { headers: buildHeaders(token) });
  if (!resp.ok) throw new Error(`Falha ao buscar arquivo ${path}: ${resp.status}`);

  const data = await resp.json();
  if (data.encoding === "base64" && data.content) {
    return atob(data.content.replace(/\n/g, ""));
  }

  if (data.download_url) {
    const rawResp = await fetch(data.download_url, { headers: buildHeaders(token) });
    if (!rawResp.ok) throw new Error(`Falha ao baixar conteúdo bruto: ${rawResp.status}`);
    return rawResp.text();
  }

  return "";
}
