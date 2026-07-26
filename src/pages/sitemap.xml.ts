import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

function url(site: URL, pathname: string, lastModified?: Date): string {
  const location = new URL(pathname, site).href;
  const lastmod = lastModified
    ? `<lastmod>${lastModified.toISOString()}</lastmod>`
    : "";
  return `<url><loc>${location}</loc>${lastmod}</url>`;
}

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error("Astro site config is required to generate the sitemap.");
  }

  const slides = await getCollection("slides");
  const entries = [
    url(site, "/"),
    url(site, "/about/"),
    ...slides.map((slide) =>
      url(site, `/${slide.id}/`, slide.data.publishedAt),
    ),
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
