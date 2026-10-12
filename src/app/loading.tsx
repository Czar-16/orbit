export default function Loading() {
  return (
    <div role="status" aria-label="Loading page">
      <span className="sr-only">Loading page</span>
      <div className="skeleton mb-4 h-8 w-48" />
      <div className="metrics">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="panel h-36">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton mt-4 h-8 w-full" />
          </div>
        ))}
      </div>
      <div className="panel mt-4 h-64">
        <div className="skeleton h-6 w-48" />
      </div>
    </div>
  );
}
