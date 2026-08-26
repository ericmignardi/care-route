import { cn } from "../../lib/cn";

export type ControlSize = "sm" | "md" | "lg" | "auto";

const SIZES: Record<ControlSize, string> = {
  sm: "h-[30px] text-[12px]",
  md: "h-[34px] text-[12.5px]",
  lg: "h-[38px] text-[13px]",
  auto: "h-auto py-2 text-[13px] leading-[1.5]",
};

/**
 * Size is a parameter, not something a caller appends: `cn` is a plain join with no
 * tailwind-merge, so an `h-[30px]` passed alongside the `h-[38px]` emitted here does not
 * override it — both are emitted and stylesheet order decides. Anything that varies per
 * call site and collides on a property has to be chosen here.
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
