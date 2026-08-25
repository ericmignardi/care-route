import { Spinner } from "../ui/Spinner";

/** Held only while GET /auth/me is in flight — a fraction of a second, not a splash screen. */
export function FullPageLoader({ label = "Loading CareRoute" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg"
    >
      <Spinner className="size-5 text-ink-3" />
      <span className="text-[12.5px] text-ink-3">{label}</span>
    </div>
  );
}
