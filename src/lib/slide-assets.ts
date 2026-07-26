import { posix } from "node:path";

const slideAssets = import.meta.glob<string>(
  "/src/content/slides/**/*.{avif,gif,jpeg,jpg,png,svg,webp}",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

const absoluteUrlPattern = /^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i;

export function createSlideAssetUrlResolver(
  slideId: string,
  filePath: string | undefined,
): (url: string) => string {
  if (!filePath) {
    throw new Error(`Slide "${slideId}" has no source file path.`);
  }

  const normalizedFilePath = filePath.replaceAll("\\", "/");
  const slideDirectory = `/${posix.dirname(normalizedFilePath)}`;

  return (url) => {
    if (url === "" || absoluteUrlPattern.test(url)) return url;

    const suffixIndex = url.search(/[?#]/);
    const pathname = suffixIndex === -1 ? url : url.slice(0, suffixIndex);
    const suffix = suffixIndex === -1 ? "" : url.slice(suffixIndex);
    const assetPath = posix.normalize(posix.join(slideDirectory, pathname));
    const assetUrl = slideAssets[assetPath];

    if (!assetUrl) {
      throw new Error(
        `Slide "${slideId}" references missing local asset "${url}" (${assetPath}).`,
      );
    }

    return `${assetUrl}${suffix}`;
  };
}
