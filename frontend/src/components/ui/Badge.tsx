import { cn } from "../../lib/cn";
import { VISIT_STATUS_META, type VisitStatus } from "../../lib/constants";

export type BadgeTone = "neutral" | "accent" | "sch" | "prg" | "don" | "can" | "mis";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-sunken border-line text-ink-2",
  accent: "bg-pine-tint border-pine-line text-pine-acc",
  sch: "bg-sch-bg border-sch-bd text-sch-fg",
  prg: "bg-prg-bg border-prg-bd text-prg-fg",
  don: "bg-don-bg border-don-bd text-don-fg",
  can: "bg-can-bg border-can-bd text-can-fg border-dashed",
  mis: "bg-mis-bg border-mis-bd text-mis-fg",
};

interface BadgeProps {
  tone?: BadgeTone;
  glyph?: string;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", glyph, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border py-[5px] pr-2.5 pl-2",
        "text-[11.5px] leading-none font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {glyph && (
        <span aria-hidden="true" className="text-[10px]">
          {glyph}
        </span>
      )}
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: VisitStatus;
  className?: string;
}) {
  const meta = VISIT_STATUS_META[status];
  return (
    <Badge tone={meta.tone} glyph={meta.glyph} className={className}>
      {meta.label}
    </Badge>
  );
}
