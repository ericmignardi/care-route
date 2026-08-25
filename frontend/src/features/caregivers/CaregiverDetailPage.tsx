import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Button, EmptyState, ErrorState, SkeletonRows, StatusBadge } from "../../components/ui";
import { controlClasses } from "../../components/ui/controlClasses";
import { PageShell } from "../../components/layout/PageShell";
import { caregiversApi } from "../../api/caregivers";
import { visitsApi } from "../../api/visits";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { toast } from "../../stores/toastStore";
import { DAYS_OF_WEEK, SKILLS, SKILL_LABELS, type DayOfWeek, type Skill } from "../../lib/constants";
import { formatDay, formatTime, toLocalIso } from "../../lib/dates";
import { cn } from "../../lib/cn";
import type { AvailabilityInput, CaregiverDetail, CaregiverStatus } from "../../types/domain";

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

/** `08:00:00` from the wire, `08:00` in an `<input type="time">`. */
function toTimeInput(value: string): string {
  return value.slice(0, 5);
}

export function CaregiverDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const caregiver = useAsync(() => caregiversApi.get(id), `caregiver ${id}`);

  const upcoming = useAsync(
    () =>
      visitsApi.list({
        caregiverId: id,
        from: toLocalIso(new Date()),
        size: 8,
      }),
    `caregiver-visits ${id}`,
  );

  if (caregiver.loading && !caregiver.data) {
    return (
      <PageShell>
        <SkeletonRows rows={8} />
      </PageShell>
    );
  }

  if (caregiver.error || !caregiver.data) {
    return (
      <PageShell>
        <ErrorState
          title="That caregiver did not load"
          message={errorMessage(caregiver.error, "The caregiver could not be found.")}
          onRetry={caregiver.reload}
        />
      </PageShell>
    );
  }

  const record = caregiver.data;

  return (
    <PageShell>
      <nav aria-label="Breadcrumb" className="text-[11.5px] leading-none text-ink-3">
        <Link to="/caregivers" className="hover:text-ink hover:underline">
          Caregivers
        </Link>
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
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[4px] border py-[5px] pr-2.5 pl-2 text-[11.5px] leading-none font-semibold",
                record.status === "ACTIVE"
                  ? "border-don-bd bg-don-bg text-don-fg"
                  : "border-dashed border-can-bd bg-can-bg text-can-fg",
              )}
            >
              <span aria-hidden="true" className="text-[10px]">
                {record.status === "ACTIVE" ? "✓" : "—"}
              </span>
              {record.status === "ACTIVE" ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-[18px] gap-y-1.5 text-[13px] leading-[1.4] text-ink-2">
            <span>{record.username}</span>
            {record.phone && (
              <>
                <span aria-hidden="true" className="hidden h-[13px] w-px bg-line-2 sm:block" />
                <span className="font-semibold text-ink">{record.phone}</span>
              </>
            )}
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => navigate("/caregivers")}
          icon={<ArrowLeft aria-hidden="true" className="size-3.5" />}
        >
          All caregivers
        </Button>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="flex w-full min-w-0 flex-col gap-5 xl:w-[560px] xl:shrink-0">
          <ProfilePanel
            key={profileKey(record)}
            caregiver={record}
            onSaved={caregiver.reload}
          />
          <AvailabilityPanel
            key={availabilityKey(record)}
            caregiver={record}
            onSaved={caregiver.reload}
          />
        </div>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[6px] border border-line-2 bg-panel">
          <header className="border-b border-line-2 px-[18px] pt-[15px] pb-[13px]">
            <h2 className="text-[13.5px] leading-[1.2] font-semibold text-ink">Upcoming visits</h2>
            <p className="mt-[3px] text-[11.5px] leading-[1.5] text-ink-3">
              Everything already on this caregiver&rsquo;s schedule from now on.
            </p>
          </header>

          {upcoming.loading && !upcoming.data && (
            <div className="p-[18px]">
              <SkeletonRows rows={5} />
            </div>
          )}

          {upcoming.failed && (
            <div className="p-[18px]">
              <ErrorState message={errorMessage(upcoming.error)} onRetry={upcoming.reload} />
            </div>
          )}

          {upcoming.data?.content.length === 0 && (
            <div className="p-[18px]">
              <EmptyState
                glyph="0"
                title="Nothing scheduled"
                description="No upcoming visits are assigned. If that is a surprise, check the availability windows on the left — a caregiver with no windows can never be assigned anything."
              />
            </div>
          )}

          {upcoming.data?.content.map((visit) => (
            <Link
              key={visit.id}
              to={`/visits/${visit.id}`}
              className="flex items-center gap-3 border-b border-line px-[18px] py-2.5 last:border-b-0 hover:bg-bg"
            >
              <span className="w-[108px] shrink-0 text-[12.5px] leading-[1.3] font-semibold text-ink">
                {formatDay(visit.scheduledStart).replace(/ \d{4}$/, "")}
              </span>
              <span className="w-[96px] shrink-0 text-[12.5px] leading-[1.3] font-medium text-ink-2">
                {formatTime(visit.scheduledStart)}&ndash;{formatTime(visit.scheduledEnd)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] leading-[1.3] font-medium text-ink">
                {visit.client.firstName} {visit.client.lastName}
                <span className="ml-2 text-ink-3">{visit.client.city}</span>
              </span>
              <StatusBadge status={visit.status} />
            </Link>
          ))}
        </section>
      </div>
    </PageShell>
  );
}

