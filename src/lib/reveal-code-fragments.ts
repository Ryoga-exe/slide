import type { RevealPlugin } from "reveal.js";

type ScrollState = {
  animationFrame?: number;
  currentBlock?: HTMLElement;
};

export const revealCodeFragments: RevealPlugin = {
  id: "build-highlight",
  init(deck) {
    const reveal = deck.getRevealElement();
    if (!reveal) return;

    const states = new WeakMap<HTMLElement, ScrollState>();
    for (const pre of reveal.querySelectorAll<HTMLElement>(
      "pre.code-wrapper",
    )) {
      const blocks = Array.from(
        pre.querySelectorAll<HTMLElement>(":scope > code[data-line-numbers]"),
      );
      if (blocks.length === 0) continue;

      const state: ScrollState = { currentBlock: blocks[0] };
      states.set(pre, state);
      blocks.slice(1).forEach((block, index) => {
        block.addEventListener("visible", () => {
          scrollHighlightedLineIntoView(block, state);
        });
        block.addEventListener("hidden", () => {
          scrollHighlightedLineIntoView(blocks[index], state);
        });
      });

      const section = blocks[0].closest("section:not(.stack)");
      section?.addEventListener(
        "visible",
        () => scrollHighlightedLineIntoView(blocks[0], state, true),
        { once: true },
      );
    }

    deck.on("pdf-ready", () => {
      for (const block of reveal.querySelectorAll<HTMLElement>(
        "pre code[data-line-numbers].current-fragment",
      )) {
        const pre = block.closest<HTMLElement>("pre");
        const state = pre ? states.get(pre) : undefined;
        scrollHighlightedLineIntoView(
          block,
          state ?? { currentBlock: block },
          true,
        );
      }
    });
  },
};

function scrollHighlightedLineIntoView(
  block: HTMLElement,
  state: ScrollState,
  immediately = false,
): void {
  if (state.animationFrame !== undefined) {
    cancelAnimationFrame(state.animationFrame);
  }
  if (state.currentBlock) {
    block.scrollTop = state.currentBlock.scrollTop;
  }
  state.currentBlock = block;

  const highlighted = block.querySelectorAll<HTMLElement>(".highlight-line");
  if (highlighted.length === 0) return;

  const style = getComputedStyle(block);
  const contentHeight =
    block.offsetHeight -
    (Number.parseInt(style.paddingTop, 10) || 0) -
    (Number.parseInt(style.paddingBottom, 10) || 0);
  const first = highlighted[0];
  const last = highlighted[highlighted.length - 1];
  const table = block.querySelector<HTMLElement>(".hljs-ln");
  const boundsTop = first.offsetTop;
  const boundsBottom = last.offsetTop + last.offsetHeight;
  const centered =
    boundsTop +
    (Math.min(boundsBottom - boundsTop, contentHeight) - contentHeight) / 2 +
    (table?.offsetTop ?? 0) -
    (Number.parseInt(style.paddingTop, 10) || 0);
  const target = Math.max(
    Math.min(centered, block.scrollHeight - contentHeight),
    0,
  );
  const initial = block.scrollTop;

  if (
    immediately ||
    initial === target ||
    block.scrollHeight <= contentHeight
  ) {
    block.scrollTop = target;
    return;
  }

  let progress = 0;
  const animate = () => {
    progress = Math.min(progress + 0.02, 1);
    block.scrollTop = initial + (target - initial) * easeInOutQuart(progress);
    if (progress < 1) {
      state.animationFrame = requestAnimationFrame(animate);
    }
  };
  animate();
}

function easeInOutQuart(progress: number): number {
  if (progress < 0.5) return 8 * progress ** 4;
  return 1 - 8 * (--progress) ** 4;
}
