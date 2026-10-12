export default function Loading() {
  return (
    <div role="status" aria-label="Loading resume and profile">
      <span className="sr-only">Loading resume and profile</span>
      <div className="skeleton mb-6 h-8 w-48" />
      <div className="panel mb-4">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton mt-4 h-11 w-full" />
      </div>
      <div className="panel form-grid">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index}>
            <div className="skeleton mb-2 h-4 w-32" />
            <div className="skeleton h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
