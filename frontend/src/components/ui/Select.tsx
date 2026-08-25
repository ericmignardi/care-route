import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { Field } from "./Field";
import { controlClasses } from "./controlClasses";
import { cn } from "../../lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id"> {
  label: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  className,
  required,
  disabled,
  ...rest
}: SelectProps) {
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
        <div className="relative">
          <select
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            required={required}
            disabled={disabled}
            className={cn(controlClasses(invalid), "appearance-none pr-8")}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1/2 right-[10px] size-3.5 -translate-y-1/2",
              disabled ? "text-ink-4" : "text-ink-3",
            )}
          />
        </div>
      )}
    </Field>
  );
}
