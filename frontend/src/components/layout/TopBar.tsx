import { NavLink } from "react-router";
import { Menu } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { navFor } from "../../lib/navigation";
import { cn } from "../../lib/cn";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

/**
 * The design puts navigation in a 46px top rail rather than a sidebar: a coordinator
 * working a 2160px-wide schedule grid should not surrender 240px of it to chrome.
 * Below `lg` the same links move into the drawer.
 */
export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const user = useAuthStore((state) => state.user);
  const items = navFor(user);

  return (
    <header className="flex h-[46px] shrink-0 items-center gap-4 border-b border-line-2 bg-panel px-3 sm:gap-[26px] sm:px-[18px]">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="flex size-8 cursor-pointer items-center justify-center rounded-[5px] border border-line-2 text-ink-2 hover:bg-sunken hover:text-ink lg:hidden"
      >
        <Menu aria-hidden="true" className="size-4" />
      </button>

      <span className="font-display text-[15px] leading-none tracking-[.01em] text-ink">
        CareRoute
      </span>

      <nav aria-label="Main" className="hidden gap-0.5 lg:flex">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "rounded-[4px] px-2.5 py-1.5 text-[12.5px] leading-none",
                isActive
                  ? "bg-sunken font-semibold text-ink"
                  : "font-medium text-ink-2 hover:text-ink",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      <span className="hidden text-[11.5px] leading-none text-ink-3 xl:inline">
        Hamilton West team
      </span>
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
