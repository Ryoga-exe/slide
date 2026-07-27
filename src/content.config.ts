import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const slideMetadata = {
  title: z.string(),
  description: z.string(),
  publishedAt: z.coerce.date(),
};

const slides = defineCollection({
  loader: glob({
    base: "./src/content/slides",
    pattern: "**/index.md",
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ""),
    retainBody: true,
    deferRender: true,
  }),
  schema: z.discriminatedUnion("engine", [
    z
      .object({
        ...slideMetadata,
        engine: z.literal("reveal"),
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
    z
      .object({
        ...slideMetadata,
        engine: z.literal("pdf"),
        file: z
          .string()
          .regex(
            /^\.\/[^/?#]+\.pdf$/,
            "PDF file must be a relative path such as ./slides.pdf",
          ),
      })
      .strict(),
  ]),
});

export const collections = { slides };
