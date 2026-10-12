import type { Metadata } from "next";
import { Unavailable } from "@/components/unavailable";
export const metadata: Metadata = { title: "Application queue" };
export default function Page() {
  return (
    <>
      <div className="page-heading">
        <h1>Application queue</h1>
        <p>Application preparation becomes available in a later phase.</p>
      </div>
      <Unavailable
        title="Application preparation is not enabled yet."
        description="Draft review and preparation arrive in the application workflow phase. Nothing has been submitted."
        phase="Application preparation"
      />
    </>
  );
}
