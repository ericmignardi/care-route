import type { CSSProperties } from "react";
import { cn } from "../../lib/cn";

export function Skeleton({
  className,
  lead = false,
  style,
}: {
  className?: string;
  lead?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("block rounded-[3px]", lead ? "shimmer" : "bg-sunken", className)}
      style={style}
    />
  );
}

export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)} role="status" aria-label="Loading">
      <Skeleton lead className="h-[15px] w-[62%]" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={cn("h-[11px]", index % 2 === 0 ? "w-[88%]" : "w-[74%]")} />
      ))}
    </div>
  );
}
