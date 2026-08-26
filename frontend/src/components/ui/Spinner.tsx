import { cn } from "../../lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block shrink-0 rounded-full border-2 border-current/30 border-t-current",
        "size-[13px] animate-spin motion-reduce:animate-none",
        className,
      )}
    />
  );
}
