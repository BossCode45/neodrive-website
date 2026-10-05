import { describe, expect, it } from "vitest";
import { xmlBlocks, xmlHas, xmlText } from "./xml";

describe("xml", () => {
  const xml = `<response><entries>
    <entry><name><![CDATA[A & <B>]]></name><rank>1</rank></entry>
    <entry><name>Tom &amp; Jerry &#9733; &#x2606;</name><rank>2</rank></entry>
  </entries><nextRequestURL><![CDATA[https://example.com]]></nextRequestURL></response>`;

  it("finds every block in order", () => {
    const entries = xmlBlocks(xml, "entry");
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => xmlText(e, "rank"))).toEqual(["1", "2"]);
  });

  it("unwraps CDATA as-is and decodes entities in plain text", () => {
    const [a, b] = xmlBlocks(xml, "entry");
    expect(xmlText(a, "name")).toBe("A & <B>");
    expect(xmlText(b, "name")).toBe("Tom & Jerry ★ ☆");
  });

  it("returns null for a missing tag and tells similar tags apart", () => {
    expect(xmlText(xml, "missing")).toBeNull();
    expect(xmlHas(xml, "nextRequestURL")).toBe(true);
    expect(xmlHas(xml, "next")).toBe(false);
  });
});
