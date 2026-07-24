# Slide

Presentation slides powered by Astro and reveal.js.

公開ページ: [slide.ryoga.dev](https://slide.ryoga.dev)

## Local development

```sh
mise install
npm install
npm run dev
```

本番用の静的ファイルは次のコマンドで`dist/`へ生成されます。

```sh
npm run build
```

## スライドを追加する

`src/content/slides/`へMarkdownファイルを追加します。

```yaml
---
slug: example
title: Example slide
description: スライドの説明
publishedAt: 2026-07-24
theme: black
---
```

- `---`: 横スライド
- `--`: 縦スライド
- `Note:`: スピーカーノート
- `<!-- .slide: ... -->`: スライド属性
- `<!-- .element: ... -->`: 要素属性

Markdownはビルド時にHTMLへ変換されます。ブラウザではreveal.jsが表示と操作だけを担当します。

## 使用技術

- [Astro](https://astro.build/)
- [reveal.js](https://revealjs.com/)
- Markdown
- GitHub Pages
- GitHub Actions
