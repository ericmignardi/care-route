import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-[22px]", className)}>
      {children}
    </div>
  );
}
