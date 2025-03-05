"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export default function AdminAccessDenied() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-destructive/10 p-4 rounded-full mb-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        You don&apos;t have permission to access this page. This area is
        restricted to administrators only.
      </p>
      <Button onClick={() => router.push("/")}>Return to Home</Button>
    </div>
  );
}
