import { useRef } from "react";
import { NavLink } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { navFor } from "../../lib/navigation";
import { cn } from "../../lib/cn";

/**
 * The `lg:hidden` half of the navigation. Same links, same role gating, drawer chrome.
 *
 * It is a modal layer, so it owes a keyboard what the dialog owes one — the same
 * `useFocusTrap` the modal uses, rather than the lone Esc handler it had before. Without
 * the trap, tabbing out of the drawer walks into a page the drawer is covering.
 */
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuthStore((state) => state.user);
  const items = navFor(user);
  const drawerRef = useRef<HTMLElement>(null);

  useFocusTrap(open, drawerRef, onClose);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 bg-ink/26"
          />
          <motion.nav
            ref={drawerRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-line-2 bg-panel"
          >
            <div className="flex h-[46px] items-center justify-between border-b border-line-2 px-4">
              <span className="font-display text-[15px] leading-none text-ink">CareRoute</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation"
                className="flex size-7 cursor-pointer items-center justify-center rounded-[5px] border border-line-2 text-ink-2 hover:bg-sunken hover:text-ink"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-1 p-3">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-[5px] px-3 py-2.5 text-[13.5px]",
                      isActive
                        ? "bg-sunken font-semibold text-ink"
                        : "font-medium text-ink-2 hover:bg-sunken hover:text-ink",
                    )
                  }
                >
                  <item.icon aria-hidden="true" className="size-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  );
}
