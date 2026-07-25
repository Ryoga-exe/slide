import { compileRevealSlides } from "./reveal.ts";

export const slideEngineNames = ["reveal"] as const;

export type SlideEngine = (typeof slideEngineNames)[number];

const compilers: Record<SlideEngine, (source: string) => Promise<string>> = {
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
): Promise<string> {
  if (!isSlideEngine(engine)) {
    throw new Error(`Unsupported slide engine: ${String(engine)}`);
  }

  return compilers[engine](source);
}
