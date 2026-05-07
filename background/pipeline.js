import { detectLanguageFromPath } from "../core/language-config.js";
import { extractJavaComments } from "../core/comment-extractors/java.js";
import { extractPythonComments } from "../core/comment-extractors/python.js";
import { listFilesRecursive, getFileContent, getDefaultBranch } from "./github-api.js";
import { classifyDataset } from "./classifier-api.js";

function extractCommentsByLanguage(language, content, settings) {
  if (language === "java") return extractJavaComments(content);
  if (language === "python") return extractPythonComments(content, settings.includePythonDocstrings !== false);
  return [];
}

function buildClassifierDataset(rows) {
  return rows
    .filter((row) => Number.isInteger(row.id_comentario) && row.comentario)
    .map((row) => ({
      id_comentario: row.id_comentario,
      comentario: row.comentario,
      url_arquivo: row.url_arquivo
    }));
}

export async function extractRepository(repoContext, settings, progressCallback = () => {}) {
  const { owner, repo } = repoContext;
  const branch = repoContext.branch || await getDefaultBranch(owner, repo, settings.githubToken);

  progressCallback({ phase: "list_files", progress: 3, message: "Listando arquivos do repositório..." });
  const allFiles = await listFilesRecursive(owner, repo, branch, settings.githubToken);

  const enabled = settings.enabledLanguages || ["java", "python"];
  const targetFiles = allFiles.filter((path) => {
    const language = detectLanguageFromPath(path);
    return language && enabled.includes(language);
  });

  const rows = [];
  let nextCommentId = 1;
  let processedFiles = 0;

  for (const path of targetFiles) {
    processedFiles += 1;
    const language = detectLanguageFromPath(path);
    const pct = Math.round((processedFiles / Math.max(1, targetFiles.length)) * 90);

    progressCallback({
      phase: "extract_comments",
      progress: 5 + pct,
      message: `Extraindo ${processedFiles}/${targetFiles.length}: ${path}`
    });

    try {
      const content = await getFileContent(owner, repo, path, branch, settings.githubToken);
      const comments = extractCommentsByLanguage(language, content, settings);

      for (const comment of comments) {
        const idComentario = nextCommentId;
        nextCommentId += 1;

        rows.push({
          id_comentario: idComentario,
          projeto_branch_versao: `${owner}/${repo}@${branch}`,
          url_arquivo: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
          comentario: comment,
          is_satd: "",
          classificacao_api: ""
        });
      }
    } catch (error) {
      rows.push({
        id_comentario: "",
        projeto_branch_versao: `${owner}/${repo}@${branch}`,
        url_arquivo: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
        comentario: `Erro ao processar arquivo: ${error.message}`,
        is_satd: "",
        classificacao_api: ""
      });
    }
  }

  progressCallback({ phase: "done", progress: 100, message: "Extração concluída." });

  return {
    repo: `${owner}/${repo}`,
    branch,
    totalFiles: targetFiles.length,
    totalComments: rows.length,
    analyzed: false,
    rows
  };
}

export async function analyzeExtractedDataset(extractedResult, settings, progressCallback = () => {}) {
  const classifierDataset = buildClassifierDataset(extractedResult?.rows || []);

  progressCallback({
    phase: "classify_dataset",
    progress: 20,
    message: "Classificando dataset completo no web service..."
  });

  const classifications = await classifyDataset(classifierDataset, settings);
  const classificationById = new Map(
    classifierDataset.map((item, index) => [item.id_comentario, classifications[index] || {}])
  );

  const rows = (extractedResult?.rows || []).map((row) => {
    if (!Number.isInteger(row.id_comentario)) return { ...row };

    const classified = classificationById.get(row.id_comentario) || {};
    return {
      ...row,
      is_satd: Boolean(classified.is_satd),
      classificacao_api: classified.classificacao_api || "error"
    };
  });

  progressCallback({ phase: "done", progress: 100, message: "Análise concluída." });

  return {
    ...extractedResult,
    analyzed: true,
    rows
  };
}

export async function analyzeRepository(repoContext, settings, progressCallback = () => {}) {
  const extractedResult = await extractRepository(repoContext, settings, progressCallback);
  return analyzeExtractedDataset(extractedResult, settings, progressCallback);
}
