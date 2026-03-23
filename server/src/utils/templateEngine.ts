export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => variables[key] ?? match);
}
