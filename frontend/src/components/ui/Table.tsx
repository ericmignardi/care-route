import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/**
 * Coordinator tables are instruments: hairlines, tonal hover rather than a shadow, and
 * an inset focus ring so a focused row never changes height and shifts the rows below it.
 */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-[5px] border border-line-2 bg-panel", className)}>
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-sunken">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

type SortDirection = "asc" | "desc" | null;

interface ThProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "className"> {
  /** Pass `null` for a sortable column that is not the active sort. */
  sort?: SortDirection;
  onSort?: () => void;
  align?: "left" | "right";
  className?: string;
}

export function Th({ children, sort, onSort, align = "left", className, ...rest }: ThProps) {
  const sortable = Boolean(onSort);
  const active = sort === "asc" || sort === "desc";

  return (
    <th
      scope="col"
      aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined}
      className={cn(
        "border-b border-line px-3.5 py-[7px]",
        "font-mono text-[9.5px] leading-none font-semibold tracking-[.1em] uppercase",
        active ? "text-ink" : "text-ink-3",
        align === "right" && "text-right",
        className,
      )}
      {...rest}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex cursor-pointer items-center gap-1.5 uppercase hover:text-ink"
        >
          {children}
          <span aria-hidden="true" className={active ? "text-ink" : "text-ink-4"}>
            {sort === "asc" ? "\u2191" : sort === "desc" ? "\u2193" : "\u2195"}
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  );
}

interface TrProps {
  children: ReactNode;
  onSelect?: () => void;
  className?: string;
}

export function Tr({ children, onSelect, className }: TrProps) {
  return (
    <tr
      onClick={onSelect}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={cn(
        "border-b border-line last:border-b-0",
        onSelect && "cursor-pointer hover:bg-bg focus-visible:outline-offset-[-2px]",
        className,
      )}
    >
      {children}
    </tr>
  );
}

interface TdProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, "className"> {
  align?: "left" | "right";
  muted?: boolean;
  className?: string;
}

export function Td({ children, align = "left", muted, className, ...rest }: TdProps) {
  return (
    <td
      className={cn(
        "px-3.5 py-2.5 text-[12.5px] leading-[1.3] font-medium",
        muted ? "text-ink-2" : "text-ink",
        align === "right" && "text-right",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
