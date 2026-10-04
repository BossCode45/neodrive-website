import { describe, expect, it } from "vitest";
import { newsFixture } from "../../../test/steam-fetch-mock";
import { bodyImages, toExcerpt, toHtml } from "./bbcode";

const STEAM_IMAGE = "https://clan.akamai.steamstatic.com/images/45829248/abc.png";

describe("toHtml safety", () => {
  it("escapes HTML in text", () => {
    expect(toHtml(`[p]<script>alert(1)</script> & "q"[/p]`)).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot;</p>",
    );
  });

  it("drops links that aren't http(s) but keeps their text", () => {
    expect(toHtml("[p][url=javascript:alert(1)]click[/url][/p]")).toBe("<p>click</p>");
  });

  it("escapes link URLs", () => {
    expect(toHtml(`[url="https://ok.com/a?b=1&c=2"]ok[/url]`)).toContain(`href="https://ok.com/a?b=1&amp;c=2"`);
  });

  it("drops images that aren't http(s)", () => {
    expect(toHtml("[img]javascript:alert(1)[/img]")).not.toContain("<img");
  });

  it("can't break out of an image src attribute", () => {
    const html = toHtml(`[img src="x\\" onerror=\\"alert(1)"][/img]`);
    expect(html).not.toMatch(/<img[^>]*onerror/);
  });

  it("only embeds well-formed YouTube ids", () => {
    expect(toHtml(`[previewyoutube="abc\\"><script>;full"][/previewyoutube]`)).toBe("");
    expect(toHtml(`[previewyoutube="dQw4w9WgXcQ;full"][/previewyoutube]`)).toContain(
      `src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"`,
    );
  });

  it("never emits an unexpected tag for any real post", () => {
    const allowed = new Set(["p", "h2", "h3", "h4", "h5", "h6", "strong", "em", "u", "s", "ul", "ol", "li", "blockquote", "pre", "table", "tr", "th", "td", "a", "img", "br", "hr", "div", "iframe"]);
    for (const item of newsFixture.appnews.newsitems) {
      for (const [, tag] of toHtml(item.contents).matchAll(/<\/?([a-z0-9]+)/g)) expect(allowed).toContain(tag);
    }
  });
});

describe("toHtml structure", () => {
  it("maps headings down one level (the page title is the h1)", () => {
    expect(toHtml("[h1]Title[/h1][h2]Sub[/h2]")).toBe("<h2>Title</h2><h3>Sub</h3>");
  });

  it("closes unclosed list items", () => {
    expect(toHtml("[list][*]one[*]two[/list]")).toBe("<ul><li>one</li><li>two</li></ul>");
    expect(toHtml("[list][*][p]one[/p][*][p]two[/p][/list]")).toBe("<ul><li><p>one</p></li><li><p>two</p></li></ul>");
  });

  it("wraps legacy plain-newline text in paragraphs", () => {
    expect(toHtml("Line one\nline two\n\nSecond [b]bold[/b]\n[list]\n[*] a\n[/list]\n\nAfter")).toBe(
      "<p>Line one<br>line two</p><p>Second <strong>bold</strong></p><ul><li> a</li></ul><p>After</p>",
    );
  });

  it("drops empty spacer paragraphs and unknown tags, keeping their text", () => {
    expect(toHtml("[p][/p][p]x[/p][unknown]kept[/unknown]")).toBe("<p>x</p><p>kept</p>");
  });

  it("routes Steam images through the Next image optimizer and leaves others alone", () => {
    expect(toHtml(`[img src="{STEAM_CLAN_IMAGE}/45829248/abc.png"][/img]`)).toContain(
      `src="/_next/image?url=${encodeURIComponent(STEAM_IMAGE)}&amp;w=1920&amp;q=75"`,
    );
    expect(toHtml("[img]https://example.com/a.png[/img]")).toContain(`src="https://example.com/a.png"`);
  });
});

describe("toExcerpt", () => {
  it("strips tags and keeps paragraph breaks", () => {
    expect(toExcerpt("[h2]Head[/h2][p]Body [b]text[/b][/p][list][*]item[/list]")).toBe("Head\n\nBody text\n\nitem");
  });

  it("cuts long text at a word boundary", () => {
    const excerpt = toExcerpt(`[p]${"word ".repeat(100)}[/p]`, 50);
    expect(excerpt.length).toBeLessThanOrEqual(51);
    expect(excerpt).toMatch(/word…$/);
  });
});

describe("bodyImages", () => {
  it("finds both [img] forms and resolves the clan image placeholder", () => {
    expect(bodyImages(`[img src="{STEAM_CLAN_IMAGE}/45829248/abc.png"][/img] [img]https://example.com/b.png[/img]`)).toEqual([
      STEAM_IMAGE,
      "https://example.com/b.png",
    ]);
  });
});
