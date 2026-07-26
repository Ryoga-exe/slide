const slideIdPattern = /^(?<year>\d{4})\/(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)$/;

export type SlidePath = {
  year: string;
  slug: string;
};

export function parseSlideId(id: string): SlidePath {
  const match = id.match(slideIdPattern);
  if (!match?.groups) {
    throw new Error(
      `Invalid slide id "${id}". Expected a path like "2026/my-slide".`,
    );
  }

  return {
    year: match.groups.year,
    slug: match.groups.slug,
  };
}

export function slideUrl(id: string): string {
  const { year, slug } = parseSlideId(id);
  return `/${year}/${slug}/`;
}
