// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://slide.ryoga.dev",
  markdown: {
    // Slide Markdown is compiled by RevealMarkdown during static page generation.
    syntaxHighlight: false,
  },
});
