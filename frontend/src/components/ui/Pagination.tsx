import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import type { PageResponse } from "../../types/api";

export function Pagination<T>({
  page,
  onPageChange,
  label = "results",
}: {
  page: PageResponse<T>;
  onPageChange: (next: number) => void;
  label?: string;
}) {
  if (page.totalElements === 0) return null;

  const firstIndex = page.page * page.size + 1;
  const lastIndex = page.page * page.size + page.content.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-[11.5px] leading-none text-ink-3">
        Showing {firstIndex}&ndash;{lastIndex} of {page.totalElements} {label}
      </span>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onPageChange(page.page - 1)}
          disabled={page.first}
          icon={<ChevronLeft aria-hidden="true" className="size-3.5" />}
        >
          Previous
        </Button>
        <span className="px-1 text-[11.5px] leading-none text-ink-3">
          Page {page.page + 1} of {Math.max(page.totalPages, 1)}
        </span>
        <Button size="sm" onClick={() => onPageChange(page.page + 1)} disabled={page.last}>
          Next
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
