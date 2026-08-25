import type { InputHTMLAttributes } from "react";
import { Field } from "./Field";
import { controlClasses } from "./controlClasses";
import { cn } from "../../lib/cn";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id"> {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
}

export function Input({ label, hint, error, className, required, disabled, ...rest }: InputProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      disabled={disabled}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          disabled={disabled}
          className={controlClasses(invalid)}
          {...rest}
        />
      )}
    </Field>
  );
}

interface TextareaProps
  extends Omit<InputHTMLAttributes<HTMLTextAreaElement>, "className" | "id"> {
  label: string;
  hint?: string;
  error?: string;
  rows?: number;
  className?: string;
}

export function Textarea({
  label,
  hint,
  error,
  rows = 4,
  className,
  required,
  disabled,
  ...rest
}: TextareaProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      disabled={disabled}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          disabled={disabled}
          className={cn(controlClasses(invalid), "h-auto py-2 leading-[1.5] resize-y")}
          {...rest}
        />
      )}
    </Field>
  );
}
