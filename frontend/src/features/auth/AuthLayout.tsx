import type { ReactNode } from "react";
import { ThemeToggle } from "../../components/layout/ThemeToggle";

export function AuthLayout({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-[46px] shrink-0 items-center gap-4 border-b border-line-2 bg-panel px-[18px]">
        <span className="font-display text-[15px] leading-none tracking-[.01em] text-ink">
          CareRoute
        </span>
        <span className="hidden text-[11.5px] leading-none text-ink-3 sm:inline">
          Home &amp; community care · Hamilton, Ontario
        </span>
        <div className="flex-1" />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px]">
          <h1 className="font-display text-[34px] leading-[1.05] tracking-[-.015em] text-ink">
            {title}
          </h1>
          <p className="mt-2.5 text-[13.5px] leading-[1.6] text-ink-2">{intro}</p>

          <div className="mt-6 rounded-[6px] border border-line-2 bg-panel p-5">{children}</div>

          <div className="mt-4 text-[12.5px] leading-[1.5] text-ink-2">{footer}</div>
        </div>
      </main>
    </div>
  );
}
