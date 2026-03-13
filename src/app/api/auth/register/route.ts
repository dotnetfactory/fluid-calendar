import { NextRequest, NextResponse } from "next/server";

import { hash } from "bcrypt";

import { isPublicSignupEnabled } from "@/lib/auth/public-signup";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "RegisterAPI";

export async function POST(req: NextRequest) {
  try {
    // Check if public signup is enabled
    const publicSignupEnabled = await isPublicSignupEnabled();

    if (!publicSignupEnabled) {
      logger.warn(
        "Registration attempt when public signup is disabled",
        {},
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Public registration is disabled" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      logger.warn("Missing required fields for registration", {}, LOG_SOURCE);
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
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

    logger.info(
      "User registered successfully",
      { userId: user.id },
      LOG_SOURCE
    );

    return NextResponse.json(
      { success: true, message: "User registered successfully" },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      "Error during user registration",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
