/**
 * Returns the row's English value if the active language is "en" and the
 * EN value is non-empty. Falls back to the German source otherwise.
 *
 * Use inside components that already have access to i18n via useTranslation.
 *
 *   const { i18n } = useTranslation();
 *   const title = localized(row, "title", i18n.language);
 */
export const localized = <T extends object>(
  row: T | null | undefined,
  field: keyof T & string,
  lang: string | undefined,
): string => {
  if (!row) return "";
  const isEn = (lang ?? "").toLowerCase().startsWith("en");
  if (isEn) {
    const enVal = row[`${field}_en` as keyof T];
    if (typeof enVal === "string" && enVal.trim().length > 0) return enVal;
  }
  const deVal = row[field];
  return typeof deVal === "string" ? deVal : "";
};
