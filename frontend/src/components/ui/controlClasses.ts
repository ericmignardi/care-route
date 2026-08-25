import { cn } from "../../lib/cn";

/**
 * The three control heights the design uses: 30px for toolbar chips, 34px for compact
 * inline fields, 38px for anything in a form. `auto` is for the textarea, which sizes to
 * its rows.
 */
export type ControlSize = "sm" | "md" | "lg" | "auto";

const SIZES: Record<ControlSize, string> = {
  sm: "h-[30px] text-[12px]",
  md: "h-[34px] text-[12.5px]",
  lg: "h-[38px] text-[13px]",
  auto: "h-auto py-2 text-[13px] leading-[1.5]",
};

/**
 * Shared chrome for anything that looks like a text box, so Input, Textarea and Select
 * cannot drift apart. Lives outside Field.tsx because that file exports a component and
 * fast refresh wants one or the other.
 *
 * Size is a parameter rather than something a caller tacks on afterwards. `cn` is a plain
 * join with no tailwind-merge, so passing `h-[30px]` alongside the `h-[38px]` this
 * function emits does not override it — it emits both and lets stylesheet order decide,
 * which silently rendered every compact control at the form height. Anything that varies
 * per call site and collides on a property has to be chosen here, not appended.
 */
export function controlClasses(invalid: boolean, size: ControlSize = "lg", extra?: string): string {
  return cn(
    "w-full rounded-[5px] px-[11px] text-ink",
    SIZES[size],
    "border transition-colors duration-100",
    "placeholder:text-ink-4",
    invalid
      ? "border-[1.5px] border-mis-fg bg-mis-bg"
      : "border-line-2 bg-panel focus:border-[1.5px] focus:border-pine",
    "disabled:border-dashed disabled:border-line disabled:bg-sunken disabled:text-ink-4",
    extra,
  );
}
