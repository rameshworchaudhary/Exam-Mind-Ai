// app/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-xl font-bold mb-2 text-foreground">Something went wrong</h2>
      <p className="text-xs text-muted-foreground mb-4 max-w-sm">
        An error occurred while loading this page. Please try again.
      </p>
      <Button onClick={() => reset()} size="sm">
        Try again
      </Button>
    </div>
  );
}
