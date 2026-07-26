import { compileRevealSlides } from "./reveal.ts";

export const slideEngineNames = ["reveal"] as const;

export type SlideEngine = (typeof slideEngineNames)[number];

export type SlideCompileOptions = {
  resolveAssetUrl?: (url: string) => string;
};

type SlideCompiler = (
  source: string,
  options: SlideCompileOptions,
) => Promise<string>;

const compilers: Record<SlideEngine, SlideCompiler> = {
  reveal: compileRevealSlides,
};

export function isSlideEngine(value: unknown): value is SlideEngine {
  return (
    typeof value === "string" && slideEngineNames.includes(value as SlideEngine)
  );
}

export async function compileSlide(
  engine: unknown,
  source: string,
  options: SlideCompileOptions = {},
): Promise<string> {
  if (!isSlideEngine(engine)) {
    throw new Error(`Unsupported slide engine: ${String(engine)}`);
  }

  return compilers[engine](source, options);
}
