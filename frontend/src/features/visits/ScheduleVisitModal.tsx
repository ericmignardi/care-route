import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select } from "../../components/ui";
import { visitsApi } from "../../api/visits";
import { clientsApi } from "../../api/clients";
import { errorMessage, fieldErrors } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { toast } from "../../stores/toastStore";
import { SKILLS, SKILL_LABELS } from "../../lib/constants";
import { toDateParam } from "../../lib/dates";
import {
  composeLocalDateTime,
  scheduleVisitSchema,
  type ScheduleVisitFormValues,
} from "./visitSchema";
import type { ClientSummary, VisitDetail } from "../../types/domain";

/**
 * Creates the visit unassigned. Assignment is a separate decision with its own screen —
 * folding "who takes it" into this form would mean either hiding the ineligible
 * caregivers or showing eleven refusals inside a create dialog, and the refusals are the
 * part worth reading. The caller opens the assign flow on the visit that comes back.
 */
export function ScheduleVisitModal({
  open,
  client,
  defaultDate,
  onClose,
  onScheduled,
}: {
  open: boolean;
  /** Fixed when opened from a client's page; otherwise the form offers a picker. */
  client?: ClientSummary | null;
  defaultDate?: Date;
  onClose: () => void;
  onScheduled: (visit: VisitDetail) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleVisitFormValues>({ resolver: zodResolver(scheduleVisitSchema) });

  // Only fetched when the picker is actually needed. Capped at the server's maximum page
  // size; a real deployment would want a typeahead, and this is the honest simple version.
  const clientOptions = useAsync(
    () =>
      open && !client
        ? clientsApi.list({ status: "ACTIVE", size: 100 })
        : Promise.resolve(null),
    `client-options ${open} ${client?.id ?? ""}`,
  );

  const options = useMemo(
    () =>
      (clientOptions.data?.content ?? []).map((entry) => ({
        value: entry.id,
        label: `${entry.lastName}, ${entry.firstName} — ${entry.city}`,
      })),
    [clientOptions.data],
  );

  useEffect(() => {
    if (!open) return;
    reset({
      clientId: client?.id ?? "",
      date: toDateParam(defaultDate ?? new Date()),
      startTime: "09:00",
      endTime: "10:00",
      requiredSkill: "PERSONAL_SUPPORT",
    });
  }, [open, client, defaultDate, reset]);

  async function onSubmit(values: ScheduleVisitFormValues) {
    try {
      const visit = await visitsApi.schedule({
        clientId: values.clientId,
        scheduledStart: composeLocalDateTime(values.date, values.startTime),
        scheduledEnd: composeLocalDateTime(values.date, values.endTime),
        requiredSkill: values.requiredSkill,
      });

      toast.success(
        "Visit scheduled",
        `${visit.client.firstName} ${visit.client.lastName} · ${values.startTime}\u2013${values.endTime}. Nobody is assigned yet.`,
      );
      onScheduled(visit);
      onClose();
    } catch (error) {
      const fields = fieldErrors(error);
      Object.entries(fields).forEach(([key, message]) => {
        setError(key as keyof ScheduleVisitFormValues, { message });
      });
      if (Object.keys(fields).length === 0) {
        toast.error("Could not schedule this visit", errorMessage(error));
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule a visit"
      subtitle={
        client
          ? `${client.firstName} ${client.lastName} · the client's care plan is copied onto the visit as it is scheduled.`
          : "The client's care plan is copied onto the visit as it is scheduled, so editing the plan later cannot rewrite history."
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
            loadingLabel="Scheduling…"
          >
            Schedule &amp; choose caregiver
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5" noValidate>
        {client ? (
          <div className="rounded-[5px] border border-line bg-sunken px-3.5 py-2.5">
            <div className="label-caps text-[9.5px] text-ink-3">Client</div>
            <div className="mt-1 text-[13px] font-semibold text-ink">
              {client.firstName} {client.lastName}
            </div>
            <div className="text-[11.5px] text-ink-2">{client.city}</div>
            <input type="hidden" {...register("clientId")} />
          </div>
        ) : (
          <Select
            label="Client"
            required
            placeholder={clientOptions.loading ? "Loading clients…" : "Choose a client"}
            options={options}
            error={errors.clientId?.message}
            {...register("clientId")}
          />
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Input label="Date" type="date" required error={errors.date?.message} {...register("date")} />
          <Input
            label="Start"
            type="time"
            required
            step={900}
            error={errors.startTime?.message}
            {...register("startTime")}
          />
          <Input
            label="End"
            type="time"
            required
            step={900}
            error={errors.endTime?.message}
            {...register("endTime")}
          />
        </div>

        <Select
          label="Required skill"
          required
          hint="Only caregivers holding this skill can be assigned (BR-3)."
          options={SKILLS.map((skill) => ({ value: skill, label: SKILL_LABELS[skill] }))}
          error={errors.requiredSkill?.message}
          {...register("requiredSkill")}
        />

        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
}
