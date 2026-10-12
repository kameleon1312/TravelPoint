const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), 'g');
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), 'g');

// JSON.stringify leaves '<' intact, so explorer-supplied text such as "</script><script>…"
// would terminate the JSON-LD block and execute. Escape HTML-significant characters
// (and JS line separators) as unicode escapes, which JSON parsers read back unchanged.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEPARATOR, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR, '\\u2029');
}
