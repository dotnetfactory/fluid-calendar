"use client";

import { useRouter } from "next/navigation";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminAccessDenied() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="mb-4 rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">Access Denied</h1>
      <p className="mb-6 max-w-md text-center text-muted-foreground">
        You don&apos;t have permission to access this page. This area is
        restricted to administrators only.
      </p>
      <Button onClick={() => router.push("/")}>Return to Home</Button>
    </div>
  );
}
