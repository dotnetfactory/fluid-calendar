import { randomBytes } from "crypto";

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { hashApiKey } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * Session-only auth for key management endpoints.
 * API keys cannot manage other API keys (prevents self-replication).
 */
async function requireSession(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.sub) {
    return { response: new NextResponse("Unauthorized", { status: 401 }) };
  }

  return { userId: token.sub };
}

/**
 * GET /api/api-keys — List all API keys for the authenticated user
 */
export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ("response" in auth) {
    return auth.response;
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: auth.userId },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsed: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

/**
 * POST /api/api-keys — Create a new API key
 * Returns the raw key only once in the response
 */
export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ("response" in auth) {
    return auth.response;
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  if (name.trim().length > 100) {
    return NextResponse.json(
      { error: "Name must be 100 characters or less" },
      { status: 400 }
    );
  }

  // Generate a random API key: fc_ prefix + 40 hex chars
  const rawKey = `fc_${randomBytes(20).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);
  const prefix = rawKey.slice(0, 11); // "fc_" + first 8 hex chars

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: auth.userId,
      keyHash,
      name: name.trim(),
      prefix,
    },
  });

  return NextResponse.json(
    {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key: rawKey, // Only returned once
      createdAt: apiKey.createdAt,
    },
    { status: 201 }
  );
}

/**
 * DELETE /api/api-keys — Delete an API key
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireSession(request);
  if ("response" in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Key ID is required" },
      { status: 400 }
    );
  }

  // Verify the key belongs to this user
  const key = await prisma.apiKey.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!key) {
    return NextResponse.json(
      { error: "API key not found" },
      { status: 404 }
    );
  }

  await prisma.apiKey.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