/**
 * Both editors below hold a working copy of what the server sent. Rather than an effect
 * that overwrites that copy whenever the prop changes — which would also stamp on an edit
 * the user is halfway through — they are keyed on the values they seed from: a save that
 * genuinely changes the record remounts the panel, and a re-render that does not, leaves
 * it alone.
 */
function profileKey(caregiver: CaregiverDetail): string {
  return `${caregiver.status} ${[...caregiver.skills].sort().join(",")}`;
}

function availabilityKey(caregiver: CaregiverDetail): string {
  return caregiver.availability
    .map((entry) => `${entry.dayOfWeek}${entry.startTime}${entry.endTime}`)
    .join("|");
}

/** Name, phone, status and the skill set — everything `PUT /caregivers/{id}` accepts. */
function ProfilePanel({
  caregiver,
  onSaved,
}: {
  caregiver: CaregiverDetail;
  onSaved: () => void;
}) {
  const [skills, setSkills] = useState<Skill[]>(caregiver.skills);
  const [status, setStatus] = useState<CaregiverStatus>(caregiver.status);
  const [saving, setSaving] = useState(false);

  const dirty =
    status !== caregiver.status ||
    skills.length !== caregiver.skills.length ||
    skills.some((skill) => !caregiver.skills.includes(skill));

  async function save() {
    setSaving(true);
    try {
      await caregiversApi.update(caregiver.id, {
        firstName: caregiver.firstName,
        lastName: caregiver.lastName,
        phone: caregiver.phone ?? undefined,
        status,
        skills,
      });
      toast.success("Profile saved", "Eligibility for future assignments uses the new skill set.");
      onSaved();
    } catch (error) {
      toast.error("Could not save the profile", errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[6px] border border-line-2 bg-panel">
      <header className="border-b border-line-2 px-[18px] pt-[15px] pb-[13px]">
        <h2 className="text-[13.5px] leading-[1.2] font-semibold text-ink">Qualifications</h2>
        <p className="mt-[3px] text-[11.5px] leading-[1.5] text-ink-3">
          A visit can only be assigned to someone holding the skill it requires (BR-3).
        </p>
      </header>

      <div className="px-[18px] py-4">
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((skill) => {
            const checked = skills.includes(skill);
            return (
              <label
                key={skill}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-[5px] border px-2.5 py-2 text-[12.5px] leading-none font-semibold",
                  checked
                    ? "border-pine-line bg-pine-tint text-pine-acc"
                    : "border-line-2 bg-panel text-ink-2 hover:border-line-3",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    setSkills((current) =>
                      event.target.checked
                        ? [...current, skill]
                        : current.filter((value) => value !== skill),
                    )
                  }
                  className="size-3.5 accent-[var(--pine)]"
                />
                {SKILL_LABELS[skill]}
              </label>
            );
          })}
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[12.5px] leading-none font-medium text-ink">
          <input
            type="checkbox"
            checked={status === "ACTIVE"}
            onChange={(event) => setStatus(event.target.checked ? "ACTIVE" : "INACTIVE")}
            className="size-3.5 accent-[var(--pine)]"
          />
          Currently working &mdash; an inactive caregiver is excluded from every assignment
        </label>
      </div>

      <footer className="flex items-center gap-2.5 border-t border-line bg-bg px-[18px] py-3">
        <Button
          size="sm"
          variant="primary"
          onClick={save}
          disabled={!dirty}
          loading={saving}
          loadingLabel="Saving…"
        >
          Save qualifications
        </Button>
        {dirty && <span className="text-[11.5px] text-ink-3">Unsaved changes</span>}
      </footer>
    </section>
  );
}

/**
 * Seven day rows, each holding as many windows as the caregiver actually works — a split
 * shift is a real thing and a one-row-per-day editor would silently delete the second
 * half of it. `PUT` replaces the whole week, so what is on screen is exactly what is
 * stored; there is no partial-update path to get out of step with.
 */
