// components/dashboard/EmptyCoursesIllustration.tsx
"use client";

import React from "react";

export function EmptyCoursesIllustration({ className = "w-64 h-64 sm:w-72 sm:h-72" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center mx-auto select-none ${className}`}>
      {/* Soft glowing radial background that adapts to light/dark */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-2xl -z-10" />

      {/* Vector 3D Waving Student Mascot */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center drop-shadow-xl hover:scale-105 transition-transform duration-300">
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
            <linearGradient id="capShading" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#4338CA" />
            </linearGradient>
          </defs>

          {/* Graduation Cap */}
          <polygon points="165,30 205,45 165,60 125,45" fill="url(#capShading)" />
          <rect x="150" y="55" width="30" height="10" rx="3" fill="#312E81" />
          <path d="M165 45 L135 65 L135 78" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="135" cy="78" r="3" fill="#F59E0B" />

          {/* Head */}
          <circle cx="165" cy="90" r="34" fill="url(#headShading)" stroke="#CBD5E1" strokeWidth="1" />
          {/* Cute Face */}
          <circle cx="155" cy="88" r="3" fill="#334155" />
          <circle cx="175" cy="88" r="3" fill="#334155" />
          <path d="M160 98 Q165 104 170 98" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Body / Torso */}
          <path
            d="M150 126 C135 133, 130 160, 132 188 C134 202, 155 207, 168 204 C180 202, 192 182, 190 154 C188 131, 170 126, 150 126 Z"
            fill="url(#bodyShading)"
            stroke="#CBD5E1"
            strokeWidth="1"
          />

          {/* Book in Hand */}
          <rect x="180" y="155" width="26" height="34" rx="3" fill="#4F46E5" transform="rotate(15 180 155)" />
          <rect x="183" y="157" width="22" height="30" rx="2" fill="#EEF2FF" transform="rotate(15 180 155)" />
          <line x1="187" y1="165" x2="201" y2="169" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="189" y1="172" x2="203" y2="176" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />

          {/* Right Arm (Waving up high) */}
          <path
            d="M138 140 C120 120, 105 90, 95 60 C92 53, 98 47, 104 51 C115 60, 125 80, 142 110 Z"
            fill="url(#bodyShading)"
          />
          {/* Hand waving */}
          <circle cx="95" cy="53" r="11" fill="url(#headShading)" />
          <path d="M85 50 C82 45, 88 39, 94 43" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />

          {/* Left Arm (Holding book) */}
          <path
            d="M178 145 C190 152, 198 165, 190 178 C186 182, 180 180, 178 174"
            fill="url(#bodyShading)"
          />
          <circle cx="184" cy="178" r="8" fill="url(#headShading)" />

          {/* Left Leg */}
          <path
            d="M142 202 C138 222, 132 245, 128 265 C126 272, 115 272, 110 268 C105 264, 115 250, 122 230 C128 215, 134 204, 142 202 Z"
            fill="url(#bodyShading)"
          />
          <ellipse cx="120" cy="268" rx="14" ry="7" fill="url(#headShading)" />

          {/* Right Leg */}
          <path
            d="M165 202 C170 220, 178 245, 182 265 C184 272, 195 272, 200 268 C205 264, 195 250, 188 230 C182 215, 174 204, 165 202 Z"
            fill="url(#bodyShading)"
          />
          <ellipse cx="192" cy="268" rx="14" ry="7" fill="url(#headShading)" />
        </svg>
      </div>
    </div>
  );
}

