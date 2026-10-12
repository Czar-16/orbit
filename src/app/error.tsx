"use client";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section role="alert" className="panel empty-state">
      <AlertCircle size={28} className="text-danger" aria-hidden="true" />
      <h1>This page could not load</h1>
      <p>
        Try loading the page again. If the problem continues, restart Orbit and
        check your local terminal for details.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
