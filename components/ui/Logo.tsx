// components/ui/Logo.tsx
import React from "react";
import Link from "next/link";
import { cn } from "@/utils";

interface LogoProps {
  variant?: "full" | "icon" | "stacked";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  href?: string;
  showTagline?: boolean;
}

export function LogoIcon({
  className = "w-7 h-7",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
    >
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="22"
        className="fill-foreground"
      />
      {/* Abstract geometric 'P' & 'H' intersecting education icon */}
      <path
        d="M28 28H48C56.8366 28 64 35.1634 64 44C64 52.8366 56.8366 60 48 60H28V28Z"
        fill="currentColor"
        className="text-background"
      />
      <rect
        x="38"
        y="38"
        width="10"
        height="12"
        rx="3"
        className="fill-foreground"
      />
      <path
        d="M28 60V72M62 44V72M46 60V72"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        className="text-background"
      />
      <circle
        cx="72"
        cy="28"
        r="5"
        className="fill-indigo-500"
      />
    </svg>
  );
}

export function Logo({
  variant = "full",
  size = "md",
  className = "",
  href,
  showTagline = false,
}: LogoProps) {
  const sizeMap = {
    sm: { icon: "w-6 h-6", text: "text-sm", space: "tracking-tight" },
    md: { icon: "w-7 h-7", text: "text-base", space: "tracking-tight" },
    lg: { icon: "w-9 h-9", text: "text-xl", space: "tracking-tight" },
    xl: { icon: "w-12 h-12", text: "text-2xl", space: "tracking-tight" },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <div className="relative flex items-center justify-center shrink-0">
        <LogoIcon className={currentSize.icon} />
      </div>

      {variant !== "icon" && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center leading-none">
            <span className={cn("font-bold text-foreground", currentSize.text, currentSize.space)}>
              PadhaiHub
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase mt-1">
              Study Smarter
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none group">
        {content}
      </Link>
    );
  }

  return content;
}
