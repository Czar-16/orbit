import type { Metadata } from "next";
import { Unavailable } from "@/components/unavailable";
export const metadata: Metadata = { title: "Discover jobs" };
export default function Page() {
  return (
    <>
      <div className="page-heading">
        <h1>Discover jobs</h1>
        <p>Job intake becomes available in a later phase.</p>
      </div>
      <Unavailable
        title="Job intake is not enabled yet."
        description="Import links, descriptions, or files in the job intake phase. LinkedIn and Indeed intake will be user-driven only."
        phase="Job intake"
      />
    </>
  );
}
