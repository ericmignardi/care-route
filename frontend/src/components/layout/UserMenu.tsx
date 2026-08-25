import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { fullName, initials, useAuthStore } from "../../stores/authStore";
import { ROLE_LABELS, type Role } from "../../lib/constants";
import { toast } from "../../stores/toastStore";
import { cn } from "../../lib/cn";

function roleLabel(roles: string[]): string {
  const known = roles.find((role): role is Role => role in ROLE_LABELS);
  return known ? ROLE_LABELS[known] : "Team member";
}

export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  async function onSignOut() {
    await logout();
    // `replace` so the protected page the user was on never re-enters the history stack.
    navigate("/login", { replace: true });
    toast.info("Signed out", "Your session has ended on this device.");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-[7px] rounded-[5px] px-1.5 py-1 text-[12px] leading-none font-semibold text-ink hover:bg-sunken"
      >
        <span
          aria-hidden="true"
          className="flex size-[22px] items-center justify-center rounded-full border border-pine-line bg-pine-tint text-[9.5px] font-semibold text-pine-acc"
        >
          {initials(user)}
        </span>
        <span className="hidden sm:inline">{fullName(user)}</span>
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-40 mt-2 w-[224px] overflow-hidden",
            "rounded-[6px] border border-line-2 bg-panel",
          )}
        >
          <div className="border-b border-line px-3.5 py-3">
            <div className="text-[13px] leading-[1.3] font-semibold text-ink">{fullName(user)}</div>
            <div className="mt-0.5 text-[11.5px] leading-[1.4] text-ink-3">
              {user.username} · {roleLabel(user.roles)}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink hover:bg-sunken"
          >
            <LogOut aria-hidden="true" className="size-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