function AvailabilityPanel({
  caregiver,
  onSaved,
}: {
  caregiver: CaregiverDetail;
  onSaved: () => void;
}) {
  const [windows, setWindows] = useState<AvailabilityInput[]>(() =>
    caregiver.availability.map((entry) => ({
      dayOfWeek: entry.dayOfWeek,
      startTime: toTimeInput(entry.startTime),
      endTime: toTimeInput(entry.endTime),
    })),
  );
  const [saving, setSaving] = useState(false);

  function windowsFor(day: DayOfWeek) {
    return windows
      .map((window, index) => ({ window, index }))
      .filter((entry) => entry.window.dayOfWeek === day);
  }

  const invalid = windows.some((window) => window.endTime <= window.startTime);

  async function save() {
    if (invalid) {
      toast.error("Fix the windows first", "Every window has to end after it starts.");
      return;
    }

    setSaving(true);
    try {
      await caregiversApi.replaceAvailability(
        caregiver.id,
        windows.map((window) => ({
          dayOfWeek: window.dayOfWeek,
          startTime: `${window.startTime}:00`,
          endTime: `${window.endTime}:00`,
        })),
      );
      toast.success(
        "Availability saved",
        "Assignments are checked against these windows from now on (BR-2).",
      );
      onSaved();
    } catch (error) {
      toast.error("Could not save availability", errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[6px] border border-line-2 bg-panel">
      <header className="border-b border-line-2 px-[18px] pt-[15px] pb-[13px]">
        <h2 className="text-[13.5px] leading-[1.2] font-semibold text-ink">Weekly availability</h2>
        <p className="mt-[3px] text-[11.5px] leading-[1.5] text-ink-3">
          A visit has to fall entirely inside one window on the day it runs. Split shifts are two
          windows, not one long one.
        </p>
      </header>

      <div>
        {DAYS_OF_WEEK.map((day) => {
          const dayWindows = windowsFor(day);

          return (
            <div
              key={day}
              className="flex flex-wrap items-start gap-3 border-b border-line px-[18px] py-2.5 last:border-b-0"
            >
              <span className="w-[86px] shrink-0 pt-2 text-[12.5px] leading-none font-semibold text-ink">
                {DAY_LABELS[day]}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {dayWindows.length === 0 && (
                  <span className="py-2 text-[12px] leading-none text-ink-3">Not working</span>
                )}

                {dayWindows.map(({ window, index }) => {
                  const bad = window.endTime <= window.startTime;
                  return (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      {/* The control fills its wrapper rather than overriding its own
                          `w-full` — `cn` is a plain join, so a competing width would not
                          have won. The wrapper is where a fixed size belongs. */}
                      <span className="w-[116px]">
                        <input
                          type="time"
                          step={900}
                          value={window.startTime}
                          aria-label={`${DAY_LABELS[day]} start time`}
                          onChange={(event) =>
                            setWindows((current) =>
                              current.map((entry, position) =>
                                position === index
                                  ? { ...entry, startTime: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className={controlClasses(bad, "md")}
                        />
                      </span>
                      <span aria-hidden="true" className="text-ink-3">
                        &ndash;
                      </span>
                      <span className="w-[116px]">
                        <input
                          type="time"
                          step={900}
                          value={window.endTime}
                          aria-label={`${DAY_LABELS[day]} end time`}
                          onChange={(event) =>
                            setWindows((current) =>
                              current.map((entry, position) =>
                                position === index
                                  ? { ...entry, endTime: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className={controlClasses(bad, "md")}
                        />
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setWindows((current) => current.filter((_, position) => position !== index))
                        }
                        aria-label={`Remove this ${DAY_LABELS[day]} window`}
                        className="flex size-[28px] cursor-pointer items-center justify-center rounded-[5px] border border-line-2 text-ink-3 hover:border-mis-bd hover:text-mis-fg"
                      >
                        <X aria-hidden="true" className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  setWindows((current) => [
                    ...current,
                    { dayOfWeek: day, startTime: "09:00", endTime: "17:00" },
                  ])
                }
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[5px] border border-line-2 px-2.5 py-2 text-[11.5px] leading-none font-semibold text-ink-2 hover:bg-sunken hover:text-ink"
              >
                <Plus aria-hidden="true" className="size-3" />
                Window
              </button>
            </div>
          );
        })}
      </div>

      <footer className="flex flex-wrap items-center gap-2.5 border-t border-line bg-bg px-[18px] py-3">
        <Button
          size="sm"
          variant="primary"
          onClick={save}
          loading={saving}
          loadingLabel="Saving…"
          disabled={invalid}
        >
          Save availability
        </Button>
        <span className="text-[11.5px] leading-[1.4] text-ink-3">
          {invalid
            ? "One window ends before it starts."
            : `${windows.length} windows across the week.`}
        </span>
      </footer>
    </section>
  );
}
