import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { slideEngineNames } from "./lib/slide-engines";

const slides = defineCollection({
  loader: glob({
    base: "./src/content/slides",
    pattern: "**/*.md",
    retainBody: true,
    deferRender: true,
  }),
  schema: z
    .object({
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
        .strict()
        .default({}),
    })
    .strict(),
});

export const collections = { slides };
