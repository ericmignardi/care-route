import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The line under the title — a client name and a time window, not a restatement. */
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "max-w-[420px]", md: "max-w-[560px]", lg: "max-w-[760px]" } as const;

/**
 * Esc dismisses, Tab cycles inside, and focus returns to whatever opened it. Trapping
 * focus is the part that is genuinely hard to add later, so it is here from the start
 * rather than waiting for the Phase 6 accessibility sweep.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      restoreTo.current?.focus();
    };
  }, [open, onKeyDown]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/26"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full overflow-hidden rounded-[8px] border border-line-3 bg-panel",
          SIZES[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3.5 border-b border-line px-[18px] pt-4 pb-3.5">
          <div className="min-w-0">
            <h2 className="font-display text-[20px] leading-[1.2] text-ink">{title}</h2>
            {subtitle && (
              <p className="mt-[5px] text-[12.5px] leading-[1.5] text-ink-2">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-line-2 bg-bg text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-[18px] py-[15px] text-[13px] leading-[1.6] text-ink-2">
          {children}
        </div>

        {footer && (
          <div className="flex items-center gap-[9px] border-t border-line bg-bg px-[18px] py-[13px]">
            <div className="flex-1 text-[11.5px] leading-[1.4] text-ink-3">Esc to dismiss</div>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
