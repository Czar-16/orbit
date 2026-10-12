"use client";
import "./globals.css";
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="p-6">
        <h1>Orbit could not load</h1>
        <p>
          Try again. If the problem continues, restart Orbit and check the local
          terminal.
        </p>
        <button
          className="mt-4 min-h-11 rounded-md border border-border px-4"
          onClick={reset}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
