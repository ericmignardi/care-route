import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "./PageHeader";

/**
 * Scaffolding for the routes Phase 5 fills in. Deliberately says so rather than
 * rendering a convincing-looking screen with no data behind it.
 */
export function PagePlaceholder({
  eyebrow,
  title,
  description,
  next,
}: {
  eyebrow: string;
  title: string;
  description: string;
  next: string;
}) {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-[18px]">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <EmptyState glyph="0" title="Not built yet" description={next} />
    </div>
  );
}
