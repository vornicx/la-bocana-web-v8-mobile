'use client';

import { useRouter } from 'next/navigation';
import { DatePicker } from './control-fields';

export function CalendarToolbar({ anchor, previous, next, rangeLabel }: { anchor: string; previous: string; next: string; rangeLabel: string }) {
  const router = useRouter();
  const go = (value: string) => router.push(`/control/calendario?week=${encodeURIComponent(value)}`);
  return <div className="control-calendar-toolbar">
    <button type="button" className="calendar-arrow" onClick={() => go(previous)} aria-label="Semana anterior">‹</button>
    <div className="calendar-range"><span>Semana</span><strong>{rangeLabel}</strong></div>
    <div className="calendar-date-jump"><DatePicker value={anchor} onChange={go} ariaLabel="Ir a una fecha" /></div>
    <button type="button" className="calendar-arrow" onClick={() => go(next)} aria-label="Semana siguiente">›</button>
  </div>;
}
