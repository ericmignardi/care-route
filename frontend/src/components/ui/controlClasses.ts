import { cn } from "../../lib/cn";

/**
 * Shared chrome for anything that looks like a text box, so Input, Textarea and Select
 * cannot drift apart. Lives outside Field.tsx because that file exports a component and
 * fast refresh wants one or the other.
 */
export function controlClasses(invalid: boolean, extra?: string): string {
  return cn(
    "h-[38px] w-full rounded-[5px] px-[11px] text-[13px] text-ink",
    "border transition-colors duration-100",
    "placeholder:text-ink-4",
    invalid
      ? "border-[1.5px] border-mis-fg bg-mis-bg"
      : "border-line-2 bg-panel focus:border-[1.5px] focus:border-pine",
    "disabled:border-dashed disabled:border-line disabled:bg-sunken disabled:text-ink-4",
    extra,
  );
}
