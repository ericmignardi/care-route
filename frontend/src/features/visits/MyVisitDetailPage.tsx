import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft } from "lucide-react";
import { Button, ErrorState, Skeleton, StatusBadge } from "../../components/ui";
import { visitsApi } from "../../api/visits";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { toast } from "../../stores/toastStore";
import { SKILL_LABELS } from "../../lib/constants";
import { formatDayLong, formatDuration, formatTime } from "../../lib/dates";
import { cn } from "../../lib/cn";
import type { VisitDetail } from "../../types/domain";

const NOTE_LIMIT = 2000;

/**
 * The field surface: one visit, three decisions, gloves on. Check in, tick the plan,
 * check out. Every target is at least 44px and the primary action never leaves the
 * bottom of the screen.
 */
export function MyVisitDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const visit = useAsync(() => visitsApi.get(id), `visit ${id}`);
  const [pendingTask, setPendingTask] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  if (visit.loading && !visit.data) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-[18px] py-5">
        <Skeleton lead className="h-[13px] w-[180px]" />
        <Skeleton className="h-[96px] rounded-[10px]" />
        <Skeleton className="h-[140px] rounded-[10px]" />
        <Skeleton className="h-[220px] rounded-[10px]" />
      </div>
    );
  }

  if (visit.error || !visit.data) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-[18px] py-5">
        <ErrorState
          title="That visit did not load"
          message={errorMessage(visit.error, "It may not be yours to open.")}
          onRetry={visit.reload}
        />
        <div className="mt-4">
          <Button fullWidth onClick={() => navigate("/my-visits")}>
            Back to my day
          </Button>
        </div>
      </div>
    );
  }

  const record = visit.data;
  const doneCount = record.tasks.filter((task) => task.completed).length;
  const onSite = record.status === "IN_PROGRESS";

  /**
   * Optimistic, with a real rollback. The tick has to answer instantly on a phone with
   * two bars of signal — but if the request fails the checkbox must go back, or the
   * caregiver will believe they recorded something they did not.
   */
  async function completeTask(taskId: string, description: string) {
    const snapshot = record;
    setPendingTask(taskId);

    visit.setData((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === taskId
                ? { ...task, completed: true, completedAt: new Date().toISOString() }
                : task,
            ),
          }
        : current,
    );

    try {
      const updated = await visitsApi.completeTask(snapshot.id, taskId);
      visit.setData(updated);
    } catch (error) {
      visit.setData(snapshot);
      toast.error(`Could not tick "${description}"`, errorMessage(error));
    } finally {
      setPendingTask(null);
    }
  }

  async function checkIn() {
    setTransitioning(true);
    try {
      visit.setData(await visitsApi.checkIn(record.id));
      toast.success("Checked in", "Timer running. Tick the care plan as you go.");
    } catch (error) {
      toast.error("Cannot check in yet", errorMessage(error));
    } finally {
      setTransitioning(false);
    }
  }

  async function checkOut() {
    setTransitioning(true);
    try {
      const updated = await visitsApi.checkOut(record.id);
      visit.setData(updated);
      toast.success(
        "Checked out",
        `${updated.client.firstName} ${updated.client.lastName} · ${
          updated.checkedInAt && updated.checkedOutAt
            ? formatDuration(updated.checkedInAt, updated.checkedOutAt)
            : ""
        } on site.`,
      );
      navigate("/my-visits");
    } catch (error) {
      toast.error("Could not check out", errorMessage(error));
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[560px] pb-[168px]">
      <header className="flex items-center gap-3 border-b border-line bg-panel px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => navigate("/my-visits")}
          aria-label="Back to my day"
          className="flex size-[38px] shrink-0 cursor-pointer items-center justify-center rounded-[9px] border border-line-2 text-ink hover:bg-sunken"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] leading-[1.2] font-bold text-ink">
            {record.client.firstName} {record.client.lastName}
          </div>
          <div
            className={cn(
              "text-[11.5px] leading-[1.3] font-semibold",
              onSite ? "text-prg-fg" : "text-ink-3",
            )}
          >
            {onSite && record.checkedInAt
              ? `● On site · ${formatDuration(record.checkedInAt, new Date())}`
              : formatDayLong(record.scheduledStart)}
          </div>
        </div>
        <StatusBadge status={record.status} />
      </header>

      <section className="border-b border-line bg-panel px-[18px] py-3.5">
        <p className="text-[14px] leading-[1.45] text-ink-2">{record.client.city}</p>
        <p className="mt-1 text-[13px] leading-[1.45] text-ink-3">
          {formatTime(record.scheduledStart)}&ndash;{formatTime(record.scheduledEnd)} &middot;{" "}
          {SKILL_LABELS[record.requiredSkill]}
        </p>
      </section>

      <section className="px-[18px] pt-4">
        <h2 className="label-caps mb-3 text-[9.5px] text-ink-3">This visit</h2>
        <Steps visit={record} />
      </section>

      <section className="px-[18px] pt-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="label-caps text-[9.5px] text-ink-3">Care plan</h2>
          <span className="text-[12.5px] leading-none font-bold text-ink-2">
            {doneCount} of {record.tasks.length} ticked
          </span>
        </div>

        {record.tasks.length === 0 ? (
          <p className="mt-3 text-[13px] leading-[1.6] text-ink-2">
            This visit carries no tasks. Record what you did in the note below.
          </p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {record.tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  disabled={task.completed || !onSite || pendingTask === task.id}
                  onClick={() => completeTask(task.id, task.description)}
                  aria-pressed={task.completed}
                  className={cn(
                    "flex min-h-[56px] w-full items-start gap-3.5 rounded-[10px] border p-3.5 text-left",
                    "border-line-2 bg-panel",
                    !task.completed && onSite && "cursor-pointer hover:border-line-3 active:scale-[.99]",
                    (task.completed || !onSite) && "cursor-default",
                    "motion-reduce:active:scale-100",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-[7px] border-2 text-[15px] font-bold",
                      task.completed
                        ? "border-pine bg-pine text-pine-on"
                        : "border-line-3 bg-bg text-transparent",
                    )}
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[14.5px] leading-[1.35] font-semibold",
                        task.completed ? "text-ink-3 line-through" : "text-ink",
                      )}
                    >
                      {task.description}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-ink-3">
                      {task.completed
                        ? `Ticked ${task.completedAt ? formatTime(task.completedAt) : ""}`
                        : onSite
                          ? "Tap when it is done"
                          : "Check in first"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NoteEditor visit={record} onSaved={(updated) => visit.setData(updated)} />

      <div className="fixed right-0 bottom-0 left-0 border-t border-line-2 bg-panel px-[18px] pt-3.5 pb-[18px]">
        <div className="mx-auto w-full max-w-[560px]">
          {onSite && record.tasks.length > 0 && doneCount < record.tasks.length && (
            <div className="mb-3 flex items-center gap-2 rounded-[8px] border border-prg-bd bg-prg-bg px-2.5 py-2.5">
              <span
                aria-hidden="true"
                className="flex size-4 shrink-0 items-center justify-center rounded-full bg-prg-fg text-[11px] font-bold text-prg-bg"
              >
                !
              </span>
              <span className="text-[12.5px] leading-[1.4] font-semibold text-prg-fg">
                {doneCount} of {record.tasks.length} tasks ticked. You can still check out &mdash;
                say why in the note.
              </span>
            </div>
          )}

          {record.status === "SCHEDULED" && (
            <>
              <Button
                size="lg"
                variant="primary"
                fullWidth
                className="!h-[68px] !text-[20px]"
                loading={transitioning}
                loadingLabel="Checking in…"
                onClick={checkIn}
              >
                Check in
              </Button>
              <p className="mt-2 text-center text-[11.5px] leading-[1.5] text-ink-3">
                Check-in opens shortly before {formatTime(record.scheduledStart)}.
              </p>
            </>
          )}

          {onSite && (
            <>
              <Button
                size="lg"
                variant="primary"
                fullWidth
                className="!h-[68px] !text-[20px]"
                loading={transitioning}
                loadingLabel="Checking out…"
                onClick={checkOut}
              >
                Check out
              </Button>
              <p className="mt-2 text-center text-[11.5px] leading-[1.5] text-ink-3">
                Ends the visit and sends your note. You cannot undo this on the phone.
              </p>
            </>
          )}

          {!onSite && record.status !== "SCHEDULED" && (
            <Button size="lg" fullWidth onClick={() => navigate("/my-visits")}>
              Back to my day
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Steps({ visit }: { visit: VisitDetail }) {
  const steps = [
    { label: "Scheduled", value: formatTime(visit.scheduledStart), done: true },
    {
      label: "Checked in",
      value: visit.checkedInAt ? formatTime(visit.checkedInAt) : "—",
      done: Boolean(visit.checkedInAt),
    },
    {
      label: "Checked out",
      value: visit.checkedOutAt ? formatTime(visit.checkedOutAt) : "—",
      done: Boolean(visit.checkedOutAt),
    },
  ];

  return (
    <ol>
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={cn("relative flex items-start gap-3", index < steps.length - 1 && "pb-3.5")}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px] font-bold",
              step.done
                ? "border-pine bg-pine text-pine-on"
                : "border-dashed border-line-3 bg-bg text-transparent",
            )}
          >
            ✓
          </span>
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-5 bottom-0 left-[9.5px] w-[1.5px]",
                step.done ? "bg-pine-line" : "bg-line-2",
              )}
            />
          )}
          <span className="flex flex-1 items-baseline justify-between gap-3">
            <span
              className={cn(
                "text-[14px] leading-[1.2] font-medium",
                step.done ? "font-bold text-ink" : "text-ink-3",
              )}
            >
              {step.label}
            </span>
            <span
              className={cn(
                "shrink-0 text-[14px] leading-[1.2] font-semibold",
                step.done ? "text-ink" : "text-ink-3",
              )}
            >
              {step.value}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Saved as you type, per the design — but debounced and guarded. The endpoint rejects a
 * blank note, so clearing the box is not a save, and a request only goes out once the
 * text has actually settled and differs from what the server already holds.
 */
