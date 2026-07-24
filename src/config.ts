import type { RevealConfig } from "reveal.js";

export const siteConfig = {
  title: "slide",
  author: "Ryoga.exe",
  description: "Presentation slides powered by reveal.js",
  url: "https://slide.ryoga.dev",
  lang: "ja",
  locale: "ja_JP",
  github: "https://github.com/Ryoga-exe/slide",
  twitter: "@Ryoga_exe",
} as const;

export const defaultRevealConfig = {
  controls: true,
  controlsTutorial: true,
  controlsLayout: "bottom-right",
  controlsBackArrows: "faded",
  progress: true,
  slideNumber: false,
  hash: true,
  history: false,
  keyboard: true,
  overview: true,
  center: true,
  touch: true,
  fragments: true,
  fragmentInURL: true,
  help: true,
  pause: true,
  autoAnimate: true,
  transition: "slide",
  transitionSpeed: "default",
  backgroundTransition: "fade",
  pdfSeparateFragments: false,
  hideInactiveCursor: true,
  hideCursorTime: 5000,
} satisfies RevealConfig;
