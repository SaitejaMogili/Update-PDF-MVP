// Client-safe constants — no server-only imports.
// Server-side processing code lives in translate.ts.

export const LANGUAGES = {
  fr: "French",
  de: "German",
  es: "Spanish",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  tr: "Turkish",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  el: "Greek",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese (Simplified)",
  ar: "Arabic",
  hi: "Hindi",
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// Languages where Helvetica can't render characters — we still translate but warn
const LATIN_ONLY_NOTE_LANGS = new Set<LanguageCode>(["ja", "ko", "zh", "ar", "hi"]);

export function needsFontWarning(lang: LanguageCode): boolean {
  return LATIN_ONLY_NOTE_LANGS.has(lang);
}
