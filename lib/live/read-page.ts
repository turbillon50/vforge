const SCRIPT_STYLE = /<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi;
const TAGS = /<[^>]+>/g;
const WHITESPACE = /\s+/g;

export function extractReadableText(html: string): { title: string; text: string } {
  const raw = html.replace(/\0/g, "");
  const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeEntities((titleMatch?.[1] || "").replace(TAGS, ""))
    .replace(WHITESPACE, " ")
    .trim()
    .slice(0, 160);
  const text = decodeEntities(
    raw
      .replace(SCRIPT_STYLE, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h1|h2|h3|li|tr|section|article)>/gi, "\n")
      .replace(TAGS, " ")
      .replace(WHITESPACE, " "),
  )
    .trim()
    .slice(0, 8000);
  return { title, text };
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/"/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return code > 31 && code < 65535 ? String.fromCharCode(code) : " ";
    });
}
