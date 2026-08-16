// app/layout.tsx
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://padhaihub.ai"),
  title: {
    default: "PadhaiHub",
    template: "%s | PadhaiHub",
  },
  description:
    "Comprehensive study platform for students: syllabus analysis, PYQ predictions, notes, handwritten assignments, viva prep, and study plans.",
  keywords: ["study", "exam preparation", "notes", "PYQ analysis", "PadhaiHub"],
  authors: [{ name: "PadhaiHub" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/logo-icon.svg",
  },
  openGraph: {
    title: "PadhaiHub",
    description: "Student Study Workspace",
    type: "website",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
