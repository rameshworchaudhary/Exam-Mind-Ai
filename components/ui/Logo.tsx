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
  className = "w-8 h-8",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
    >
      <defs>
        <linearGradient
          id="react-logo-ring"
          x1="50"
          y1="50"
          x2="462"
          y2="462"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#D946EF" />
        </linearGradient>
        <linearGradient
          id="react-logo-e"
          x1="120"
          y1="180"
          x2="250"
          y2="280"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#93C5FD" />
          <stop offset="80%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient
          id="react-logo-m"
          x1="220"
          y1="260"
          x2="350"
          y2="390"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#E879F9" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
        <linearGradient
          id="react-logo-brain"
          x1="180"
          y1="100"
          x2="340"
          y2="230"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <filter id="react-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Ring */}
      <circle
        cx="256"
        cy="256"
        r="220"
        stroke="url(#react-logo-ring)"
        strokeWidth="16"
        opacity="0.95"
      />

      {/* Silhouette */}
      <path
        d="M 285 102 C 345 102 388 142 388 200 C 388 238 376 256 364 266 C 354 274 354 286 362 296 C 368 304 366 314 356 318 C 344 322 334 328 326 338 L 305 320"
        stroke="#FFFFFF"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.95"
      />

      {/* Brain Synapse Neural Constellation */}
      <g stroke="url(#react-logo-brain)" strokeWidth="3" opacity="0.95">
        <line x1="220" y1="130" x2="250" y2="115" />
        <line x1="250" y1="115" x2="285" y2="125" />
        <line x1="285" y1="125" x2="315" y2="150" />
        <line x1="315" y1="150" x2="325" y2="185" />
        <line x1="325" y1="185" x2="295" y2="215" />
        <line x1="295" y1="215" x2="260" y2="225" />
        <line x1="260" y1="225" x2="225" y2="210" />
        <line x1="225" y1="210" x2="205" y2="175" />
        <line x1="205" y1="175" x2="220" y2="130" />
        <line x1="250" y1="115" x2="265" y2="155" />
        <line x1="265" y1="155" x2="285" y2="125" />
        <line x1="265" y1="155" x2="305" y2="175" />
        <line x1="305" y1="175" x2="315" y2="150" />
        <line x1="305" y1="175" x2="295" y2="215" />
        <line x1="265" y1="155" x2="250" y2="190" />
        <line x1="250" y1="190" x2="225" y2="210" />
        <line x1="235" y1="160" x2="265" y2="155" />

        <circle cx="220" cy="130" r="5" fill="#67E8F9" />
        <circle cx="250" cy="115" r="6" fill="#38BDF8" />
        <circle cx="285" cy="125" r="6" fill="#60A5FA" />
        <circle cx="315" cy="150" r="5" fill="#C084FC" />
        <circle cx="325" cy="185" r="6" fill="#A855F7" />
        <circle cx="295" cy="215" r="5" fill="#E879F9" />
        <circle cx="265" cy="155" r="7" fill="#FFFFFF" filter="url(#react-glow)" />
        <circle cx="250" cy="190" r="6" fill="#818CF8" />
      </g>

      {/* Monogram E */}
      <path
        d="M 130 195 L 245 195 L 225 225 L 155 225 L 155 240 L 220 240 L 205 268 L 155 268 L 155 285 L 235 285 L 220 315 L 130 315 Z"
        fill="url(#react-logo-e)"
      />

      {/* Monogram M */}
      <path
        d="M 230 250 L 275 350 L 320 250 L 365 375 L 330 375 L 305 295 L 275 365 L 245 295 L 220 375 L 185 375 Z"
        fill="url(#react-logo-m)"
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
    sm: { icon: "w-6 h-6", text: "text-base", badge: "text-[10px]" },
    md: { icon: "w-8 h-8", text: "text-lg", badge: "text-xs" },
    lg: { icon: "w-10 h-10", text: "text-2xl", badge: "text-xs" },
    xl: { icon: "w-16 h-16", text: "text-3xl", badge: "text-sm" },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <div className="relative flex items-center justify-center shrink-0">
        <LogoIcon className={currentSize.icon} />
      </div>

      {variant !== "icon" && (
        <div className="flex flex-col">
          <div className="flex items-center tracking-tight leading-none">
            <span className="font-extrabold text-foreground tracking-tight">
              EXAM
            </span>
            <span className="font-extrabold bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent ml-0.5">
              MIND
            </span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
              AI
            </span>
          </div>
          {showTagline && (
            <span className="text-[9px] font-semibold tracking-[0.2em] text-muted-foreground uppercase mt-1">
              Smart Study. Better Results.
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
