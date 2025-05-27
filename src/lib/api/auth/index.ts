import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

import { hash } from "bcrypt";
import crypto from "crypto";

import { isPublicSignupEnabled } from "@/lib/auth/public-signup";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  type CheckAdminInput,
  CheckAdminInputSchema,
  type PasswordResetInput,
  PasswordResetInputSchema,
  type PasswordResetRequestInput,
  PasswordResetRequestInputSchema,
  type PublicSignupStatusInput,
  PublicSignupStatusInputSchema,
  type RegisterUserInput,
  RegisterUserInputSchema,
} from "./schemas";

const LOG_SOURCE = "AuthAPI";

/**
 * Check if the current user is an admin
 */
export async function checkAdminStatus(
  request: NextRequest,
  input: CheckAdminInput
): Promise<{ isAdmin: boolean }> {
  CheckAdminInputSchema.parse(input);

  logger.info("Checking admin status", {}, LOG_SOURCE);

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      logger.info("No token found when checking admin status", {}, LOG_SOURCE);
      return { isAdmin: false };
    }

    const isAdmin = token.role === "admin";
    logger.info("Checked if user is admin", { isAdmin }, LOG_SOURCE);

    return { isAdmin };
  } catch (error) {
    logger.error(
      "Error checking if user is admin",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    throw new Error("Failed to check admin status");
  }
}

/**
 * Check if public signup is enabled
 */
export async function getPublicSignupStatus(
  input: PublicSignupStatusInput
): Promise<{ enabled: boolean }> {
  PublicSignupStatusInputSchema.parse(input);

  logger.info("Checking public signup status", {}, LOG_SOURCE);

  try {
    const isEnabled = await isPublicSignupEnabled();

    logger.info(
      "Public signup status checked via API",
      { isEnabled },
      LOG_SOURCE
    );

    return { enabled: isEnabled };
  } catch (error) {
    logger.error(
      "Error checking public signup status via API",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    throw new Error("Failed to check public signup status");
  }
}

/**
 * Register a new user
 */
export async function registerUser(
  input: RegisterUserInput
): Promise<{ success: boolean; message: string }> {
  const { email, password, name } = RegisterUserInputSchema.parse(input);

  logger.info("Attempting user registration", { email }, LOG_SOURCE);

  // Check if public signup is enabled
  const publicSignupEnabled = await isPublicSignupEnabled();

  if (!publicSignupEnabled) {
    logger.warn(
      "Registration attempt when public signup is disabled",
      {},
      LOG_SOURCE
    );
    throw new Error("Public registration is disabled");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    logger.warn(
      "Registration attempt with existing email",
      { email },
      LOG_SOURCE
    );
    throw new Error("User with this email already exists");
  }

  // Hash the password
  const hashedPassword = await hash(password, 10);

  // Create the user
  const user = await prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0], // Use part of email as name if not provided
      accounts: {
        create: {
          type: "credentials",
          provider: "credentials",
          providerAccountId: email,
          id_token: hashedPassword, // Store the hashed password in the id_token field
        },
      },
      userSettings: {
        create: {
          theme: "system",
          timeZone: "UTC",
        },
      },
    },
  });

  logger.info("User registered successfully", { userId: user.id }, LOG_SOURCE);

  return { success: true, message: "User registered successfully" };
}

/**
 * Request a password reset
 */
export async function requestPasswordReset(
  input: PasswordResetRequestInput
): Promise<{ message: string }> {
  const { email } = PasswordResetRequestInputSchema.parse(input);

  logger.info("Password reset requested", { email }, LOG_SOURCE);

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: {
        where: {
          provider: "credentials",
        },
      },
    },
  });

  // Don't reveal if the user exists or not
  if (!user || !user.accounts || user.accounts.length === 0) {
    logger.info(
      "Password reset requested for non-existent user",
      { email },
      LOG_SOURCE
    );
    return {
      message: "If an account exists, you will receive a password reset email",
    };
  }

  // Generate a reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

  // Store the reset token
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt: resetTokenExpiry,
    },
  });

  // Send the password reset email
  await sendPasswordResetEmail({
    email: user.email!,
    name: user.name || "there",
    resetToken,
    expirationDate: resetTokenExpiry,
  });

  return {
    message: "If an account exists, you will receive a password reset email",
  };
}

/**
 * Reset password using a valid token
 */
export async function resetPassword(
  input: PasswordResetInput
): Promise<{ message: string }> {
  const { token, password } = PasswordResetInputSchema.parse(input);

  logger.info(
    "Password reset attempt",
    { token: token.substring(0, 8) + "..." },
    LOG_SOURCE
  );

  // Find the reset token
  const resetRequest = await prisma.passwordReset.findFirst({
    where: {
      token,
      expiresAt: {
        gt: new Date(),
      },
      usedAt: null,
    },
    include: {
      user: {
        include: {
          accounts: {
            where: {
              provider: "credentials",
            },
          },
        },
      },
    },
  });

  if (!resetRequest || !resetRequest.user || !resetRequest.user.accounts?.[0]) {
    logger.warn("Invalid or expired reset token used", { token }, LOG_SOURCE);
    throw new Error("Invalid or expired reset token");
  }

  // Hash the new password
  const hashedPassword = await hash(password, 10);

  // Update the password and mark token as used
  await prisma.$transaction([
    prisma.account.update({
      where: {
        id: resetRequest.user.accounts[0].id,
      },
      data: {
        id_token: hashedPassword,
      },
    }),
    prisma.passwordReset.update({
      where: {
        id: resetRequest.id,
      },
      data: {
        usedAt: new Date(),
      },
    }),
  ]);

  logger.info(
    "Password reset successful",
    { userId: resetRequest.userId },
    LOG_SOURCE
  );

  return { message: "Password has been reset successfully" };
}
