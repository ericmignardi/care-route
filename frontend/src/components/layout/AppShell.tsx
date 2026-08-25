import { useState } from "react";
import { RouteTransition } from "./RouteTransition";
import { MobileNav } from "./MobileNav";
import { TopBar } from "./TopBar";

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:rounded-[5px] focus:border focus:border-line-2 focus:bg-panel focus:px-3 focus:py-2 focus:text-[12.5px] focus:font-semibold focus:text-ink"
      >
        Skip to content
      </a>

      <TopBar onOpenNav={() => setNavOpen(true)} navOpen={navOpen} />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />

      <main id="main" className="flex-1">
        <RouteTransition />
      </main>
    </div>
  );
}
