export default function ControlLoading() {
  return (
    <div className="control-loading" role="status" aria-live="polite" aria-label="Cargando Control">
      <div className="control-loading-head">
        <span className="control-skeleton control-skeleton-kicker" />
        <span className="control-skeleton control-skeleton-title" />
        <span className="control-skeleton control-skeleton-copy" />
      </div>
      <div className="control-loading-metrics">
        {Array.from({ length: 4 }, (_, index) => <span className="control-skeleton control-skeleton-metric" key={index} />)}
      </div>
      <div className="control-loading-grid">
        <span className="control-skeleton control-skeleton-panel wide" />
        <span className="control-skeleton control-skeleton-panel" />
        <span className="control-skeleton control-skeleton-panel" />
        <span className="control-skeleton control-skeleton-panel wide" />
      </div>
      <span className="sr-only">Cargando datos operativos…</span>
    </div>
  );
}
