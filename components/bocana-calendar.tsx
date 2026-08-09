'use client';

import { useEffect, useState } from 'react';
import type { PublicLocale } from '@/lib/i18n';

const pad = (value: number) => String(value).padStart(2, '0');
const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function formatBocanaDate(value: string, locale: PublicLocale = 'es', includeYear = false) {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', ...(includeYear ? { year: 'numeric' } : {}) }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

export function BocanaCalendar({ value, min, max, onChange, locale = 'es' }: { value: string; min: string; max: string; onChange: (value: string) => void; locale?: PublicLocale }) {
  const initial = new Date(`${value}T12:00:00`);
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1, 12));
  const minDate = new Date(`${min}T12:00:00`);
  const maxDate = new Date(`${max}T12:00:00`);
  const language = locale === 'es' ? 'es-ES' : 'en-GB';
  const labels = locale === 'es' ? {
    select: 'Selecciona un día', calendar: 'Selecciona una fecha', previous: 'Mes anterior', next: 'Mes siguiente', selected: 'Día seleccionado', realtime: 'La hora se confirma en tiempo real', weekdays: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
  } : {
    select: 'Choose a day', calendar: 'Choose a date', previous: 'Previous month', next: 'Next month', selected: 'Selected day', realtime: 'Time is confirmed in real time', weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  };

  useEffect(() => {
    const selected = new Date(`${value}T12:00:00`);
    setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1, 12));
  }, [value]);

  const rawMonthLabel = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(cursor);
  const monthLabel = rawMonthLabel.charAt(0).toLocaleUpperCase(language) + rawMonthLabel.slice(1);
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12);
  const leading = (first.getDay() + 6) % 7;
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= last.getDate(); day += 1) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day, 12));
  while (cells.length % 7 !== 0) cells.push(null);
  const prevMonth = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12);
  const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
  const canPrev = prevMonth.getFullYear() > minDate.getFullYear() || (prevMonth.getFullYear() === minDate.getFullYear() && prevMonth.getMonth() >= minDate.getMonth());
  const canNext = nextMonth.getFullYear() < maxDate.getFullYear() || (nextMonth.getFullYear() === maxDate.getFullYear() && nextMonth.getMonth() <= maxDate.getMonth());

  return <div className="bocana-calendar" aria-label={labels.calendar}>
    <div className="calendar-toolbar">
      <div><span className="calendar-kicker">{labels.select}</span><strong>{monthLabel}</strong></div>
      <div className="calendar-arrows"><button type="button" aria-label={labels.previous} disabled={!canPrev} onClick={() => setCursor(prevMonth)}><span className="calendar-chevron previous" aria-hidden="true" /></button><button type="button" aria-label={labels.next} disabled={!canNext} onClick={() => setCursor(nextMonth)}><span className="calendar-chevron next" aria-hidden="true" /></button></div>
    </div>
    <div className="calendar-weekdays" aria-hidden="true">{labels.weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
    <div className="calendar-days">{cells.map((day, index) => {
      if (!day) return <span className="calendar-empty" key={`empty-${index}`} />;
      const iso = localDate(day);
      const disabled = day < minDate || day > maxDate;
      const selected = iso === value;
      return <button type="button" key={iso} disabled={disabled} className={selected ? 'selected' : ''} aria-label={formatBocanaDate(iso, locale)} aria-pressed={selected} onClick={() => onChange(iso)}><span>{day.getDate()}</span>{selected && <i />}</button>;
    })}</div>
    <div className="calendar-foot"><span><i className="legend-dot" /> {labels.selected}</span><span>{labels.realtime}</span></div>
  </div>;
}
