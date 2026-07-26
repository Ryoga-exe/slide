import { glob, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Loader } from "astro/loaders";
import { parseFrontmatter } from "astro/markdown";
import { compileSlide } from "../lib/slide-engines";
import { parseSlideId } from "../lib/slide-paths";

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

export function slidesLoader(): Loader {
  return {
    name: "slides-loader",
    async load({ config, generateDigest, logger, parseData, store, watcher }) {
      const rootPath = fileURLToPath(config.root);
      const slidesPath = fileURLToPath(
        new URL("src/content/slides/", config.root),
      );
      const fileToId = new Map<string, string>();

      async function loadFile(filePath: string, oldId?: string) {
        const source = await readFile(filePath, "utf8");
        const { content, frontmatter } = parseFrontmatter(source);
        const id = normalizePath(relative(slidesPath, filePath)).replace(
          /\.md$/i,
          "",
        );
        const { year } = parseSlideId(id);
        const data = await parseData({ id, data: frontmatter, filePath });
        if (
          !(data.publishedAt instanceof Date) ||
          String(data.publishedAt.getUTCFullYear()) !== year
        ) {
          throw new Error(
            `Slide "${id}" must have a publishedAt date in ${year}.`,
          );
        }
        const html = await compileSlide(data.engine, content);

        if (oldId && oldId !== id) {
          store.delete(oldId);
        }

        store.set({
          id,
          data,
          digest: generateDigest(source),
          filePath: normalizePath(relative(rootPath, filePath)),
          rendered: {
            html,
            metadata: { frontmatter: data },
          },
        });
        fileToId.set(filePath, id);
        return id;
      }

      const loadedIds = new Set<string>();
      const files: string[] = [];
      for await (const path of glob("**/*.md", { cwd: slidesPath })) {
        files.push(resolve(slidesPath, path));
      }

      for (const filePath of files.sort()) {
        const id = await loadFile(filePath);
        if (loadedIds.has(id)) {
          throw new Error(`Duplicate slide id: ${id}`);
        }
        loadedIds.add(id);
      }

      for (const id of store.keys()) {
        if (!loadedIds.has(id)) store.delete(id);
      }

      if (!watcher) return;

      watcher.add(slidesPath);

      const reload = async (filePath: string) => {
        if (!filePath.endsWith(".md")) return;
        try {
          await loadFile(filePath, fileToId.get(filePath));
          logger.info(
            `Reloaded ${normalizePath(relative(rootPath, filePath))}`,
          );
        } catch (error) {
          logger.error(error instanceof Error ? error.message : String(error));
        }
      };

      watcher.on("add", reload);
      watcher.on("change", reload);
      watcher.on("unlink", (filePath) => {
        const id = fileToId.get(filePath);
        if (id) store.delete(id);
        fileToId.delete(filePath);
      });
    },
  };
}
