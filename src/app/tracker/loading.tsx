export default function Loading() {
  return (
    <div role="status" aria-label="Loading application tracker">
      <span className="sr-only">Loading application tracker</span>
      <div className="skeleton mb-6 h-8 w-48" />
      <div className="panel">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton mt-4 h-11 w-full" />
        <div className="skeleton mt-4 h-40 w-full" />
        <div className="form-grid mt-4">
          <div className="skeleton h-11" />
          <div className="skeleton h-11" />
        </div>
      </div>
    </div>
  );
}
