import { Button } from "./Button";
import { cn } from "../../lib/cn";

/** NFR-11. The message is the server's sentence where there is one. */
export function ErrorState({
  title = "That did not load",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[6px] border border-mis-bd bg-panel px-6 py-[26px] border-l-4 border-l-mis-fg",
        className,
      )}
    >
      <h3 className="font-display text-[23px] leading-[1.2] text-ink">{title}</h3>
      <p className="mt-[7px] max-w-[460px] text-[13.5px] leading-[1.6] text-ink-2">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
