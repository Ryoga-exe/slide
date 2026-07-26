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

Place slides at `src/content/slides/YYYY/slug.md`. The content path becomes
the public URL `/YYYY/slug/`.

## Deployment

The site is deployed as a static site on Cloudflare Pages.

- Build command: `npm run build`
- Build output directory: `dist`

Redirects for slide URLs from the previous site are defined in
`public/_redirects`.
