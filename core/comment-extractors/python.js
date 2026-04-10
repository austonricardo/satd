/**
 * Extrator simples de comentários Python:
 * - linha: #
 * - docstring opcional: '''...''' e """..."""
 */
export function extractPythonComments(content, includeDocstrings = true) {
  const comments = [];

  const lineRegex = /(^|\s)#([^\n\r]*)/gm;
  let lineMatch;
  while ((lineMatch = lineRegex.exec(content)) !== null) {
    const raw = lineMatch[2]?.trim();
    if (raw) comments.push(raw);
  }

  if (includeDocstrings) {
    const tripleDouble = /"""([\s\S]*?)"""/gm;
    const tripleSingle = /'''([\s\S]*?)'''/gm;

    for (const regex of [tripleDouble, tripleSingle]) {
      let blockMatch;
      while ((blockMatch = regex.exec(content)) !== null) {
        const raw = blockMatch[1]
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .join(" ")
          .trim();
        if (raw) comments.push(raw);
      }
    }
  }

  return comments;
}
