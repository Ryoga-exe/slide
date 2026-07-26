import { getCollection } from "astro:content";
import { siteConfig } from "src/config";
import { slideUrl } from "src/lib/slide-paths";

function url(pathname: string, lastModified?: Date): string {
  const location = new URL(pathname, siteConfig.url).href;
  const lastmod = lastModified
    ? `<lastmod>${lastModified.toISOString()}</lastmod>`
    : "";
  return `<url><loc>${location}</loc>${lastmod}</url>`;
}

export async function GET() {
  const slides = await getCollection("slides");
  const entries = [
    url("/"),
    url("/about/"),
    ...slides.map((slide) => url(slideUrl(slide.id), slide.data.publishedAt)),
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
