export default function Loading() {
  return (
    <div role="status" aria-label="Loading job details">
      <span className="sr-only">Loading job details</span>
      <div className="skeleton mb-6 h-8 w-48" />
      <div className="panel mb-4">
        <div className="skeleton h-6 w-48" />
        <div className="form-grid mt-4">
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
        </div>
      </div>
      <div className="panel">
        <div className="skeleton h-40 w-full" />
      </div>
    </div>
  );
}
