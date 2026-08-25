import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "../../components/ui";
import { controlClasses } from "../../components/ui/controlClasses";
import { PageHeader } from "../../components/layout/PageHeader";
import { PageShell } from "../../components/layout/PageShell";
import { caregiversApi } from "../../api/caregivers";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { SKILL_LABELS } from "../../lib/constants";
import { cn } from "../../lib/cn";
import type { CaregiverStatus } from "../../types/domain";
import { CaregiverFormModal } from "./CaregiverFormModal";

const STATUS_FILTERS: Array<{ value: CaregiverStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export function CaregiversPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CaregiverStatus | "">("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);

  const debouncedSearch = useDebounce(search);

  const caregivers = useAsync(
    () => caregiversApi.list({ search: debouncedSearch, status, page, size: 20 }),
    `caregivers ${debouncedSearch} ${status} ${page}`,
  );

  const onFilterChange = useCallback((apply: () => void) => {
    apply();
    setPage(0);
  }, []);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Team"
        title="Caregivers"
        description="Who works for the Hamilton West team, what each of them is qualified for, and the hours they are available."
        actions={
          <Button
            variant="primary"
            onClick={() => setCreating(true)}
            icon={<Plus aria-hidden="true" className="size-3.5" />}
          >
            New caregiver
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1 sm:max-w-[360px]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-[11px] size-3.5 -translate-y-1/2 text-ink-3"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onFilterChange(() => setSearch(event.target.value))}
            placeholder="Search by name or username"
            aria-label="Search caregivers"
            className={controlClasses(false, "md", "pl-[32px]")}
          />
        </div>

        <div
          role="group"
          aria-label="Filter by status"
          className="flex overflow-hidden rounded-[5px] border border-line-2"
        >
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => onFilterChange(() => setStatus(filter.value))}
              className={cn(
                "h-[32px] cursor-pointer border-l border-line-2 px-3 text-[12px] leading-none font-semibold first:border-l-0",
                status === filter.value
                  ? "bg-ink text-bg"
                  : "bg-panel text-ink-2 hover:bg-sunken hover:text-ink",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {caregivers.loading && !caregivers.data && <CaregiversSkeleton />}

      {caregivers.failed && (
        <ErrorState
          title="The team list did not load"
          message={errorMessage(caregivers.error)}
          onRetry={caregivers.reload}
        />
      )}

      {caregivers.data && caregivers.data.content.length === 0 && (
        <EmptyState
          glyph="0"
          title={debouncedSearch || status ? "Nothing matches those filters" : "No caregivers yet"}
          description={
            debouncedSearch || status
              ? "Try a shorter search, or clear the status filter to see the whole team."
              : "Adding a caregiver creates their login and their profile together — neither is useful alone."
          }
          action={
            debouncedSearch || status ? (
              <Button
                onClick={() =>
                  onFilterChange(() => {
                    setSearch("");
                    setStatus("");
                  })
                }
              >
                Clear filters
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setCreating(true)}>
                New caregiver
              </Button>
            )
          }
        />
      )}

      {caregivers.data && caregivers.data.content.length > 0 && (
        <>
          <Table className={cn(caregivers.loading && "opacity-60 transition-opacity")}>
            <THead>
              <Tr>
                <Th>Caregiver</Th>
                <Th>Username</Th>
                <Th>Phone</Th>
                <Th>Qualified for</Th>
                <Th>Status</Th>
              </Tr>
            </THead>
            <TBody>
              {caregivers.data.content.map((caregiver) => (
                <Tr key={caregiver.id} onSelect={() => navigate(`/caregivers/${caregiver.id}`)}>
                  <Td>
                    {caregiver.lastName}, {caregiver.firstName}
                  </Td>
                  <Td muted>{caregiver.username}</Td>
                  <Td muted>{caregiver.phone ?? "—"}</Td>
                  <Td>
                    <span className="flex flex-wrap gap-1.5">
                      {caregiver.skills.length === 0 ? (
                        <span className="text-[12px] text-ink-3">No skills recorded</span>
                      ) : (
                        caregiver.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-[3px] border border-line-2 bg-bg px-[5px] py-[3px] font-mono text-[9.5px] leading-none font-bold text-ink-2"
                          >
                            {SKILL_LABELS[skill].toUpperCase()}
                          </span>
                        ))
                      )}
                    </span>
                  </Td>
                  <Td>
                    {caregiver.status === "ACTIVE" ? (
                      <Badge tone="don" glyph="&#x2713;">
                        Active
                      </Badge>
                    ) : (
                      <Badge tone="can" glyph="&#x2014;">
                        Inactive
                      </Badge>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>

          <Pagination page={caregivers.data} onPageChange={setPage} label="caregivers" />
        </>
      )}

      <CaregiverFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(caregiver) => navigate(`/caregivers/${caregiver.id}`)}
      />
    </PageShell>
  );
}

function CaregiversSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading caregivers"
      className="overflow-hidden rounded-[5px] border border-line-2 bg-panel"
    >
      <div className="border-b border-line bg-sunken px-3.5 py-[9px]">
        <Skeleton lead className="h-[9px] w-[180px]" />
      </div>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-6 border-b border-line px-3.5 py-3 last:border-b-0"
        >
          <Skeleton className="h-[11px] w-[170px]" />
          <Skeleton className="h-[11px] w-[110px]" />
          <Skeleton className="h-[11px] w-[110px]" />
          <Skeleton className="h-[11px] flex-1" />
          <Skeleton className="h-[17px] w-[74px] rounded-[4px]" />
        </div>
      ))}
    </div>
  );
}
