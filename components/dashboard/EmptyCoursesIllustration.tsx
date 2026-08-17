// components/dashboard/EmptyCoursesIllustration.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";

export function EmptyCoursesIllustration({ className = "w-64 h-64 sm:w-72 sm:h-72" }: { className?: string }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`relative flex items-center justify-center mx-auto select-none ${className}`}>
      {/* Soft glowing radial background that adapts to light/dark */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-2xl -z-10" />

      {!imageError ? (
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
          {/* Subtle ground shadow */}
          <div className="absolute bottom-2 w-36 h-4 bg-zinc-900/10 dark:bg-black/40 rounded-full blur-md transform scale-y-75" />

          {/* 3D Waving Student Mascot Image */}
          <div className="relative w-full h-full flex items-center justify-center drop-shadow-xl hover:scale-105 transition-transform duration-300">
            <Image
              src="/mascot.jpg"
              alt="Waving Student Mascot"
              width={260}
              height={260}
              className="object-contain max-h-full max-w-full rounded-2xl"
              priority
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          </div>
        </div>
      ) : (
        /* Fallback Vector 3D Stickman Waving */
        <svg
          viewBox="0 0 300 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          {/* Ground shadow */}
          <ellipse cx="150" cy="275" rx="75" ry="10" fill="currentColor" className="text-zinc-300 dark:text-zinc-800" opacity="0.6" />

          {/* Gradients for 3D Shading effect */}
          <defs>
            <radialGradient id="headShading" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#94A3B8" />
            </radialGradient>
            <linearGradient id="bodyShading" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
          </defs>

          {/* Head */}
          <circle cx="165" cy="80" r="38" fill="url(#headShading)" stroke="#CBD5E1" strokeWidth="1" />

          {/* Body / Torso */}
          <path
            d="M150 118 C135 125, 130 155, 132 185 C134 200, 155 205, 168 202 C180 200, 192 180, 190 150 C188 125, 170 118, 150 118 Z"
            fill="url(#bodyShading)"
            stroke="#CBD5E1"
            strokeWidth="1"
          />

          {/* Right Arm (Waving up high) */}
          <path
            d="M138 135 C120 115, 105 85, 95 55 C92 48, 98 42, 104 46 C115 55, 125 75, 142 105 Z"
            fill="url(#bodyShading)"
          />
          {/* Hand waving */}
          <circle cx="95" cy="48" r="12" fill="url(#headShading)" />
          <path d="M85 45 C82 40, 88 34, 94 38" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />

          {/* Left Arm (On hip) */}
          <path
            d="M182 140 C198 150, 205 168, 195 185 C190 192, 180 188, 178 180 C182 172, 182 158, 172 148 Z"
            fill="url(#bodyShading)"
          />
          <circle cx="182" cy="183" r="9" fill="url(#headShading)" />

          {/* Left Leg */}
          <path
            d="M142 198 C138 220, 132 245, 128 265 C126 272, 115 272, 110 268 C105 264, 115 250, 122 230 C128 215, 134 200, 142 198 Z"
            fill="url(#bodyShading)"
          />
          <ellipse cx="120" cy="268" rx="14" ry="7" fill="url(#headShading)" />

          {/* Right Leg */}
          <path
            d="M165 198 C170 218, 178 245, 182 265 C184 272, 195 272, 200 268 C205 264, 195 250, 188 230 C182 215, 174 200, 165 198 Z"
            fill="url(#bodyShading)"
          />
          <ellipse cx="192" cy="268" rx="14" ry="7" fill="url(#headShading)" />
        </svg>
      )}
    </div>
  );
}
