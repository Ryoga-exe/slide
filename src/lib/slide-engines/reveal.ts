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

let compilationQueue: Promise<void> = Promise.resolve();

export function compileRevealSlides(source: string): Promise<string> {
  const compilation = compilationQueue.then(() => compile(source));
  compilationQueue = compilation.then(
    () => undefined,
    () => undefined,
  );
  return compilation;
}

async function compile(source: string): Promise<string> {
  const { document, Node } = parseHTML(`
    <div class="reveal">
      <div class="slides">
        <section data-markdown></section>
      </div>
    </div>
  `);

  // RevealMarkdown reads this browser global while applying .element and
  // .slide directives. Compilations are serialized so it can be restored
  // safely after each run.
  const hadNode = "Node" in globalThis;
  const previousNode = globalThis.Node;
  globalThis.Node = Node;

  try {
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
  } finally {
    if (hadNode) {
      globalThis.Node = previousNode;
    } else {
      Reflect.deleteProperty(globalThis, "Node");
    }
  }
}
