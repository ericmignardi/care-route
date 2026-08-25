import { z } from "zod";

/**
 * Mirrors `ClientRequest` on the server, including its `@Size` caps. The server still
 * validates — this just refuses the round trip and puts the message next to the field.
 */
export const clientSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(100, "100 characters at most"),
  lastName: z.string().trim().min(1, "Enter a last name").max(100, "100 characters at most"),
  phone: z.string().trim().max(30, "30 characters at most").optional().or(z.literal("")),
  addressLine: z.string().trim().min(1, "Enter a street address").max(255, "255 characters at most"),
  city: z.string().trim().min(1, "Enter a city").max(100, "100 characters at most"),
  postalCode: z
    .string()
    .trim()
    .min(1, "Enter a postal code")
    .max(10, "10 characters at most")
    .regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, "Use an Ontario format, e.g. L9G 3L1"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
