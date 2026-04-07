/**
 * Ambient type declarations for @saas route modules.
 *
 * Shell files in src/app/ dynamically import route handlers and page
 * components via the @saas alias. At runtime, webpack resolves @saas to
 * either saas/src/ (SaaS mode) or src/features/ (OS mode). For
 * TypeScript, tsconfig paths maps @saas/* → src/features/* which
 * covers stubs with detailed types (hooks, services, types, etc.).
 *
 * These wildcard declarations cover the remaining route-level dynamic
 * imports that don't need individual stub files — they only need
 * enough typing for the shell files to compile.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** API route handlers */
declare module "@saas/api/*/route" {
  import { NextRequest } from "next/server";

  type RouteContext = { params: Promise<Record<string, string>> };

  export function GET(
    req: NextRequest,
    context?: RouteContext
  ): Promise<Response>;
  export function POST(
    req: NextRequest,
    context?: RouteContext
  ): Promise<Response>;
  export function PUT(
    req: NextRequest,
    context?: RouteContext
  ): Promise<Response>;
  export function PATCH(
    req: NextRequest,
    context?: RouteContext
  ): Promise<Response>;
  export function DELETE(
    req: NextRequest,
    context?: RouteContext
  ): Promise<Response>;
}

/** API routes nested under page route groups (e.g., (saas)/subscription/.../api/route) */
declare module "@saas/routes/*/route" {
  import { NextRequest } from "next/server";

  type RouteContext = { params: Promise<Record<string, string>> };

  export function GET(
    req: NextRequest,
    context?: RouteContext
  ): Promise<Response>;
  export function POST(
    req: NextRequest,
    context?: RouteContext
  ): Promise<Response>;
  export function PUT(
    req: NextRequest,
    context?: RouteContext
  ): Promise<Response>;
  export function PATCH(
    req: NextRequest,
    context?: RouteContext
  ): Promise<Response>;
  export function DELETE(
    req: NextRequest,
    context?: RouteContext
  ): Promise<Response>;
}

/** Page / layout components */
declare module "@saas/routes/*/page" {
  import { ComponentType } from "react";
  const Component: ComponentType<any>;
  export default Component;
}

declare module "@saas/routes/*/layout" {
  import { ComponentType } from "react";
  const Component: ComponentType<{ children: React.ReactNode }>;
  export default Component;
}
