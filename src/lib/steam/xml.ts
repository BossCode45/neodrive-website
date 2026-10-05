/*
 * Just enough XML for Steam's community endpoints (leaderboards, profiles), which are flat:
 * repeated blocks of simple elements, with text sometimes wrapped in CDATA.
 */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** The inner XML of every `<tag>…</tag>` in `xml`, in document order. */
export function xmlBlocks(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  return Array.from(xml.matchAll(pattern), (match) => match[1]);
}

/** The text of the first `<tag>` in `xml`, with CDATA unwrapped and entities decoded; null if it's missing. */
export function xmlText(xml: string, tag: string): string | null {
  const inner = xmlBlocks(xml, tag)[0];
  if (inner === undefined) return null;
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(inner);
  if (cdata) return cdata[1];
  return inner.trim().replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (entity, name: string) => {
    if (name[0] === "#") {
      const code = name[1].toLowerCase() === "x" ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);
      return Number.isNaN(code) ? entity : String.fromCodePoint(code);
    }
    return ENTITIES[name] ?? entity;
  });
}

/** Whether `<tag>` (open, or self-closing) appears anywhere in `xml`. */
export function xmlHas(xml: string, tag: string): boolean {
  return new RegExp(`<${tag}[\\s/>]`).test(xml);
}
