import { cn } from "../../lib/cn";

/**
 * `lead` animates; everything else is a flat oatmeal bar. Fifteen shimmering rows at
 * once is a migraine, so only the first line of each group sweeps.
 */
export function Skeleton({
  className,
  lead = false,
}: {
  className?: string;
  lead?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("block rounded-[3px]", lead ? "shimmer" : "bg-sunken", className)}
    />
  );
}

/** A stand-in for a loading list: one sweeping lead line, then quiet rows. */
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
