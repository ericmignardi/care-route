import { Spinner } from "../ui/Spinner";

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
