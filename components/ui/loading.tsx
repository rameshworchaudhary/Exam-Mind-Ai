// components/ui/loading.tsx
"use client";

import { LogoIcon } from "@/components/ui/Logo";

export function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-border rounded-xl" />
        <div className="w-12 h-12 border-2 border-foreground border-t-transparent rounded-xl animate-spin absolute inset-0" />
        <div className="absolute inset-0 flex items-center justify-center">
          <LogoIcon className="w-6 h-6" />
        </div>
      </div>
      <div className="text-center">
        <p className="font-bold text-sm tracking-tight text-foreground">PadhaiHub</p>
        <p className="text-xs text-muted-foreground mt-1">Loading your workspace...</p>
      </div>
    </div>
  );
}

export function SpinnerLoader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-4 h-4 border-2", md: "w-6 h-6 border-2", lg: "w-8 h-8 border-3" };
  return (
    <div className={`${sizes[size]} border-current border-t-transparent rounded-full animate-spin`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-4/5 bg-muted rounded" />
        <div className="h-3 w-3/5 bg-muted rounded" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-muted rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-muted mb-3" />
            <div className="h-5 w-16 bg-muted rounded mb-1" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 h-64">
          <div className="h-5 w-40 bg-muted rounded mb-4" />
          <div className="h-40 bg-muted rounded-lg" />
        </div>
        <div className="bg-card border border-border rounded-xl p-6 h-64">
          <div className="h-5 w-32 bg-muted rounded mb-4" />
          <div className="h-40 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}
