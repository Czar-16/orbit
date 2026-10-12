export default function Loading() {
  return (
    <div role="status" aria-label="Loading application review">
      <span className="sr-only">Loading application review</span>
      <div className="skeleton mb-6 h-8 w-64 max-w-full" />
      <div
        className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
        aria-hidden="true"
      >
        <section className="panel">
          <div className="skeleton h-6 w-48 max-w-full" />
          <div className="skeleton mt-4 h-80 w-full" />
          <div className="skeleton mt-4 h-11 w-40 max-w-full" />
        </section>
        <section className="panel">
          <div className="skeleton h-6 w-40 max-w-full" />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="skeleton mt-4 h-12 w-full" />
          ))}
        </section>
      </div>
    </div>
  );
}
