import { compare } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { isPublicSignupEnabled } from "./public-signup";

const LOG_SOURCE = "CredentialsProvider";

/**
 * Authenticates a user with email and password
 * @param email User's email
 * @param password User's password
 * @returns User object if authentication is successful, null otherwise
 */
export async function authenticateUser(email: string, password: string) {
  try {
    // Find the user by email
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

    // If user doesn't exist, return null
    if (!user || !user.accounts || user.accounts.length === 0) {
      logger.warn(
        "Authentication failed: User not found",
        { email },
        LOG_SOURCE
      );
      return null;
    }

    // Get the credentials account
    const credentialsAccount = user.accounts.find(
      (account) => account.provider === "credentials"
    );

    // If no credentials account exists, return null
    if (!credentialsAccount || !credentialsAccount.id_token) {
      logger.warn(
        "Authentication failed: No credentials account found",
        { email },
        LOG_SOURCE
      );
      return null;
    }

    // Compare the provided password with the stored hash
    const passwordMatch = await compare(password, credentialsAccount.id_token);

    if (!passwordMatch) {
      logger.warn(
        "Authentication failed: Invalid password",
        { email },
        LOG_SOURCE
      );
      return null;
    }

    logger.info(
      "User authenticated successfully",
      { userId: user.id },
      LOG_SOURCE
    );

    // Return the user without the accounts
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accounts, ...userWithoutAccounts } = user;
    return userWithoutAccounts;
  } catch (error) {
    logger.error(
      "Error authenticating user",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        email,
      },
      LOG_SOURCE
    );
    return null;
  }
}

/**
 * Checks if public signup is enabled
 * @returns Whether public signup is enabled
 */
export async function canSignUp() {
  return await isPublicSignupEnabled();
}
