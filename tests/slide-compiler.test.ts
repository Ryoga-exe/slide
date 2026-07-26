import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML } from "linkedom";
import { compileSlide } from "../src/lib/slide-engines/index.ts";

test("RevealMarkdown compiles horizontal and vertical sections", async () => {
  const html = await compileSlide(
    "reveal",
    `
## One

---

## Two

--

## Two point one
`,
  );
  const { document } = parseHTML(`<div class="slides">${html}</div>`);
  const slides = document.querySelector(".slides")!;
  const sections = [...slides.querySelectorAll("section")];
  const slideCount = sections.filter(
    (section) => !section.querySelector(":scope > section"),
  ).length;

  assert.equal(slideCount, 3);
  assert.equal(slides.children.length, 2);
  assert.equal(slides.children[1].children.length, 2);
  assert.equal(slides.querySelectorAll("[data-markdown]").length, 0);
});

test("RevealMarkdown compiles attributes, fragments, notes, and code highlights", async () => {
  const html = await compileSlide(
    "reveal",
    `
<!-- .slide: data-auto-animate style="text-align: left;" -->

- First <!-- .element: class="fragment" -->

\`\`\`js [10: 1|2]
const one = 1;
const two = 2;
\`\`\`

Note: Remember this.
`,
  );
  const { document } = parseHTML(html);
  const section = document.querySelector("section")!;

  assert.equal(section.getAttribute("data-auto-animate"), "");
  assert.equal(section.getAttribute("style"), "text-align: left;");
  assert.equal(section.querySelector("li")!.getAttribute("class"), "fragment");
  assert.equal(
    section.querySelector("code")!.getAttribute("data-line-numbers"),
    "1",
  );
  assert.equal(
    section.querySelector("code")!.getAttribute("data-ln-start-from"),
    "10",
  );
  const codeBlocks = section.querySelectorAll("pre > code");
  assert.equal(codeBlocks.length, 2);
  assert.equal(codeBlocks[0].classList.contains("hljs"), true);
  assert.equal(codeBlocks[1].classList.contains("fragment"), true);
  assert.equal(codeBlocks[1].getAttribute("data-line-numbers"), "2");
  assert.equal(codeBlocks[0].querySelectorAll("tr").length, 2);
  assert.equal(
    codeBlocks[0].querySelector("tr")!.classList.contains("highlight-line"),
    true,
  );
  assert.equal(
    codeBlocks[1]
      .querySelectorAll("tr")[1]
      .classList.contains("highlight-line"),
    true,
  );
  assert.equal(
    codeBlocks[0]
      .querySelector("td.hljs-ln-numbers")!
      .getAttribute("data-line-number"),
    "10",
  );
  assert.equal(
    section.querySelector("aside.notes")!.textContent.trim(),
    "Remember this.",
  );
  assert.equal(html.includes(".slide:"), false);
  assert.equal(html.includes(".element:"), false);
});

test("Unknown slide engines are rejected", async () => {
  await assert.rejects(
    compileSlide("unknown", "# Slide"),
    /Unsupported slide engine: unknown/,
  );
});

test("RevealMarkdown compilation restores the global DOM state", async () => {
  const globalNames = ["Node", "window", "document"] as const;
  const previousGlobals = globalNames.map((name) => ({
    name,
    hadOwnProperty: Object.hasOwn(globalThis, name),
    value: Reflect.get(globalThis, name),
  }));

  await Promise.all([
    compileSlide("reveal", "# One"),
    compileSlide("reveal", "# Two"),
  ]);

  for (const previous of previousGlobals) {
    assert.equal(
      Object.hasOwn(globalThis, previous.name),
      previous.hadOwnProperty,
    );
    assert.equal(Reflect.get(globalThis, previous.name), previous.value);
  }
});
