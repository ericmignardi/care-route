import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div className="min-w-0">
        {eyebrow && <div className="label-caps text-[9.5px] text-ink-3">{eyebrow}</div>}
        <h1 className="mt-2 font-display text-[30px] leading-[1.05] tracking-[-.015em] text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[560px] text-[13px] leading-[1.6] text-ink-2">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
