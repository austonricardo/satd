/**
 * Extrator simples de comentários Java:
 * - linha: //
 * - bloco: /* *\/ 
 */
export function extractJavaComments(content) {
  const comments = [];

  const lineRegex = /(^|\s)\/\/([^\n\r]*)/gm;
  let lineMatch;
  while ((lineMatch = lineRegex.exec(content)) !== null) {
    const raw = lineMatch[2]?.trim();
    if (raw) comments.push(raw);
  }

  const blockRegex = /\/\*([\s\S]*?)\*\//gm;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(content)) !== null) {
    const raw = blockMatch[1]
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\*\s?/, "").trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    if (raw) comments.push(raw);
  }

  return comments;
}
