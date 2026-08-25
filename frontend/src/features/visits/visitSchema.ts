import { z } from "zod";
import { SKILLS } from "../../lib/constants";

/**
 * The form works in a date and two clock times because that is how a coordinator says it
 * out loud — "Tuesday, half eleven to half twelve". The two `LocalDateTime` values the
 * API wants are composed on submit, never typed.
 */
export const scheduleVisitSchema = z
  .object({
    clientId: z.string().uuid("Choose a client"),
    date: z.string().min(1, "Choose a date"),
    startTime: z.string().min(1, "Enter a start time"),
    endTime: z.string().min(1, "Enter an end time"),
    requiredSkill: z.enum(SKILLS),
  })
  .refine((values) => values.endTime > values.startTime, {
    path: ["endTime"],
    message: "The visit has to end after it starts",
  });

export type ScheduleVisitFormValues = z.infer<typeof scheduleVisitSchema>;

/** `2026-08-25` + `11:30` → `2026-08-25T11:30:00`, the unzoned form the server parses. */
export function composeLocalDateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}
