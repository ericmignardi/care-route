import { useId, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  children: (props: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
  className?: string;
}

/** NFR-9. Owns the label / hint / error wiring so every control is labelled and announced. */
export function Field({
  label,
  hint,
  error,
  required,
  disabled,
  children,
  className,
}: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={id}
        className={cn(
          "block text-[11.5px] leading-none font-semibold",
          disabled ? "text-ink-4" : "text-ink",
        )}
      >
        {label}
        {required && (
          <span className="text-mis-fg" aria-hidden="true">
            {" *"}
          </span>
        )}
      </label>

      <div className="mt-1.5">
        {children({ id, describedBy: message ? messageId : undefined, invalid: Boolean(error) })}
      </div>

      {message && (
        <p
          id={messageId}
          className={cn(
            "mt-1.5 text-[11.5px] leading-[1.5]",
            error ? "font-semibold text-mis-fg" : disabled ? "text-ink-4" : "text-ink-3",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
