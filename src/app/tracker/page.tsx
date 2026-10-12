import type { Metadata } from "next";
import { Unavailable } from "@/components/unavailable";
export const metadata: Metadata = { title: "Application tracker" };
export default function Page() {
  return (
    <>
      <div className="page-heading">
        <h1>Application tracker</h1>
        <p>Application tracking becomes available in a later phase.</p>
      </div>
      <Unavailable
        title="Application tracking is unavailable."
        description="Tracking requires stored applications. Applied status will require your manual confirmation or a trustworthy authorized integration result."
        phase="Application tracking"
      />
    </>
  );
}
