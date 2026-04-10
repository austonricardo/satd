export const LANGUAGE_CONFIG = {
  java: {
    extensions: [".java"],
    extractor: "java"
  },
  python: {
    extensions: [".py"],
    extractor: "python"
  }
};

export function detectLanguageFromPath(path) {
  const lower = path.toLowerCase();
  for (const [language, cfg] of Object.entries(LANGUAGE_CONFIG)) {
    if (cfg.extensions.some((ext) => lower.endsWith(ext))) {
      return language;
    }
  }
  return null;
}
