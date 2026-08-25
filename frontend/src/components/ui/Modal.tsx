import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { cn } from "../../lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The line under the title — a client name and a time window, not a restatement. */
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Opts out of the default body padding, for panels whose rows run edge to edge. */
  bodyClassName?: string;
}

const SIZES = {
  sm: "max-w-[420px]",
  md: "max-w-[560px]",
  lg: "max-w-[760px]",
  xl: "max-w-[820px]",
} as const;

/**
 * Esc dismisses, Tab cycles inside, and focus returns to whatever opened it — all of it
 * from `useFocusTrap`, which the navigation drawer shares. Trapping focus is the part
 * that is genuinely hard to add later, so it was here from the start rather than waiting
 * for the accessibility sweep.
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
  bodyClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, panelRef, onClose);

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

        <div
          className={cn(
            "max-h-[70vh] overflow-y-auto text-[13px] leading-[1.6] text-ink-2",
            bodyClassName ?? "px-[18px] py-[15px]",
          )}
        >
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
