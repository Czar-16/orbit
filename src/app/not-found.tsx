import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <section className="panel empty-state">
      <h1>Page not found</h1>
      <p>Use the navigation to open an available workspace page.</p>
      <Button asChild>
        <Link href="/">Back to dashboard</Link>
      </Button>
    </section>
  );
}
