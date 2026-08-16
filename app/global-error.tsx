// app/global-error.tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900 flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-zinc-900">Something went wrong</h2>
          <p className="text-sm text-zinc-600">
            An unexpected error occurred while loading this page.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
