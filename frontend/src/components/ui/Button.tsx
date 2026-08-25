import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Replaces the label while `loading` — "Assigning…" rather than "Assign visit". */
  loadingLabel?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Four variants, five states, transcribed from the component sheet. Depth is hairline
 * borders and tonal shifts — there are no drop shadows anywhere in this design.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-pine border-pine text-pine-on",
    "hover:bg-pine-h hover:border-pine-h",
    "active:brightness-[.92] active:scale-[.98]",
    "disabled:bg-sunken disabled:border-line disabled:text-ink-4",
  ),
  secondary: cn(
    "bg-panel border-line-2 text-ink",
    "hover:bg-raise hover:border-line-3",
    "active:bg-sunken active:scale-[.98]",
    "disabled:bg-transparent disabled:border-dashed disabled:border-line disabled:text-ink-4",
  ),
  ghost: cn(
    "bg-transparent border-transparent text-pine-acc",
    "hover:bg-pine-tint",
    "active:bg-pine-tint active:border-pine-line active:scale-[.98]",
    "disabled:bg-transparent disabled:border-transparent disabled:text-ink-4",
  ),
  destructive: cn(
    "bg-transparent border-mis-bd text-mis-fg",
    "hover:bg-mis-bg hover:border-mis-fg",
    "active:bg-mis-fg active:text-mis-bg active:scale-[.98]",
    "disabled:bg-transparent disabled:border-dashed disabled:border-line disabled:text-ink-4",
  ),
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-[34px] px-[13px] text-[12.5px] rounded-[5px]",
  md: "h-[38px] px-[15px] text-[13px] rounded-[5px]",
  /** Sized for a gloved thumb on a client's porch in February. */
  lg: "h-[52px] px-5 text-[15px] rounded-[8px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  loadingLabel,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 border font-semibold whitespace-nowrap",
        "transition-colors duration-100 cursor-pointer",
        "disabled:cursor-not-allowed disabled:active:scale-100",
        "motion-reduce:transition-none motion-reduce:active:scale-100",
        SIZES[size],
        VARIANTS[variant],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
