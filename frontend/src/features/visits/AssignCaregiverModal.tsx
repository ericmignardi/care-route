import { useMemo, useState } from "react";
import { AlertCircle, Search } from "lucide-react";
import { Button, ErrorState, Modal, Skeleton } from "../../components/ui";
import { controlClasses } from "../../components/ui/controlClasses";
import { visitsApi } from "../../api/visits";
import { errorMessage, errorRule } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { toast } from "../../stores/toastStore";
import { SKILL_LABELS } from "../../lib/constants";
import { formatDayLong, formatTime } from "../../lib/dates";
import { cn } from "../../lib/cn";
import {
  ELIGIBILITY_RULE_TAGS,
  type CaregiverEligibility,
  type VisitDetail,
} from "../../types/domain";

function initials(caregiver: CaregiverEligibility): string {
  return `${caregiver.firstName.charAt(0)}${caregiver.lastName.charAt(0)}`.toUpperCase();
}

function matches(caregiver: CaregiverEligibility, filter: string): boolean {
  if (!filter) return true;
  const needle = filter.toLowerCase();
  return (
    `${caregiver.firstName} ${caregiver.lastName}`.toLowerCase().includes(needle) ||
    caregiver.skills.some((skill) => SKILL_LABELS[skill].toLowerCase().includes(needle))
  );
}

/**
 * The product's signature screen. Every caregiver the server evaluated is here, eligible
 * or not — the ineligible ones stay at full contrast with their reason in a fixed column,
 * because the reason is usually the thing the coordinator can actually change. Hiding
 * them would turn a diagnosis into a shrug.
 *
 * The rules are never re-evaluated in the browser. `reasons` is what the same
 * VisitEligibilityChecker that guards the assignment endpoint concluded, so what this
 * screen shows and what the server will permit cannot drift.
 */
