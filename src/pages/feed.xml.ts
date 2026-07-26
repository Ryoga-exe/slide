import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { siteConfig } from "src/config";

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error("Astro site config is required to generate the feed.");
  }

  const slides = (await getCollection("slides")).sort(
    (left, right) =>
      right.data.publishedAt.getTime() - left.data.publishedAt.getTime(),
  );

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site,
    items: slides.map((slide) => ({
      title: slide.data.title,
      description: slide.data.description,
      pubDate: slide.data.publishedAt,
      link: `/${slide.id}/`,
    })),
    customData: "<language>ja</language>",
  });
};
