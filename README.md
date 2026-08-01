# Slide

https://slide.ryoga.dev

## Local development

```sh
npm install
npm run dev
```

## Stack

- [Astro](https://astro.build/)
- [reveal.js](https://revealjs.com/)

## Slides

Place each slide in `src/content/slides/YYYY/slug/`. The content path becomes
the public URL `/YYYY/slug/`.

Reveal slides use `index.md`:

```yaml
---
engine: reveal
title: Example
description: Example slide
publishedAt: 2026-07-27
---
```

PDF slides use an `index.md` metadata file and a colocated PDF:

```text
src/content/slides/2026/example/
├── index.md
└── slides.pdf
```

```yaml
---
engine: pdf
title: Example
description: Example PDF slide
publishedAt: 2026-07-27
file: ./slides.pdf
---
```

## Deployment

The site is deployed as a static site on Cloudflare Pages.

- Build command: `npm run build`
- Build output directory: `dist`

Redirects for slide URLs from the previous site are defined in
`public/_redirects`.
