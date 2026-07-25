import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteConfig } from "../config";

export async function GET(context: { site?: URL }) {
  const slides = (await getCollection("slides")).sort(
    (left, right) =>
      right.data.publishedAt.getTime() - left.data.publishedAt.getTime(),
  );

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site ?? new URL(siteConfig.url),
    items: slides.map((slide) => ({
      title: slide.data.title,
      description: slide.data.description,
      pubDate: slide.data.publishedAt,
      link: `/posts/${slide.id}.html`,
    })),
    customData: "<language>ja</language>",
  });
}
