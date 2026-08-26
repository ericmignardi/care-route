import { z } from "zod";

/**
 * Constraints mirror the backend DTOs — the server still validates, this only refuses the
 * round trip. Types are derived with z.infer so a schema change cannot leave a stale one.
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

export interface CurrentUser {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
  caregiverId: string | null;
}
