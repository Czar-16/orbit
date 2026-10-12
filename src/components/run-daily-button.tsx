"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { runDailyAction } from "@/app/discover/discovery-actions";
import { Button } from "@/components/ui/button";
export function RunDailyButton({ available }: { available: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div>
      <Button
        aria-describedby="run-reason"
        disabled={!available || pending}
        variant="ghost"
        onClick={async () => {
          setPending(true);
          try {
            const result = await runDailyAction();
            setMessage(result.message);
            router.refresh();
          } catch {
            setMessage(
              "Request failed. Check the local services and try again.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <Play size={15} aria-hidden="true" />
        {pending ? "Requesting…" : "Run now"}
      </Button>
      {message && (
        <p className="text-sm text-text-muted max-w-xs" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
