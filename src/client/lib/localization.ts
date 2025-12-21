import type { LocalizedString } from "../../shared/models";

export function getLocalizedText(value: LocalizedString | undefined | null, lang: string | undefined): string {
  if (!value) return "";

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    if (lang && lang.startsWith('en') && value.en) {
      return value.en;
    }
    return value.ua || "";
  }

  return "";
}