import { z } from "zod";

/**
 * Input schema for checking admin status
 */
export const CheckAdminInputSchema = z.object({
  // No input needed - uses session token
});

/**
 * Input schema for checking public signup status
 */
export const PublicSignupStatusInputSchema = z.object({
  // No input needed - reads from system settings
});

/**
 * Input schema for user registration
 */
export const RegisterUserInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  name: z.string().optional(),
});

/**
 * Input schema for password reset request
 */
export const PasswordResetRequestInputSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * Input schema for password reset
 */
export const PasswordResetInputSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

// Export types
export type CheckAdminInput = z.infer<typeof CheckAdminInputSchema>;
export type PublicSignupStatusInput = z.infer<
  typeof PublicSignupStatusInputSchema
>;
export type RegisterUserInput = z.infer<typeof RegisterUserInputSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof PasswordResetRequestInputSchema
>;
export type PasswordResetInput = z.infer<typeof PasswordResetInputSchema>;