function NoteEditor({
  visit,
  onSaved,
}: {
  visit: VisitDetail;
  onSaved: (visit: VisitDetail) => void;
}) {
  const [text, setText] = useState(visit.notes ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const debounced = useDebounce(text, 900);
  const lastSaved = useRef(visit.notes ?? "");

  // A check-out or a reload can bring back a note written elsewhere; adopt it unless the
  // caregiver is mid-sentence on something different.
  useEffect(() => {
    const incoming = visit.notes ?? "";
    if (incoming !== lastSaved.current && text === lastSaved.current) {
      lastSaved.current = incoming;
      setText(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit.notes]);

  useEffect(() => {
    const trimmed = debounced.trim();
    if (!trimmed || trimmed === lastSaved.current.trim()) return;

    let cancelled = false;
    setState("saving");

    visitsApi.addNote(visit.id, trimmed).then(
      (updated) => {
        if (cancelled) return;
        lastSaved.current = trimmed;
        setState("saved");
        onSaved(updated);
      },
      () => {
        if (!cancelled) setState("failed");
      },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, visit.id]);

  const readOnly = visit.status === "COMPLETED" || visit.status === "CANCELLED";

  return (
    <section className="px-[18px] pt-5">
      <label htmlFor="visit-note" className="label-caps block text-[9.5px] text-ink-3">
        Note for the office
      </label>
      <textarea
        id="visit-note"
        value={text}
        readOnly={readOnly}
        maxLength={NOTE_LIMIT}
        rows={4}
        onChange={(event) => setText(event.target.value)}
        placeholder={
          readOnly ? "No note was recorded." : "Anything Dana needs to know about this visit."
        }
        className={cn(
          "mt-2 min-h-[92px] w-full resize-y rounded-[10px] border border-line-2 bg-panel px-3 py-3",
          "text-[14px] leading-[1.5] text-ink placeholder:text-ink-4",
          "focus:border-[1.5px] focus:border-pine",
          readOnly && "bg-sunken text-ink-2",
        )}
      />
      <div className="mt-1.5 flex justify-between gap-3">
        <span
          className={cn(
            "text-[11.5px] leading-[1.4]",
            state === "failed" ? "font-semibold text-mis-fg" : "text-ink-3",
          )}
        >
          {readOnly
            ? "This visit is closed."
            : state === "saving"
              ? "Saving…"
              : state === "saved"
                ? "Saved · visible to your coordinator"
                : state === "failed"
                  ? "Not saved — check your signal, it will retry as you type"
                  : "Saved as you type · visible to your coordinator"}
        </span>
        <span className="shrink-0 text-[11.5px] leading-[1.4] text-ink-3">
          {text.length} / {NOTE_LIMIT}
        </span>
      </div>
    </section>
  );
}
