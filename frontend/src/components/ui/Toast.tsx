import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Info, TriangleAlert, X } from "lucide-react";
import { useToastStore, type Toast as ToastModel, type ToastTone } from "../../stores/toastStore";
import { cn } from "../../lib/cn";

const TONES: Record<ToastTone, { frame: string; chip: string; title: string; Icon: typeof Check }> =
  {
    success: {
      frame: "border-don-bd border-l-4 border-l-don-fg",
      chip: "bg-don-fg text-panel",
      title: "text-don-fg",
      Icon: Check,
    },
    error: {
      frame: "border-mis-bd border-l-4 border-l-mis-fg",
      chip: "bg-mis-fg text-panel",
      title: "text-mis-fg",
      Icon: TriangleAlert,
    },
    info: {
      frame: "border-line-2 border-l-4 border-l-pine-acc",
      chip: "bg-pine-acc text-panel",
      title: "text-pine-acc",
      Icon: Info,
    },
  };

function ToastCard({ toast }: { toast: ToastModel }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const tone = TONES[toast.tone];

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      role={toast.tone === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex gap-[11px] rounded-[6px] border bg-panel px-3.5 py-[13px]",
        tone.frame,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", tone.chip)}
      >
        <tone.Icon className="size-3" strokeWidth={3} />
      </span>

      <div className="flex-1">
        <div className={cn("text-[12.5px] leading-[1.3] font-bold", tone.title)}>{toast.title}</div>
        {toast.body && (
          <div className="mt-[3px] text-[12.5px] leading-[1.55] text-ink">{toast.body}</div>
        )}
        {toast.actions && toast.actions.length > 0 && (
          <div className="mt-2 flex gap-3.5">
            {toast.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  action.onSelect();
                  dismiss(toast.id);
                }}
                className="cursor-pointer text-[11.5px] leading-none font-semibold text-pine-acc hover:underline"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="h-fit shrink-0 cursor-pointer text-ink-3 hover:text-ink"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </motion.div>
  );
}

/**
 * Rejections keep the same shape as successes so the eye lands in the same place. Mounted
 * once at the app root; anything can raise one through `toast` in stores/toastStore.
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-3"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