export function AssignCaregiverModal({
  open,
  visit,
  onClose,
  onAssigned,
}: {
  open: boolean;
  visit: VisitDetail | null;
  onClose: () => void;
  onAssigned: (visit: VisitDetail) => void;
}) {
  const [filter, setFilter] = useState("");
  const [showBlocked, setShowBlocked] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<{ message: string; rule: string | null } | null>(null);

  const candidates = useAsync(
    () =>
      open && visit
        ? visitsApi.eligibleCaregivers({
            start: visit.scheduledStart,
            end: visit.scheduledEnd,
            requiredSkill: visit.requiredSkill,
            visitId: visit.id,
          })
        : Promise.resolve(null),
    `eligible ${open} ${visit?.id ?? ""} ${visit?.scheduledStart ?? ""} ${visit?.scheduledEnd ?? ""} ${visit?.requiredSkill ?? ""}`,
  );

  const { eligible, blocked } = useMemo(() => {
    const all = candidates.data ?? [];
    return {
      eligible: all.filter((entry) => entry.eligible && matches(entry, filter)),
      blocked: all.filter((entry) => !entry.eligible && matches(entry, filter)),
    };
  }, [candidates.data, filter]);

  const chosen = eligible.find((entry) => entry.caregiverId === selected) ?? null;

  async function attemptAssign(caregiver: CaregiverEligibility) {
    if (!visit) return;
    setPending(caregiver.caregiverId);
    setRefusal(null);

    try {
      const updated = await visitsApi.assign(visit.id, caregiver.caregiverId);
      toast.success(
        "Caregiver assigned",
        `${caregiver.firstName} ${caregiver.lastName} takes ${updated.client.firstName} ${updated.client.lastName} at ${formatTime(updated.scheduledStart)}.`,
      );
      onAssigned(updated);
      close();
    } catch (error) {
      // The server is the authority, not this list. A refusal here means the schedule
      // moved underneath the coordinator since the eligibility call, so re-read it.
      setRefusal({ message: errorMessage(error), rule: errorRule(error) });
      candidates.reload();
    } finally {
      setPending(null);
    }
  }

  function close() {
    setFilter("");
    setSelected(null);
    setRefusal(null);
    onClose();
  }

  const total = candidates.data?.length ?? 0;
  const eligibleTotal = candidates.data?.filter((entry) => entry.eligible).length ?? 0;
  const blockedTotal = total - eligibleTotal;

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      bodyClassName="p-0"
      title="Assign caregiver"
      subtitle={
        candidates.loading
          ? "Checking availability, skills and the bookings already on the day…"
          : `${total} caregivers evaluated. ${eligibleTotal} can take this visit.`
      }
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!chosen}
            loading={Boolean(pending) && pending === chosen?.caregiverId}
            loadingLabel="Assigning…"
            onClick={() => chosen && attemptAssign(chosen)}
          >
            {chosen ? `Assign to ${chosen.firstName} ${chosen.lastName}` : "Assign"}
          </Button>
        </>
      }
    >
      {visit && (
        <>
          <div className="flex flex-wrap border-b border-line bg-sunken">
            <div className="min-w-[240px] flex-1 border-r border-line px-3.5 py-[11px]">
              <div className="label-caps text-[9.5px] text-ink-3">Client</div>
              <div className="mt-1.5 text-[13px] leading-[1.3] font-semibold text-ink">
                {visit.client.firstName} {visit.client.lastName}
              </div>
              <div className="text-[11.5px] leading-[1.45] text-ink-2">{visit.client.city}</div>
            </div>

            <div className="min-w-[170px] border-r border-line px-3.5 py-[11px]">
              <div className="label-caps text-[9.5px] text-ink-3">Window</div>
              <div className="mt-1 font-display text-[17px] leading-[1.2] text-ink">
                {formatTime(visit.scheduledStart)}&ndash;{formatTime(visit.scheduledEnd)}
              </div>
              <div className="text-[11px] leading-[1.45] font-semibold text-ink-2">
                {formatDayLong(visit.scheduledStart)}
              </div>
            </div>

            <div className="min-w-[160px] flex-1 px-3.5 py-[11px]">
              <div className="label-caps text-[9.5px] text-ink-3">Requires</div>
              <div className="mt-1.5">
                <span className="rounded-[3px] border border-pine-line bg-pine-tint px-[7px] py-[5px] font-mono text-[10px] leading-none font-bold tracking-[.05em] text-pine-acc">
                  {SKILL_LABELS[visit.requiredSkill].toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-b border-line bg-bg px-[18px] py-2.5">
            <div className="relative min-w-[200px] flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-[10px] size-3.5 -translate-y-1/2 text-ink-3"
              />
              <input
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter by name or skill"
                aria-label="Filter caregivers"
                className={controlClasses(false, "sm", "pl-[30px]")}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-[7px] text-[12px] leading-none font-medium text-ink">
              <input
                type="checkbox"
                checked={showBlocked}
                onChange={(event) => setShowBlocked(event.target.checked)}
                className="size-3.5 accent-[var(--pine)]"
              />
              Show the {blockedTotal} who cannot
            </label>
          </div>

          {refusal && (
            <div
              role="alert"
              className="flex gap-[11px] border-b border-mis-bd border-l-4 border-l-mis-fg bg-mis-bg px-[18px] py-3.5"
            >
              <AlertCircle aria-hidden="true" className="mt-px size-4 shrink-0 text-mis-fg" />
              <div>
                <div className="text-[12.5px] leading-[1.3] font-bold text-mis-fg">
                  Cannot assign this visit
                </div>
                <div className="mt-1 text-[12.5px] leading-[1.55] text-ink">{refusal.message}</div>
                {refusal.rule && (
                  <div className="mt-1.5 font-mono text-[9.5px] tracking-[.06em] text-mis-fg">
                    {refusal.rule}
                  </div>
                )}
              </div>
            </div>
          )}

          {candidates.loading && <CandidateSkeleton />}

          {candidates.failed && (
            <div className="p-[18px]">
              <ErrorState
                title="Could not work out who is free"
                message={errorMessage(candidates.error)}
                onRetry={candidates.reload}
              />
            </div>
          )}

          {candidates.data && (
            <>
              <div className="flex items-baseline gap-2 border-b border-line bg-panel px-[18px] pt-3 pb-2">
                <span className="label-caps text-[10px] text-pine-acc">Eligible</span>
                <span className="font-display text-[15px] leading-none text-ink">
                  {eligible.length}
                </span>
              </div>

              {eligible.length === 0 ? (
                <p className="border-b border-line bg-panel px-[18px] py-[18px] text-[12.5px] leading-[1.6] text-ink-2">
                  Nobody can take this visit as it stands. Every reason below names something you
                  could change &mdash; move the window, change the skill the visit requires, or
                  free up whoever is double-booked.
                </p>
              ) : (
                eligible.map((caregiver) => (
                  <button
                    key={caregiver.caregiverId}
                    type="button"
                    onClick={() => setSelected(caregiver.caregiverId)}
                    aria-pressed={selected === caregiver.caregiverId}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-[13px] border-b border-line px-[18px] py-3 text-left",
                      selected === caregiver.caregiverId
                        ? "bg-pine-tint"
                        : "bg-panel hover:bg-pine-tint",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-pine"
                    >
                      {selected === caregiver.caregiverId && (
                        <span className="block size-[9px] rounded-full bg-pine" />
                      )}
                    </span>

                    <span
                      aria-hidden="true"
                      className="flex size-[26px] shrink-0 items-center justify-center rounded-full border border-pine-line bg-pine-tint text-[10px] font-semibold text-pine-acc"
                    >
                      {initials(caregiver)}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] leading-[1.25] font-semibold text-ink">
                          {caregiver.firstName} {caregiver.lastName}
                        </span>
                        {caregiver.skills.map((skill) => (
                          <span
                            key={skill}
                            className={cn(
                              "rounded-[3px] border px-[5px] py-[3px] font-mono text-[9.5px] leading-none font-bold",
                              skill === visit.requiredSkill
                                ? "border-pine-line bg-pine-tint text-pine-acc"
                                : "border-line-2 bg-bg text-ink-2",
                            )}
                          >
                            {SKILL_LABELS[skill].toUpperCase()}
                          </span>
                        ))}
                      </span>
                      <span className="mt-1 block text-[12px] leading-[1.5] text-ink-2">
                        Free for the whole window, holds{" "}
                        {SKILL_LABELS[visit.requiredSkill].toLowerCase()}, and nothing already on
                        the schedule collides with it.
                      </span>
                    </span>
                  </button>
                ))
              )}

              {showBlocked && blocked.length > 0 && (
                <>
                  <div className="border-b border-line bg-bg px-[18px] pt-3.5 pb-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="label-caps text-[10px] text-ink-3">
                        Cannot take this visit
                      </span>
                      <span className="font-display text-[15px] leading-none text-ink-2">
                        {blocked.length}
                      </span>
                    </div>
                    <p className="mt-1 max-w-[600px] text-[11.5px] leading-[1.5] text-ink-3">
                      Shown with the reason, because the reason is usually the thing you need to
                      change. Click a row to try anyway &mdash; the server will tell you exactly
                      what it would break.
                    </p>
                  </div>

                  {blocked.map((caregiver) => (
                    <button
                      key={caregiver.caregiverId}
                      type="button"
                      onClick={() => attemptAssign(caregiver)}
                      disabled={pending === caregiver.caregiverId}
                      className="group flex w-full cursor-pointer items-start gap-[13px] border-b border-line bg-bg px-[18px] py-2.5 text-left last:border-b-0 hover:bg-sunken disabled:cursor-wait"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-px block size-[18px] shrink-0 rounded-full border-[1.5px] border-line-2 bg-sunken"
                      />

                      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="w-[190px] shrink-0 text-[13.5px] leading-[1.3] font-medium text-ink-2">
                          {caregiver.firstName} {caregiver.lastName}
                        </span>

                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          {caregiver.reasons.map((reason) => (
                            <span key={reason.rule} className="flex flex-wrap items-baseline gap-3">
                              <span className="shrink-0 rounded-[3px] border border-line bg-sunken px-1.5 py-1 font-mono text-[9.5px] leading-none font-semibold tracking-[.06em] text-ink-3">
                                {ELIGIBILITY_RULE_TAGS[reason.rule]}
                              </span>
                              <span className="text-[12.5px] leading-[1.4] text-ink-2">
                                {reason.message}
                              </span>
                            </span>
                          ))}
                        </span>
                      </span>

                      <span className="shrink-0 self-center text-[11px] leading-none font-semibold text-pine-acc opacity-0 group-hover:opacity-100">
                        Try anyway
                      </span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}

function CandidateSkeleton() {
  return (
    <div role="status" aria-label="Checking who is available" className="px-[18px] py-4">
      <Skeleton lead className="h-[10px] w-[130px]" />
      <div className="mt-4 flex flex-col gap-3.5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-[26px] rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-[12px] w-[190px]" />
              <Skeleton className="mt-2 h-[10px] w-[70%]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
