import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PdfAction = "fullscreen" | "next" | "previous";

const editableElementSelector = "input, textarea, select, [contenteditable]";
const pageHashPattern = /^#\/(\d+)$/;

function requiredElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing PDF viewer element: ${selector}`);
  return element;
}

class PdfSlideViewer {
  readonly #root: HTMLElement;
  readonly #stage: HTMLElement;
  readonly #canvases: [HTMLCanvasElement, HTMLCanvasElement];
  readonly #status: HTMLElement;
  readonly #statusMessage: HTMLElement;
  readonly #pageNumber: HTMLOutputElement;
  readonly #progress: HTMLElement;
  readonly #controls: HTMLElement;
  readonly #source: string;
  readonly #title: string;

  #document?: PDFDocumentProxy;
  #page = 1;
  #activeCanvas = 0;
  #renderRevision = 0;
  #renderQueue = Promise.resolve();
  #renderTask?: RenderTask;
  #controlsTimer?: number;
  #resizeFrame?: number;
  #swipeStart?: { x: number; y: number };
  #suppressClick = false;

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#stage = requiredElement(root, "[data-pdf-stage]");
    const canvases = root.querySelectorAll<HTMLCanvasElement>(".pdf-page");
    if (canvases.length !== 2) {
      throw new Error("PDF viewer requires two canvas elements.");
    }
    this.#canvases = [canvases[0], canvases[1]];
    this.#status = requiredElement(root, "[data-pdf-status]");
    this.#statusMessage = requiredElement(root, "[data-pdf-status-message]");
    this.#pageNumber = requiredElement(root, "[data-pdf-page-number]");
    this.#progress = requiredElement(root, "[data-pdf-progress]");
    this.#controls = requiredElement(root, "[data-pdf-controls]");
    this.#source = root.dataset.pdfUrl ?? "";
    this.#title = root.dataset.pdfTitle ?? "PDF";
  }

  async initialize(): Promise<void> {
    if (!this.#source) throw new Error("PDF viewer has no source URL.");

    this.#bindEvents();

    try {
      this.#document = await getDocument({ url: this.#source }).promise;
      this.#page = this.#pageFromHash();
      this.#updateUi();
      this.#requestRender();
    } catch (error) {
      this.#showError(error);
    }
  }

  #bindEvents(): void {
    this.#root.addEventListener("click", (event) => {
      if (this.#suppressClick) {
        this.#suppressClick = false;
        event.preventDefault();
        return;
      }

      const trigger =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-pdf-action]")
          : null;
      if (!trigger) return;
      this.#performAction(trigger.dataset.pdfAction as PdfAction);
    });

    window.addEventListener("keydown", (event) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (event.target instanceof Element &&
          event.target.closest(editableElementSelector))
      ) {
        return;
      }

      const action = this.#keyboardAction(event);
      if (!action) return;
      event.preventDefault();
      this.#showControls();
      this.#performAction(action);
    });

    window.addEventListener("hashchange", () => {
      if (!this.#document) return;
      const page = this.#pageFromHash();
      if (page !== this.#page) this.#goTo(page, false);
    });

    document.addEventListener("fullscreenchange", () => {
      const button = this.#root.querySelector<HTMLElement>(
        '[data-pdf-action="fullscreen"]',
      );
      if (!button) return;
      const isFullscreen = document.fullscreenElement === this.#root;
      const label = isFullscreen ? "全画面表示を終了" : "全画面表示";
      button.title = label;
      button.setAttribute("aria-label", label);
    });

    this.#root.addEventListener("pointermove", () => this.#showControls());
    this.#root.addEventListener("pointerdown", (event) => {
      this.#showControls();
      this.#swipeStart = { x: event.clientX, y: event.clientY };
    });
    this.#root.addEventListener("pointerup", (event) => {
      if (!this.#swipeStart) return;
      const deltaX = event.clientX - this.#swipeStart.x;
      const deltaY = event.clientY - this.#swipeStart.y;
      this.#swipeStart = undefined;

      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      this.#suppressClick = true;
      this.#performAction(deltaX < 0 ? "next" : "previous");
    });
    this.#root.addEventListener("pointercancel", () => {
      this.#swipeStart = undefined;
    });

    this.#controls.addEventListener("focusin", () => {
      if (this.#controlsTimer) window.clearTimeout(this.#controlsTimer);
      this.#root.classList.add("is-controls-visible");
    });
    this.#controls.addEventListener("focusout", () => this.#showControls());

    new ResizeObserver(() => {
      if (this.#resizeFrame) window.cancelAnimationFrame(this.#resizeFrame);
      this.#resizeFrame = window.requestAnimationFrame(() => {
        if (this.#document) this.#requestRender();
      });
    }).observe(this.#stage);

    this.#showControls();
  }

  #keyboardAction(event: KeyboardEvent): PdfAction | undefined {
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        return "previous";
      case " ":
      case "Enter":
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
        return event.shiftKey ? "previous" : "next";
      case "f":
      case "F":
        return "fullscreen";
      case "Home":
        this.#goTo(1);
        return;
      case "End":
        if (this.#document) this.#goTo(this.#document.numPages);
        return;
    }
  }

  #performAction(action: PdfAction): void {
    switch (action) {
      case "previous":
        this.#goTo(this.#page - 1);
        break;
      case "next":
        this.#goTo(this.#page + 1);
        break;
      case "fullscreen":
        void this.#toggleFullscreen().catch((error: unknown) => {
          console.error("Failed to toggle fullscreen mode.", error);
        });
        break;
    }
  }

  #goTo(page: number, updateHash = true): void {
    if (!this.#document) return;
    const nextPage = Math.min(Math.max(page, 1), this.#document.numPages);
    if (nextPage === this.#page) return;

    this.#page = nextPage;
    this.#updateUi();
    this.#requestRender();

    if (updateHash) {
      const url = new URL(window.location.href);
      url.hash = `/${nextPage}`;
      window.history.replaceState(null, "", url);
    }
  }

  #pageFromHash(): number {
    const requestedPage = Number.parseInt(
      window.location.hash.match(pageHashPattern)?.[1] ?? "1",
      10,
    );
    const totalPages = this.#document?.numPages ?? 1;
    return Math.min(Math.max(requestedPage, 1), totalPages);
  }

  #updateUi(): void {
    if (!this.#document) return;
    const totalPages = this.#document.numPages;
    this.#pageNumber.value = `${this.#page} / ${totalPages}`;
    this.#progress.style.transform = `scaleX(${
      totalPages === 1 ? 1 : (this.#page - 1) / (totalPages - 1)
    })`;

    for (const button of this.#root.querySelectorAll<HTMLButtonElement>(
      '[data-pdf-action="previous"]',
    )) {
      button.disabled = this.#page === 1;
    }
    for (const button of this.#root.querySelectorAll<HTMLButtonElement>(
      '[data-pdf-action="next"]',
    )) {
      button.disabled = this.#page === totalPages;
    }
  }

  #requestRender(): void {
    const revision = ++this.#renderRevision;
    this.#renderTask?.cancel();
    this.#renderQueue = this.#renderQueue
      .catch(() => undefined)
      .then(async () => {
        if (!this.#document || revision !== this.#renderRevision) return;

        const page = await this.#document.getPage(this.#page);
        if (revision !== this.#renderRevision) return;

        const bounds = this.#stage.getBoundingClientRect();
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = Math.min(
          bounds.width / baseViewport.width,
          bounds.height / baseViewport.height,
        );
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: fitScale * outputScale });
        const canvasIndex = this.#activeCanvas === 0 ? 1 : 0;
        const canvas = this.#canvases[canvasIndex];

        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        canvas.style.width = `${Math.floor(viewport.width / outputScale)}px`;
        canvas.style.height = `${Math.floor(viewport.height / outputScale)}px`;

        this.#renderTask = page.render({ canvas, viewport });
        await this.#renderTask.promise;
        if (revision !== this.#renderRevision) return;

        const previousCanvas = this.#canvases[this.#activeCanvas];
        previousCanvas.classList.remove("is-active");
        previousCanvas.setAttribute("aria-hidden", "true");
        canvas.classList.add("is-active");
        canvas.removeAttribute("aria-hidden");
        canvas.setAttribute(
          "aria-label",
          `${this.#title}、${this.#page}ページ目`,
        );
        this.#activeCanvas = canvasIndex;
        this.#status.hidden = true;

        for (const adjacentPage of [this.#page - 1, this.#page + 1]) {
          if (adjacentPage >= 1 && adjacentPage <= this.#document.numPages) {
            void this.#document.getPage(adjacentPage);
          }
        }
      })
      .catch((error: unknown) => {
        if (
          error instanceof Error &&
          error.name === "RenderingCancelledException"
        ) {
          return;
        }
        this.#showError(error);
      });
  }

  async #toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement === this.#root) {
      await document.exitFullscreen();
    } else {
      await this.#root.requestFullscreen();
    }
  }

  #showControls(): void {
    this.#root.classList.add("is-controls-visible");
    if (this.#controlsTimer) window.clearTimeout(this.#controlsTimer);
    if (window.matchMedia("(hover: none)").matches) return;

    this.#controlsTimer = window.setTimeout(() => {
      if (!this.#controls.contains(document.activeElement)) {
        this.#root.classList.remove("is-controls-visible");
      }
    }, 1800);
  }

  #showError(error: unknown): void {
    console.error("Failed to initialize PDF slide viewer.", error);
    this.#root.classList.add("has-error");
    this.#status.hidden = false;
    this.#statusMessage.textContent =
      "PDFを表示できませんでした。元のPDFを開いてください。";
  }
}

export async function initializePdfSlideViewer(
  root: HTMLElement,
): Promise<void> {
  await new PdfSlideViewer(root).initialize();
}
