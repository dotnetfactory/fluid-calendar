import { NextRequest, NextResponse } from "next/server";

import { hash } from "bcrypt";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "ResetPasswordAPI";

// Validation schema for reset request
const resetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

/**
 * POST /api/auth/reset-password/reset
 * Reset password using a valid token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = resetSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid reset password request",
        {
          errors: result.error.errors.map((err) => err.message),
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        {
          error: "Invalid request",
          details: result.error.errors,
        },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

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

    if (
      !resetRequest ||
      !resetRequest.user ||
      !resetRequest.user.accounts?.[0]
    ) {
      logger.warn("Invalid or expired reset token used", { token }, LOG_SOURCE);
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
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

    return NextResponse.json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    logger.error(
      "Error in password reset",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
