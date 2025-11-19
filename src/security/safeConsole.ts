const KEY_RE = /(apiKey=)([^&\s]+)/gi;

export function scrubUrl(u: string): string {
  return u.replace(KEY_RE, "$1****");
}

export const safeConsole = {
  log: (...a: any[]) => console.log(...a.map(x => typeof x === "string" ? scrubUrl(x) : x)),
  warn: (...a: any[]) => console.warn(...a.map(x => typeof x === "string" ? scrubUrl(x) : x)),
  error: (...a: any[]) => console.error(...a.map(x => typeof x === "string" ? scrubUrl(x) : x)),
};
