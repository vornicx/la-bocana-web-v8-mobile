export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup${compact ? ' compact' : ''}`} aria-hidden="true">
      <svg className="brand-sail" viewBox="0 0 64 64" focusable="false">
        <circle cx="32" cy="31" r="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M31 13v28H17c6-4 10-11 14-28Z" fill="currentColor" />
        <path d="M34 17v24h14c-3-8-8-16-14-24Z" fill="currentColor" opacity=".72" />
        <path d="M14 45c10 3 25 3 36 0M19 50c8 2 19 2 27 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span><strong>LA BOCANA</strong><small style={{ fontSize: 9 }}>PUERTO BANÚS</small></span>
    </span>
  );
}
