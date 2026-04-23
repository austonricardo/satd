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

export async function analyzeRepository(repoContext, settings, progressCallback = () => {}) {
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
  const classifierDataset = [];
  let nextCommentId = 1;
  let processedFiles = 0;

  for (const path of targetFiles) {
    processedFiles += 1;
    const language = detectLanguageFromPath(path);
    const pct = Math.round((processedFiles / Math.max(1, targetFiles.length)) * 70);

    progressCallback({
      phase: "extract_comments",
      progress: 10 + pct,
      message: `Processando ${processedFiles}/${targetFiles.length}: ${path}`
    });

    try {
      const content = await getFileContent(owner, repo, path, branch, settings.githubToken);
      const comments = extractCommentsByLanguage(language, content, settings);

      for (const comment of comments) {
        const idComentario = nextCommentId;
        nextCommentId += 1;

        const row = {
          id_comentario: idComentario,
          projeto_branch_versao: `${owner}/${repo}@${branch}`,
          url_arquivo: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
          comentario: comment,
          is_satd: false,
          classificacao_api: "pending"
        };
        rows.push(row);
        classifierDataset.push({
          id_comentario: idComentario,
          comentario: comment,
          url_arquivo: row.url_arquivo
        });
      }
    } catch (error) {
      rows.push({
        projeto_branch_versao: `${owner}/${repo}@${branch}`,
        url_arquivo: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
        comentario: `Erro ao processar arquivo: ${error.message}`,
        is_satd: false,
        classificacao_api: "file_error"
      });
    }
  }

  progressCallback({
    phase: "classify_dataset",
    progress: 95,
    message: "Classificando dataset completo no web service..."
  });

  const classifications = await classifyDataset(classifierDataset, settings);
  rows.forEach((row, index) => {
    const classified = classifications[index] || {};
    row.is_satd = Boolean(classified.is_satd);
    row.classificacao_api = classified.classificacao_api || "error";
  });

  progressCallback({ phase: "done", progress: 100, message: "Análise concluída." });

  return {
    repo: `${owner}/${repo}`,
    branch,
    totalFiles: targetFiles.length,
    totalComments: rows.length,
    rows
  };
}
