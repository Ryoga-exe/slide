import assert from "node:assert/strict";
import test from "node:test";
import { load } from "cheerio";
import { compileSlides } from "../src/lib/slide-compiler.ts";

test("Markdown is compiled into horizontal and vertical sections", () => {
  const result = compileSlides(`
## One

---

## Two

--

## Two point one
`);
  const $ = load(`<div class="slides">${result.html}</div>`, {}, false);

  assert.equal(result.slideCount, 3);
  assert.equal($(".slides > section").length, 2);
  assert.equal($(".slides > section").eq(1).children("section").length, 2);
  assert.equal($("[data-markdown]").length, 0);
});

test("Reveal attributes, fragments, notes, and code highlights are compiled", () => {
  const result = compileSlides(`
<auto-animate/>
<!-- .slide: style="text-align: left;" -->

+ First

\`\`\`js [10: 1|2]
const one = 1;
const two = 2;
\`\`\`

Note: Remember this.
`);
  const $ = load(result.html, {}, false);
  const section = $("section").first();

  assert.equal(section.attr("data-auto-animate"), "");
  assert.equal(section.attr("style"), "text-align: left;");
  assert.equal(section.find("li").attr("class"), "fragment");
  assert.equal(section.find("code").attr("data-line-numbers"), "1|2");
  assert.equal(section.find("code").attr("data-ln-start-from"), "10");
  assert.equal(section.find("aside.notes").text().trim(), "Remember this.");
  assert.equal(result.html.includes(".slide:"), false);
  assert.equal(result.html.includes(".element:"), false);
});

test("Slide separators inside fenced code are not split", () => {
  const result = compileSlides(`
\`\`\`text
---
--
\`\`\`
`);

  assert.equal(result.slideCount, 1);
  assert.match(result.html, /---\n--/);
});
