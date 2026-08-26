/**
 * Joins class names, dropping falsy entries. Deliberately not tailwind-merge — see the
 * note in controlClasses.ts for what that means for callers.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
