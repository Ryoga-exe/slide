import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const slides = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/slides" }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    theme: z.enum(["black", "white"]).default("black"),
    embedTwitter: z.boolean().default(false),
    reveal: z
      .object({
        transition: z
          .enum(["none", "fade", "slide", "convex", "concave", "zoom"])
          .optional(),
      })
      .default({}),
  }),
});

export const collections = { slides };
