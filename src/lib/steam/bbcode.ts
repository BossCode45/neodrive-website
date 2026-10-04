import "server-only";

/** What Steam's `{STEAM_CLAN_IMAGE}` placeholder resolves to. */
export const CLAN_IMAGE_BASE = "https://clan.akamai.steamstatic.com/images";

/** Images on this host go through the Next image optimizer (see `images.remotePatterns` in next.config.ts). */
export function isSteamImage(url: string) {
  return url.startsWith(`${CLAN_IMAGE_BASE}/`);
}

export function resolveImageUrl(url: string) {
  return url.trim().replace("{STEAM_CLAN_IMAGE}", CLAN_IMAGE_BASE);
}

const BLOCK_TAGS = /\[\/?(p|h\d|list|olist|\*|quote|code|table|tr|hr)\]/gi;

/** Plain-text excerpt for update cards. */
export function toExcerpt(bbcode: string, maxLength = 300) {
  let text = bbcode.replace(BLOCK_TAGS, "\n").replace(/\[[^\]]+\]/g, "");
  text = text.replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}

/** Image URLs in a post body, in order: `[img src="..."]` and `[img]...[/img]`. */
export function bodyImages(bbcode: string) {
  const urls: string[] = [];
  for (const match of bbcode.matchAll(/\[img(?:\s+src="([^"]+)"[^\]]*)?\](?:([^[]*)\[\/img\])?/gi)) {
    const url = match[1] || match[2];
    if (url?.trim()) urls.push(resolveImageUrl(url));
  }
  return urls;
}

// ---------------------------------------------------------------------------
// BBCode → HTML

const SIMPLE_TAGS: Record<string, string> = {
  p: "p",
  h1: "h2", // the page title is the post's h1
  h2: "h3",
  h3: "h4",
  h4: "h5",
  h5: "h6",
  h6: "h6",
  b: "strong",
  i: "em",
  u: "u",
  strike: "s",
  list: "ul",
  olist: "ol",
  "*": "li",
  quote: "blockquote",
  code: "pre",
  table: "table",
  tr: "tr",
  th: "th",
  td: "td",
};

const BLOCK_ELEMENTS = new Set(["p", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "table", "tr", "th", "td", "hr", "figure", "div"]);

const TOKEN = /\[(\/?)([a-z0-9*]+)((?:=[^\]]*)?(?:\s+[a-z_]+="[^"]*")*)\s*\]/gi;

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "#39" }[c]};`);
}

function safeUrl(raw: string | undefined) {
  if (!raw) return null;
  try {
    const url = new URL(resolveImageUrl(raw.replace(/^"|"$/g, "")));
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/** `=value` or `src="value"` style tag arguments. */
function tagArg(args: string, name?: string) {
  if (!name) return args.match(/^=\s*"?([^"\]]*)"?/)?.[1];
  return args.match(new RegExp(`${name}="([^"]*)"`))?.[1];
}

