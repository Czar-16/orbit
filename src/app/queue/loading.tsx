export default function Loading() {
  return (
    <div role="status" aria-label="Loading application queue">
      <span className="sr-only">Loading application queue</span>
      <div className="skeleton mb-6 h-8 w-48 max-w-full" />
      <section className="panel" aria-hidden="true">
        <div className="skeleton mb-4 h-6 w-40 max-w-full" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="border-t border-border py-4">
            <div className="skeleton h-6 w-3/4" />
            <div className="skeleton mt-3 h-4 w-1/2" />
          </div>
        ))}
      </section>
    </div>
  );
}
