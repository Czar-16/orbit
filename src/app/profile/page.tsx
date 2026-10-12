import type { Metadata } from "next";
import { Unavailable, UnknownBadge } from "@/components/unavailable";
export const metadata: Metadata = { title: "Resume & profile" };
export default function Page() {
  return (
    <>
      <div className="page-heading">
        <h1>Resume & profile</h1>
        <p>Resume & profile becomes available in a later phase.</p>
      </div>
      <Unavailable
        title="No resume or verified profile is available."
        description="Private resume upload and profile verification arrive in the resume and profile phase. Unknown facts need your input."
        phase="Resume & profile"
      />
      <p className="mt-4 flex items-center gap-2 text-sm text-text-muted">
        Profile provenance <UnknownBadge /> · Needs your input
      </p>
    </>
  );
}
