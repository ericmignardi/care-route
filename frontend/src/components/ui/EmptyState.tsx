import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function EmptyState({
  glyph,
  title,
  description,
  action,
  className,
}: {
  glyph?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[6px] border border-line-2 bg-panel px-6 py-[26px]",
        className,
      )}
    >
      {glyph && (
        <span className="flex size-[38px] items-center justify-center rounded-[9px] border border-line-2 bg-sunken font-display text-[17px] text-ink-3">
          {glyph}
        </span>
      )}
      <h3 className={cn("font-display text-[21px] leading-[1.2] text-ink", Boolean(glyph) && "mt-[15px]")}>
        {title}
      </h3>
      {description && (
        <p className="mt-[7px] max-w-[430px] text-[13px] leading-[1.6] text-ink-2">{description}</p>
      )}
      {action && <div className="mt-4 flex flex-wrap gap-[9px]">{action}</div>}
    </div>
  );
}
