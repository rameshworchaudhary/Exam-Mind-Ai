// app/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-6">
        <LogoIcon className="w-8 h-8" />
      </div>
      <h1 className="text-6xl font-bold tracking-tight text-foreground mb-3">404</h1>
      <h2 className="text-xl font-semibold mb-2">Page not found</h2>
      <p className="text-muted-foreground mb-8 max-w-sm text-sm">
        Oops! This page doesn&apos;t exist. Let&apos;s get you back to your study workspace.
      </p>
      <div className="flex gap-3">
        <Link href="/dashboard">
          <Button className="bg-foreground text-background hover:opacity-90 font-medium">
            Go to Dashboard
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Home</Button>
        </Link>
      </div>
    </div>
  );
}
