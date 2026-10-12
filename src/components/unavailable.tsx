import Link from "next/link";
import { Database, ArrowRight, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Unavailable({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <section className="panel empty-state">
      <Database size={28} className="text-text-muted" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="phase-badge">Later phase · {phase}</span>
      <Button asChild variant="secondary">
        <Link href="/settings">
          View setup status
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
export function UnknownBadge() {
  return (
    <span className="unknown-badge">
      <CircleHelp size={12} aria-hidden="true" />
      Unknown
    </span>
  );
}