function imageHtml(src: string) {
  const optimized = isSteamImage(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=1920&q=75` : src;
  return `<img src="${escapeHtml(optimized)}" alt="" loading="lazy" decoding="async">`;
}

/**
 * Convert a Steam post body to HTML. All text is escaped and only whitelisted tags are emitted,
 * so the result is safe to render with `dangerouslySetInnerHTML`.
 */
export function toHtml(bbcode: string) {
  const out: string[] = [];
  const stack: string[] = []; // open HTML elements

  const open = (tag: string, attrs = "") => {
    out.push(`<${tag}${attrs}>`);
    stack.push(tag);
  };
  const closeTo = (tag: string) => {
    const index = stack.lastIndexOf(tag);
    if (index === -1) return;
    while (stack.length > index) out.push(`</${stack.pop()}>`);
  };
  const trimTrailingBreaks = () => {
    while (out.at(-1) === "<br>") out.pop();
  };
  // Legacy posts put text outside any [p]; wrap it in paragraphs, split on blank lines.
  let autoParagraph = false;
  const ensureParagraph = () => {
    if (stack.length === 0) {
      open("p");
      autoParagraph = true;
    }
  };
  const endAutoParagraph = () => {
    if (autoParagraph) closeTo("p");
    autoParagraph = false;
  };
  const text = (value: string) => {
    if (!value) return;
    // Newlines right after block tags are just source formatting.
    const lastIsBlock = out.length === 0 || /^<\/?([a-z0-9]+)/.exec(out.at(-1)!)?.slice(1).some((t) => BLOCK_ELEMENTS.has(t));
    if (lastIsBlock) value = value.replace(/^\s*\n/, "");
    if (!value.trim() && (stack.length === 0 || autoParagraph)) return;
    ensureParagraph();
    const paragraphs = autoParagraph ? value.split(/\n[ \t]*\n\s*/) : [value];
    paragraphs.forEach((paragraph, p) => {
      if (p > 0) {
        trimTrailingBreaks();
        closeTo("p");
        open("p");
      }
      paragraph.split("\n").forEach((line, i) => {
        if (i > 0) out.push("<br>");
        if (line) out.push(escapeHtml(line));
      });
    });
  };

  let cursor = 0;
  let skipUntil: string | null = null; // closing tag whose content was already consumed (img, previewyoutube)

  for (const match of bbcode.matchAll(TOKEN)) {
    const [raw, slash, rawName, args] = match;
    const name = rawName.toLowerCase();
    const before = bbcode.slice(cursor, match.index);
    cursor = match.index + raw.length;

    if (skipUntil) {
      if (slash && name === skipUntil) skipUntil = null;
      continue;
    }
    text(before);

    if (name === "img" && !slash) {
      const close = bbcode.toLowerCase().indexOf("[/img]", cursor);
      const inner = close === -1 ? "" : bbcode.slice(cursor, close);
      const src = safeUrl(tagArg(args, "src") ?? inner);
      if (src) out.push(imageHtml(src));
      if (close !== -1) skipUntil = "img";
      continue;
    }

    if (name === "previewyoutube" && !slash) {
      const id = tagArg(args)?.split(";")[0];
      if (id && /^[\w-]{6,20}$/.test(id)) {
        trimTrailingBreaks();
        endAutoParagraph();
        out.push(
          `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" loading="lazy" ` +
          `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`,
        );
      }
      skipUntil = "previewyoutube";
      continue;
    }

    if (name === "url") {
      if (slash) {
        closeTo("a");
      } else {
        const href = safeUrl(tagArg(args));
        if (href) {
          ensureParagraph();
          open("a", ` href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"`);
        }
      }
      continue;
    }

    if (name === "hr" && !slash) {
      trimTrailingBreaks();
      endAutoParagraph();
      out.push("<hr>");
      continue;
    }

    const tag = SIMPLE_TAGS[name];
    if (!tag) continue; // unknown tag: drop it, keep its text

    if (BLOCK_ELEMENTS.has(tag)) {
      trimTrailingBreaks();
      endAutoParagraph();
    } else if (!slash) {
      ensureParagraph();
    }
    if (slash) {
      closeTo(tag);
    } else {
      // List items are often left unclosed; a new [*] closes the previous one.
      if (tag === "li") {
        const list = Math.max(stack.lastIndexOf("ul"), stack.lastIndexOf("ol"));
        if (list === -1) open("ul");
        else if (stack.lastIndexOf("li") > list) closeTo("li");
      }
      open(tag);
    }
  }

  if (!skipUntil) text(bbcode.slice(cursor));
  trimTrailingBreaks();
  while (stack.length) out.push(`</${stack.pop()}>`);

  // Steam uses empty paragraphs as spacers; our CSS spaces paragraphs already.
  return out.join("").replace(/<p>(\s|<br>)*<\/p>/g, "");
}
