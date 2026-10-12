export default function Loading() {
  return (
    <div role="status" aria-label="Loading saved jobs">
      <span className="sr-only">Loading saved jobs</span>
      <div className="skeleton mb-6 h-8 w-48" />
      {[0, 1, 2].map((index) => (
        <div className="panel mb-4" key={index}>
          <div className="skeleton h-6 w-48" />
          <div className="form-grid mt-4">
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
