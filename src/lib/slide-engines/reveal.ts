import { parseHTML } from "linkedom";
import type { RevealApi, RevealConfig } from "reveal.js";
import RevealMarkdown from "reveal.js/plugin/markdown";
import type { SlideCompileOptions } from "./index.ts";

const markdownConfig: RevealConfig = {
  markdown: {
    separator: "\\r?\\n---\\r?\\n",
    verticalSeparator: "\\r?\\n--\\r?\\n",
    notesSeparator: "^Note:",
  },
};

let compilationQueue: Promise<void> = Promise.resolve();

export function compileRevealSlides(
  source: string,
  options: SlideCompileOptions,
): Promise<string> {
  const compilation = compilationQueue.then(() => compile(source, options));
  compilationQueue = compilation.then(
    () => undefined,
    () => undefined,
  );
  return compilation;
}

async function compile(
  source: string,
  options: SlideCompileOptions,
): Promise<string> {
  const { document, window, Node } = parseHTML(`
    <!doctype html>
    <html>
      <head></head>
      <body>
        <div class="reveal">
          <div class="slides">
            <section data-markdown></section>
          </div>
        </div>
      </body>
    </html>
  `);

  // Reveal plugins read these browser globals. Compilations are serialized so
  // they can be restored safely after each run.
  const restoreBrowserGlobals = installBrowserGlobals({
    Node,
    window,
    document,
  });

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
      on: () => undefined,
    } as unknown as RevealApi;

    await plugin.init!(buildDeck);

    for (const section of slidesElement.querySelectorAll("section")) {
      section.removeAttribute("data-markdown");
      section.removeAttribute("data-markdown-parsed");
    }

    const { default: RevealHighlight } =
      await import("reveal.js/plugin/highlight");
    await RevealHighlight().init!(buildDeck);

    rewriteAssetUrls(slidesElement, options.resolveAssetUrl);

    return slidesElement.innerHTML;
  } finally {
    restoreBrowserGlobals();
  }
}

const assetUrlAttributes = [
  "src",
  "poster",
  "data-src",
  "data-background-image",
  "data-background-video",
  "data-background-iframe",
] as const;

function rewriteAssetUrls(
  root: HTMLElement,
  resolveAssetUrl: SlideCompileOptions["resolveAssetUrl"],
): void {
  if (!resolveAssetUrl) return;

  for (const attribute of assetUrlAttributes) {
    for (const element of root.querySelectorAll<HTMLElement>(
      `[${attribute}]`,
    )) {
      if (element.closest("pre code")) continue;

      const url = element.getAttribute(attribute);
      if (url !== null) {
        element.setAttribute(attribute, resolveAssetUrl(url));
      }
    }
  }
}

function installBrowserGlobals(globals: Record<string, unknown>): () => void {
  const previous = Object.entries(globals).map(([name, value]) => {
    const state = {
      name,
      hadOwnProperty: Object.hasOwn(globalThis, name),
      value: Reflect.get(globalThis, name),
    };
    Reflect.set(globalThis, name, value);
    return state;
  });

  return () => {
    for (const state of previous) {
      if (state.hadOwnProperty) {
        Reflect.set(globalThis, state.name, state.value);
      } else {
        Reflect.deleteProperty(globalThis, state.name);
      }
    }
  };
}
