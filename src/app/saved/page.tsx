import type { Metadata } from "next";
import { Unavailable } from "@/components/unavailable";
export const metadata: Metadata = { title: "Saved jobs" };
export default function Page() {
  return (
    <>
      <div className="page-heading">
        <h1>Saved jobs</h1>
        <p>Job intake & saved jobs becomes available in a later phase.</p>
      </div>
      <Unavailable
        title="Saved jobs are unavailable."
        description="Saving and organizing jobs requires the database and job intake workflows."
        phase="Job intake & saved jobs"
      />
    </>
  );
}
