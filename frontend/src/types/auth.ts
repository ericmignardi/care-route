import { z } from "zod";

/**
 * Zod schemas are the single source of truth for the auth forms: the TypeScript types
 * below are derived with z.infer rather than declared alongside, so a schema change
 * cannot leave a stale type behind.
 *
 * Constraints mirror the backend DTOs (LoginRequest, RegisterRequest) — the server
 * still validates, this just refuses the round trip.
 */
export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter a first name").max(100, "100 characters at most"),
    lastName: z.string().trim().min(1, "Enter a last name").max(100, "100 characters at most"),
    username: z.string().trim().min(1, "Choose a username").max(100, "100 characters at most"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(100, "100 characters at most"),
    confirmPassword: z.string().min(1, "Repeat the password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords do not match",
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/** GET /auth/me. `caregiverId` is non-null only for accounts with a caregiver profile. */
export interface CurrentUser {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
  caregiverId: string | null;
}
