import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { slideEngineNames } from "./lib/slide-engines";
import { slidesLoader } from "./loaders/slides";

const slides = defineCollection({
  loader: slidesLoader(),
  schema: z.object({
    slug: z.string(),
    engine: z.enum(slideEngineNames),
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
