/**
 * Extract all unique #tags and #parent/child tags from text content.
 * Removes trailing punctuation marks like '.', ',', '!', '?', etc.
 */
export function extractTags(content: string): string[] {
  if (!content) return [];

  // Match #tag or #parent/subtag
  const matches = content.match(/#[\p{L}\p{N}_/-]+/gu);
  if (!matches) return [];

  const cleanTags = matches.map((rawTag) => {
    // Strip trailing punctuation if accidentally captured
    return rawTag.replace(/[.,!?;:)]+$/, "");
  });

  // Return unique tags maintaining order
  return Array.from(new Set(cleanTags));
}

/**
 * Format tag name to ensure leading '#' is present
 */
export function formatTag(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}
