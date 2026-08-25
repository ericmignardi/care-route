/**
 * Joins class names, dropping falsy entries. Deliberately not clsx + tailwind-merge:
 * the components below never pass conflicting utilities for the same property, so the
 * merge step would be two dependencies buying nothing.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
