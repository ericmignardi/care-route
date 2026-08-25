import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  SkeletonRows,
  StatusBadge,
} from "../../components/ui";
import { controlClasses } from "../../components/ui/controlClasses";
import { PageShell } from "../../components/layout/PageShell";
import { clientsApi } from "../../api/clients";
import { visitsApi } from "../../api/visits";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { toast } from "../../stores/toastStore";
import { SKILL_LABELS } from "../../lib/constants";
import { formatDay, formatDuration, formatTime } from "../../lib/dates";
import { cn } from "../../lib/cn";
import type { Visit, VisitDetail } from "../../types/domain";
import { ClientFormModal } from "./ClientFormModal";
import { StatusChip } from "./ClientsPage";
import { ScheduleVisitModal } from "../visits/ScheduleVisitModal";
import { AssignCaregiverModal } from "../visits/AssignCaregiverModal";

export function ClientDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [assigning, setAssigning] = useState<VisitDetail | null>(null);
  const [historyPage, setHistoryPage] = useState(0);

  const client = useAsync(() => clientsApi.get(id), `client ${id}`);
  const history = useAsync(
    () => visitsApi.list({ clientId: id, page: historyPage, size: 10 }),
    `client-visits ${id} ${historyPage}`,
  );

  if (client.loading && !client.data) {
    return (
      <PageShell>
        <SkeletonRows rows={8} />
      </PageShell>
    );
  }

  if (client.error || !client.data) {
    return (
      <PageShell>
        <ErrorState
          title="That client did not load"
          message={errorMessage(client.error, "The client could not be found.")}
          onRetry={client.reload}
        />
      </PageShell>
    );
  }

  const record = client.data;

  return (
    <PageShell>
      <nav aria-label="Breadcrumb" className="text-[11.5px] leading-none text-ink-3">
        <Link to="/clients" className="hover:text-ink hover:underline">
          Clients
        </Link>
        <span className="px-1.5 text-ink-4">/</span>
        <span className="text-ink-3">{record.city}</span>
        <span className="px-1.5 text-ink-4">/</span>
        <span className="font-semibold text-ink">
          {record.firstName} {record.lastName}
        </span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[32px] leading-[1.05] text-ink">
              {record.firstName} {record.lastName}
            </h1>
            <StatusChip status={record.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-[18px] gap-y-1.5 text-[13px] leading-[1.4]">
            <span className="text-ink-2">
              {record.addressLine}, {record.city} {record.postalCode}
            </span>
            {record.phone && (
              <>
                <span aria-hidden="true" className="hidden h-[13px] w-px bg-line-2 sm:block" />
                <span className="font-semibold text-ink">{record.phone}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigate("/clients")} icon={<ArrowLeft aria-hidden="true" className="size-3.5" />}>
            All clients
          </Button>
          <Button size="sm" onClick={() => setEditing(true)}>
            Edit client
          </Button>
          <Button size="sm" variant="primary" onClick={() => setScheduling(true)}>
            Schedule a visit
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap overflow-hidden rounded-[6px] border border-line-2 bg-panel">
        <StatCell label="Client ID" value={`CR-${record.id.slice(0, 8).toUpperCase()}`} />
        <StatCell label="In care since" value={format(parseISO(record.createdAt), "d MMM yyyy")} />
        <StatCell label="Care plan" value={`${record.carePlanTasks.length} tasks`} />
        <StatCell
          label="Visits on record"
          value={history.data ? String(history.data.totalElements) : "—"}
        />
        <StatCell label="Postal code" value={record.postalCode} last />
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <CarePlanPanel clientId={id} tasks={record.carePlanTasks} onChanged={client.reload} />

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[6px] border border-line-2 bg-panel">
          <header className="border-b border-line-2 px-[18px] pt-[15px] pb-[13px]">
            <h2 className="text-[13.5px] leading-[1.2] font-semibold text-ink">Visit history</h2>
            <p className="mt-[3px] text-[11.5px] leading-[1.5] text-ink-3">
              {history.data
                ? `${history.data.totalElements} visits on record, newest first.`
                : "Loading the record…"}
            </p>
          </header>

          {history.loading && !history.data && (
            <div className="p-[18px]">
              <SkeletonRows rows={6} />
            </div>
          )}

          {history.failed && (
            <div className="p-[18px]">
              <ErrorState message={errorMessage(history.error)} onRetry={history.reload} />
            </div>
          )}

          {history.data && history.data.content.length === 0 && (
            <div className="p-[18px]">
              <EmptyState
                glyph="0"
                title="No visits yet"
                description={`${record.firstName} is in care but nothing has been scheduled. The care plan above is what a first visit would be performed against.`}
                action={
                  <Button variant="primary" size="sm" onClick={() => setScheduling(true)}>
                    Schedule the first visit
                  </Button>
                }
              />
            </div>
          )}

          {history.data && history.data.content.length > 0 && (
            <>
              <div className="flex border-b border-line bg-sunken px-[18px] py-[7px] font-mono text-[9.5px] leading-none font-semibold tracking-[.1em] text-ink-3 uppercase">
                <span className="w-[104px] shrink-0">Date</span>
                <span className="w-[96px] shrink-0">Time</span>
                <span className="w-[124px] shrink-0">Status</span>
                <span className="min-w-0 flex-1">Caregiver</span>
                <span className="w-[62px] shrink-0 text-right">Length</span>
              </div>

              <MonthGroupedVisits visits={history.data.content} />

              <div className="border-t border-line-2 px-[18px] py-3">
                <Pagination page={history.data} onPageChange={setHistoryPage} label="visits" />
              </div>
            </>
          )}
        </section>
      </div>

      <ClientFormModal
        open={editing}
        client={record}
        onClose={() => setEditing(false)}
        onSaved={client.reload}
      />

      <ScheduleVisitModal
        open={scheduling}
        client={{
          id: record.id,
          firstName: record.firstName,
          lastName: record.lastName,
          city: record.city,
        }}
        onClose={() => setScheduling(false)}
        onScheduled={(visit) => {
          history.reload();
          setAssigning(visit);
        }}
      />

      <AssignCaregiverModal
        open={Boolean(assigning)}
        visit={assigning}
        onClose={() => setAssigning(null)}
        onAssigned={history.reload}
      />
    </PageShell>
  );
}

function StatCell({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={cn("min-w-[150px] flex-1 px-4 py-3", !last && "border-r border-line")}>
      <div className="label-caps text-[9.5px] text-ink-3">{label}</div>
      <div className="mt-1 text-[13px] leading-[1.4] font-semibold text-ink">{value}</div>
    </div>
  );
}

/**
 * The care plan is add-and-remove rather than edit-in-place: the API deliberately has no
 * update endpoint for a task, because a visit copies the plan at scheduling time and a
 * silently reworded task would make two visits claim to have done different things under
 * the same id. Removing and re-adding is the honest operation.
 */
function CarePlanPanel({
  clientId,
  tasks,
  onChanged,
}: {
  clientId: string;
  tasks: Array<{ id: string; description: string; sortOrder: number }>;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function addTask() {
    const trimmed = description.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      await clientsApi.addCarePlanTask(clientId, {
        description: trimmed,
        sortOrder: tasks.length,
      });
      toast.success("Task added to the care plan", "Visits scheduled from now on will carry it.");
      setDescription("");
      setAdding(false);
      onChanged();
    } catch (error) {
      toast.error("Could not add that task", errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function removeTask(taskId: string, label: string) {
    setRemoving(taskId);
    try {
      await clientsApi.removeCarePlanTask(clientId, taskId);
      toast.info("Task removed", `"${label}" will not appear on future visits.`);
      onChanged();
    } catch (error) {
      toast.error("Could not remove that task", errorMessage(error));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section className="flex w-full min-w-0 flex-col overflow-hidden rounded-[6px] border border-line-2 bg-panel xl:w-[560px] xl:shrink-0">
      <header className="flex items-start justify-between gap-3 border-b border-line-2 px-[18px] pt-[15px] pb-[13px]">
        <div>
          <h2 className="text-[13.5px] leading-[1.2] font-semibold text-ink">Care plan</h2>
          <p className="mt-[3px] text-[11.5px] leading-[1.5] text-ink-3">
            {tasks.length} tasks &middot; copied onto every visit as it is scheduled
          </p>
        </div>
        {!adding && (
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            icon={<Plus aria-hidden="true" className="size-3.5" />}
          >
            Add task
          </Button>
        )}
      </header>

      {tasks.length === 0 && !adding && (
        <div className="px-[18px] py-[18px]">
          <EmptyState
            glyph="0"
            title="No tasks yet"
            description="A visit with an empty care plan gives the caregiver nothing to tick off. Add what this client actually needs done."
            action={
              <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
                Add the first task
              </Button>
            }
          />
        </div>
      )}

      <ol>
        {tasks.map((task, index) => (
          <li
            key={task.id}
            className="flex items-start gap-[11px] border-b border-line px-[18px] py-3 last:border-b-0 hover:bg-bg"
          >
            <span
              aria-hidden="true"
              className="mt-px w-[18px] shrink-0 font-mono text-[11px] text-ink-3"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1 text-[13px] leading-[1.4] font-semibold text-ink">
              {task.description}
            </span>
            <button
              type="button"
              onClick={() => removeTask(task.id, task.description)}
              disabled={removing === task.id}
              aria-label={`Remove "${task.description}" from the care plan`}
              className="shrink-0 cursor-pointer text-ink-3 hover:text-mis-fg disabled:cursor-wait disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
            </button>
          </li>
        ))}
      </ol>

      {adding && (
        <div className="border-t border-line bg-bg px-[18px] py-3.5">
          <label
            htmlFor="new-care-plan-task"
            className="label-caps block text-[9.5px] text-ink-3"
          >
            Task
          </label>
          <input
            id="new-care-plan-task"
            autoFocus
            value={description}
            maxLength={255}
            onChange={(event) => setDescription(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addTask();
              }
              if (event.key === "Escape") setAdding(false);
            }}
            placeholder="Assist with transfer, bed to chair"
            className={controlClasses(false, "md", "mt-1.5")}
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              variant="primary"
              onClick={addTask}
              loading={saving}
              loadingLabel="Saving…"
              disabled={!description.trim()}
            >
              Save task
            </Button>
            <Button size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <span className="text-[11.5px] leading-[1.5] text-ink-3">
              Takes effect on visits scheduled from now on. Visits already booked keep the plan
              they were created with.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

/** Month rules give a long history a spine to scan against, per the design. */
function MonthGroupedVisits({ visits }: { visits: Visit[] }) {
  // Derived up front rather than by mutating a cursor while mapping: React may render a
  // list more than once, and a variable carried across iterations would come back stale.
  const rows = visits.map((visit, index) => {
    const month = format(parseISO(visit.scheduledStart), "MMMM yyyy");
    const previous =
      index === 0 ? null : format(parseISO(visits[index - 1].scheduledStart), "MMMM yyyy");
    return { visit, month, isNewMonth: month !== previous };
  });

  return (
    <div>
      {rows.map(({ visit, month, isNewMonth }) => {
        return (
          <div key={visit.id}>
            {isNewMonth && (
              <div className="border-b border-line bg-bg px-[18px] pt-2 pb-1.5 font-mono text-[9.5px] leading-none font-semibold tracking-[.1em] text-ink-3 uppercase">
                {month}
              </div>
            )}
            <Link
              to={`/visits/${visit.id}`}
              className="flex items-baseline border-b border-line px-[18px] py-2.5 hover:bg-bg"
            >
              <span className="w-[104px] shrink-0 text-[12.5px] leading-[1.3] font-semibold text-ink">
                {formatDay(visit.scheduledStart).replace(/ \d{4}$/, "")}
              </span>
              <span className="w-[96px] shrink-0 text-[12.5px] leading-[1.3] font-medium text-ink-2">
                {formatTime(visit.scheduledStart)}&ndash;{formatTime(visit.scheduledEnd)}
              </span>
              <span className="w-[124px] shrink-0">
                <StatusBadge status={visit.status} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] leading-[1.3] font-medium text-ink">
                {visit.caregiver
                  ? `${visit.caregiver.firstName} ${visit.caregiver.lastName}`
                  : "Unassigned"}
                <span className="ml-2 font-mono text-[9.5px] text-ink-3">
                  {SKILL_LABELS[visit.requiredSkill].toUpperCase()}
                </span>
              </span>
              <span className="w-[62px] shrink-0 text-right text-[12.5px] leading-[1.3] font-medium text-ink-2">
                {visit.checkedInAt && visit.checkedOutAt
                  ? formatDuration(visit.checkedInAt, visit.checkedOutAt)
                  : "—"}
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
