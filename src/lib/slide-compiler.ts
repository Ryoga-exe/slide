import { load } from "cheerio";
import { Marked } from "marked";

const codeLineNumberPattern = /\[\s*((\d*):)?\s*([\s\d,|-]*)\]/;
const githubMarkPath =
  "M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z";

type CompiledSlides = {
  html: string;
  slideCount: number;
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

const marked = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      let language = lang ?? "";
      let lineNumbers = "";
      let lineNumberStart = "";
      const match = language.match(codeLineNumberPattern);

      if (match) {
        if (match[2]) {
          lineNumberStart = ` data-ln-start-from="${escapeHtml(match[2].trim())}"`;
        }
        lineNumbers = ` data-line-numbers="${escapeHtml(match[3].trim())}"`;
        language = language.replace(codeLineNumberPattern, "").trim();
      }

      return `<pre><code${lineNumbers}${lineNumberStart} class="${escapeHtml(language)}">${escapeHtml(text)}</code></pre>`;
    },
  },
});

function replaceLegacySyntax(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let fence: { marker: string; length: number } | undefined;

  return lines
    .map((line) => {
      const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
      if (fenceMatch) {
        const marker = fenceMatch[1][0];
        const length = fenceMatch[1].length;
        if (!fence) {
          fence = { marker, length };
        } else if (fence.marker === marker && length >= fence.length) {
          fence = undefined;
        }
        return line;
      }

      if (fence) return line;

      let result = line
        .replaceAll("<fragment/>", '<!-- .element: class="fragment" -->')
        .replace(
          /<background>(.*?)<\/background>/g,
          '<!-- .slide: data-background="$1" -->',
        )
        .replace(
          /<background-image>(.*?)<\/background-image>/g,
          '<!-- .slide: data-background-image="$1" -->',
        )
        .replace(
          /<background-image-opacity>(.*?)<\/background-image-opacity>/g,
          '<!-- .slide: data-background-opacity="$1" -->',
        )
        .replaceAll("<auto-animate/>", "<!-- .slide: data-auto-animate -->")
        .replace(
          /<transition>(.*?)<\/transition>/g,
          '<!-- .slide: data-transition="$1" -->',
        )
        .replaceAll("</br>", "<br>");

      if (/^\s*\+\s+/.test(result)) {
        result += ' <!-- .element: class="fragment" -->';
      }

      result = result.replace(
        /\{%\s*octicon\s+mark-github\s+height:(\d+)[^%]*fill:\{\{\s*(black|white)\s*\}\}[^%]*%\}/g,
        (_, height: string, fill: string) =>
          `<svg class="octicon octicon-mark-github" height="${height}" width="${height}" viewBox="0 0 16 16" role="img" aria-label="GitHub" fill="${fill}"><path d="${githubMarkPath}"></path></svg>`,
      );

      return result;
    })
    .join("\n");
}

function splitOutsideFences(
  markdown: string,
  separator: "---" | "--",
): string[] {
  const blocks: string[][] = [[]];
  let fence: { marker: string; length: number } | undefined;

  for (const line of markdown.split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      const length = fenceMatch[1].length;
      if (!fence) {
        fence = { marker, length };
      } else if (fence.marker === marker && length >= fence.length) {
        fence = undefined;
      }
    }

    if (!fence && line.trim() === separator) {
      blocks.push([]);
    } else {
      blocks.at(-1)!.push(line);
    }
  }

  return blocks.map((block) => block.join("\n").trim());
}

function splitNotes(markdown: string): [string, string | undefined] {
  const lines = markdown.split(/\r?\n/);
  let fence: { marker: string; length: number } | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      const length = fenceMatch[1].length;
      if (!fence) {
        fence = { marker, length };
      } else if (fence.marker === marker && length >= fence.length) {
        fence = undefined;
      }
    }

    if (!fence && /^notes?:/i.test(line)) {
      return [
        lines.slice(0, index).join("\n").trim(),
        [line.replace(/^notes?:\s*/i, ""), ...lines.slice(index + 1)]
          .join("\n")
          .trim(),
      ];
    }
  }

  return [markdown, undefined];
}

function parseAttributes(value: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern =
    /([A-Za-z_:][A-Za-z0-9:._-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attributes;
}

function compileLeaf(markdown: string): string {
  const [body, notes] = splitNotes(markdown);
  const bodyHtml = marked.parse(body) as string;
  const notesHtml = notes ? (marked.parse(notes) as string) : undefined;
  const $ = load(`<section data-slide-root>${bodyHtml}</section>`, {}, false);
  const section = $("section[data-slide-root]")[0] as any;

  const applyAttributes = (target: any, value: string) => {
    if (!target) return;
    target.attribs ??= {};
    Object.assign(target.attribs, parseAttributes(value));
  };

  const walk = (element: any, slide: any) => {
    if (!element?.children) return;
    let previousElement = element;

    for (const child of [...element.children]) {
      if (child.type === "tag") {
        walk(child, slide);
        if (child.name !== "br") previousElement = child;
        continue;
      }

      if (child.type !== "comment") continue;
      const directive = child.data.trim();
      const elementMatch = directive.match(/^\.element\s*:?\s*(.+)$/s);
      const slideMatch = directive.match(/^\.slide:\s*(.+)$/s);

      if (elementMatch) {
        let target = previousElement;
        if (target?.name === "ul" || target?.name === "ol") {
          target =
            [...(target.children ?? [])]
              .reverse()
              .find((candidate: any) => candidate.type === "tag") ?? target;
        }
        applyAttributes(target, elementMatch[1]);
        $(child).remove();
      } else if (slideMatch) {
        applyAttributes(slide, slideMatch[1]);
        $(child).remove();
      }
    }
  };

  walk(section, section);
  delete section.attribs["data-slide-root"];

  if (notesHtml) {
    $(section).append(`<aside class="notes">${notesHtml}</aside>`);
  }

  return $.html(section);
}

export function compileSlides(source: string): CompiledSlides {
  const normalized = replaceLegacySyntax(source);
  const horizontalSlides = splitOutsideFences(normalized, "---");
  let slideCount = 0;

  const html = horizontalSlides
    .map((horizontalSlide) => {
      const verticalSlides = splitOutsideFences(horizontalSlide, "--");
      slideCount += verticalSlides.length;

      if (verticalSlides.length === 1) {
        return compileLeaf(verticalSlides[0]);
      }

      return `<section>${verticalSlides.map(compileLeaf).join("\n")}</section>`;
    })
    .join("\n");

  return { html, slideCount };
}
