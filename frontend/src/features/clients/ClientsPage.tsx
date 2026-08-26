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
import { PageHeader } from "../../components/layout/PageHeader";
import { PageShell } from "../../components/layout/PageShell";
import { clientsApi } from "../../api/clients";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { controlClasses } from "../../components/ui/controlClasses";
import { cn } from "../../lib/cn";
import type { Client, ClientStatus } from "../../types/domain";
import { ClientFormModal } from "./ClientFormModal";

const STATUS_FILTERS: Array<{ value: ClientStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export function ClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatus | "">("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);

  const debouncedSearch = useDebounce(search);

  const clients = useAsync(
    () => clientsApi.list({ search: debouncedSearch, status, page, size: 20 }),
    `clients ${debouncedSearch} ${status} ${page}`,
  );

  // Any filter change invalidates the page cursor: page 3 of a filtered set is not page 3
  // of everything, and keeping the cursor shows an empty table that looks like a bug.
  const onFilterChange = useCallback((apply: () => void) => {
    apply();
    setPage(0);
  }, []);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Directory"
        title="Clients"
        description="Everyone currently in care with the Hamilton West team, and the care plan each visit is performed against."
        actions={
          <Button
            variant="primary"
            onClick={() => setCreating(true)}
            icon={<Plus aria-hidden="true" className="size-3.5" />}
          >
            New client
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
            placeholder="Search by name, city or postal code"
            aria-label="Search clients"
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
                "h-[32px] cursor-pointer px-3 text-[12px] leading-none font-semibold",
                "border-l border-line-2 first:border-l-0",
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

      {clients.loading && !clients.data && <ClientsSkeleton />}

      {clients.failed && (
        <ErrorState
          title="The client list did not load"
          message={errorMessage(clients.error)}
          onRetry={clients.reload}
        />
      )}

      {clients.data && clients.data.content.length === 0 && (
        <EmptyState
          glyph="0"
          title={debouncedSearch || status ? "Nothing matches those filters" : "No clients yet"}
          description={
            debouncedSearch || status
              ? "Try a shorter search, or clear the status filter to see everyone."
              : "Add the first client and their care plan; visits are scheduled against it."
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
                New client
              </Button>
            )
          }
        />
      )}

      {clients.data && clients.data.content.length > 0 && (
        <>
          <Table className={cn(clients.loading && "opacity-60 transition-opacity")}>
            <THead>
              <Tr>
                <Th>Client</Th>
                <Th>Address</Th>
                <Th>City</Th>
                <Th>Phone</Th>
                <Th>Status</Th>
              </Tr>
            </THead>
            <TBody>
              {clients.data.content.map((client) => (
                <Tr key={client.id} onSelect={() => navigate(`/clients/${client.id}`)}>
                  <Td>
                    {client.lastName}, {client.firstName}
                  </Td>
                  <Td muted>{client.addressLine}</Td>
                  <Td muted>{client.city}</Td>
                  <Td muted>{client.phone ?? "—"}</Td>
                  <Td>
                    <StatusChip status={client.status} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>

          <Pagination page={clients.data} onPageChange={setPage} label="clients" />
        </>
      )}

      <ClientFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(client: Client) => navigate(`/clients/${client.id}`)}
      />
    </PageShell>
  );
}

export function StatusChip({ status }: { status: ClientStatus }) {
  return status === "ACTIVE" ? (
    <Badge tone="don" glyph="&#x2713;">
      Active
    </Badge>
  ) : (
    <Badge tone="can" glyph="&#x2014;">
      Inactive
    </Badge>
  );
}

function ClientsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading clients"
      className="overflow-hidden rounded-[5px] border border-line-2 bg-panel"
    >
      <div className="border-b border-line bg-sunken px-3.5 py-[9px]">
        <Skeleton lead className="h-[9px] w-[180px]" />
      </div>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex items-center gap-6 border-b border-line px-3.5 py-3 last:border-b-0">
          <Skeleton className="h-[11px] w-[170px]" />
          <Skeleton className="h-[11px] flex-1" />
          <Skeleton className="h-[11px] w-[90px]" />
          <Skeleton className="h-[11px] w-[110px]" />
          <Skeleton className="h-[17px] w-[74px] rounded-[4px]" />
        </div>
      ))}
    </div>
  );
}
