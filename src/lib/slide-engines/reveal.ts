import { parseHTML } from "linkedom";
import type { RevealApi, RevealConfig } from "reveal.js";
import RevealMarkdown from "reveal.js/plugin/markdown";

const markdownConfig: RevealConfig = {
  markdown: {
    separator: "\\r?\\n---\\r?\\n",
    verticalSeparator: "\\r?\\n--\\r?\\n",
    notesSeparator: "^Note:",
  },
};

export async function compileRevealSlides(source: string): Promise<string> {
  const { document, Node } = parseHTML(`
    <div class="reveal">
      <div class="slides">
        <section data-markdown></section>
      </div>
    </div>
  `);

  // RevealMarkdown runs in a browser normally and reads this global while
  // applying .element and .slide directives.
  globalThis.Node ??= Node;

  const revealElement = document.querySelector<HTMLElement>(".reveal")!;
  const slidesElement = document.querySelector<HTMLElement>(".slides")!;
  const markdownSection =
    slidesElement.querySelector<HTMLElement>("[data-markdown]")!;
  const template = document.createElement("textarea");

  template.setAttribute("data-template", "");
  template.textContent = source;
  markdownSection.append(template);

  const plugin = RevealMarkdown();
  const buildDeck = {
    getRevealElement: () => revealElement,
    getConfig: () => markdownConfig,
  } as RevealApi;

  await plugin.init!(buildDeck);

  for (const section of slidesElement.querySelectorAll("section")) {
    section.removeAttribute("data-markdown");
    section.removeAttribute("data-markdown-parsed");
  }

  return slidesElement.innerHTML;
}
