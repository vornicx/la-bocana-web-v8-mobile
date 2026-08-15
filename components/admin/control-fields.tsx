'use client';

import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';

type Option = { value: string; label: string; description?: string };

type FloatingPosition = { top: number; left: number; width: number; maxHeight: number };

function useFloating(open: boolean, width = 280) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<FloatingPosition>({ top: 0, left: 0, width, maxHeight: 360 });
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = Math.min(width, window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - panelWidth - 12);
      const measuredHeight = panelRef.current?.getBoundingClientRect().height ?? 360;
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - 12);
      const spaceAbove = Math.max(0, rect.top - 12);
      const openAbove = measuredHeight > spaceBelow && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, openAbove ? spaceAbove : spaceBelow);
      const visibleHeight = Math.min(measuredHeight, maxHeight);
      const top = openAbove ? Math.max(12, rect.top - visibleHeight - 8) : rect.bottom + 8;
      setPosition({ top, left, width: panelWidth, maxHeight });
    };
    update();
    const frame = window.requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, width]);
  return { triggerRef, panelRef, position };
}

function Chevron({ open = false }: { open?: boolean }) {
  return <svg className={open ? 'is-open' : ''} viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>;
}

function CalendarGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/></svg>;
}

export function ControlSelect({ value, options, onChange, disabled = false, placeholder = 'Seleccionar', name, ariaLabel }: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const { triggerRef, panelRef: listRef, position } = useFloating(open, 320);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const node = event.target as Node;
      if (triggerRef.current?.contains(node) || listRef.current?.contains(node)) return;
      setOpen(false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [open, triggerRef]);

  return <div className="lb-field lb-select">
    {name && <input type="hidden" name={name} value={value} />}
    <button ref={triggerRef} type="button" className="lb-field-trigger" disabled={disabled} onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}>
      <span className={!selected ? 'placeholder' : ''}>{selected?.label ?? placeholder}</span>
      <Chevron open={open} />
    </button>
    {open && typeof document !== 'undefined' && createPortal(
      <div ref={listRef} className="lb-popover lb-select-popover" style={position} role="listbox" aria-label={ariaLabel}>
        {options.map((option) => <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? 'selected' : ''} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}>
          <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
          {option.value === value && <i>✓</i>}
        </button>)}
      </div>, document.body
    )}
  </div>;
}

function timeOptions(step: number, start = '00:00', end = '23:45') {
  const toMinutes = (value: string) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
  const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const values: string[] = [];
  for (let minutes = toMinutes(start); minutes <= toMinutes(end); minutes += step) values.push(format(minutes));
  return values;
}

export function TimePicker({ value, onChange, disabled = false, step = 15, min = '00:00', max = '23:45', ariaLabel }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  step?: number;
  min?: string;
  max?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const { triggerRef, panelRef, position } = useFloating(open, 280);
  const options = useMemo(() => timeOptions(step, min, max), [step, min, max]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const node = event.target as Node;
      if (triggerRef.current?.contains(node) || panelRef.current?.contains(node)) return;
      setOpen(false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [open, triggerRef]);

  return <div className="lb-field lb-time-picker">
    <button ref={triggerRef} type="button" className="lb-field-trigger lb-time-trigger" disabled={disabled} onClick={() => setOpen((current) => !current)} aria-label={ariaLabel} aria-expanded={open}>
      <span>{value || '—:—'}</span><ClockIcon />
    </button>
    {open && typeof document !== 'undefined' && createPortal(
      <div ref={panelRef} className="lb-popover lb-time-popover" style={position}>
        <header><span>Seleccionar hora</span><strong>{value || 'Sin hora'}</strong></header>
        <div className="lb-time-grid">{options.map((time) => <button type="button" key={time} className={time === value ? 'selected' : ''} onClick={() => { onChange(time); setOpen(false); }}>{time}</button>)}</div>
      </div>, document.body
    )}
  </div>;
}

export function NumberStepper({ value, onChange, min = 0, max = 9999, step = 1, disabled = false, suffix, name, compact = false, ariaLabel }: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  suffix?: string;
  name?: string;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return <div className={`lb-stepper ${compact ? 'compact' : ''}`} aria-label={ariaLabel}>
    {name && <input type="hidden" name={name} value={value} />}
    <button type="button" disabled={disabled || value <= min} onClick={() => onChange(clamp(value - step))} aria-label="Reducir">−</button>
    <span><strong>{value}</strong>{suffix && <small>{suffix}</small>}</span>
    <button type="button" disabled={disabled || value >= max} onClick={() => onChange(clamp(value + step))} aria-label="Aumentar">+</button>
  </div>;
}

export function ControlToggle({ checked, onChange, disabled = false, label, description }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
}) {
  return <button type="button" className={`lb-toggle-card ${checked ? 'active' : ''}`} role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}>
    <span className="lb-toggle-track"><i /></span>
    <span className="lb-toggle-copy"><strong>{label}</strong>{description && <small>{description}</small>}</span>
  </button>;
}

function pad(value: number) { return String(value).padStart(2, '0'); }
function dateKey(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function parseLocal(value: string) {
  const [datePart = '', timePart = ''] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  return { year: year || new Date().getFullYear(), month: (month || 1) - 1, day: day || 1, time: timePart.slice(0, 5) || '12:00' };
}

export function DateTimePicker({ value, onChange, disabled = false, ariaLabel }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const parsed = parseLocal(value);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => new Date(parsed.year, parsed.month, 1));
  const [draftDate, setDraftDate] = useState(() => value ? value.split('T')[0] : '');
  const [draftTime, setDraftTime] = useState(() => parsed.time);
  const { triggerRef, panelRef, position } = useFloating(open, 390);

  useEffect(() => {
    if (!open) return;
    const next = parseLocal(value);
    setCursor(new Date(next.year, next.month, 1));
    setDraftDate(value ? value.split('T')[0] : '');
    setDraftTime(next.time);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const node = event.target as Node;
      if (triggerRef.current?.contains(node) || panelRef.current?.contains(node)) return;
      setOpen(false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [open, triggerRef]);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const mondayIndex = (first.getDay() + 6) % 7;
    const start = new Date(first); start.setDate(first.getDate() - mondayIndex);
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  }, [cursor]);

  const display = value ? new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'Seleccionar fecha y hora';
  const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(cursor);
  const today = dateKey(new Date());

  function apply() {
    if (!draftDate) return;
    onChange(`${draftDate}T${draftTime}`);
    setOpen(false);
  }

  return <div className="lb-field lb-datetime-picker">
    <button ref={triggerRef} type="button" className="lb-field-trigger lb-date-trigger" disabled={disabled} onClick={() => setOpen((current) => !current)} aria-label={ariaLabel} aria-expanded={open}>
      <span className={!value ? 'placeholder' : ''}>{display}</span><CalendarGlyph />
    </button>
    {open && typeof document !== 'undefined' && createPortal(
      <div ref={panelRef} className="lb-popover lb-datetime-popover" style={position}>
        <div className="lb-calendar-head"><button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button><strong>{monthLabel}</strong><button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button></div>
        <div className="lb-calendar-weekdays">{['L','M','X','J','V','S','D'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="lb-calendar-grid">{days.map((day) => {
          const key = dateKey(day);
          const outside = day.getMonth() !== cursor.getMonth();
          return <button type="button" key={key} className={`${key === draftDate ? 'selected' : ''} ${key === today ? 'today' : ''} ${outside ? 'outside' : ''}`} onClick={() => setDraftDate(key)}>{day.getDate()}</button>;
        })}</div>
        <div className="lb-calendar-time"><span>Hora</span><div className="lb-calendar-time-list">{timeOptions(30, '08:00', '23:30').map((time) => <button type="button" key={time} className={draftTime === time ? 'selected' : ''} onClick={() => setDraftTime(time)}>{time}</button>)}</div></div>
        <footer><button type="button" className="quiet" onClick={() => setOpen(false)}>Cancelar</button><button type="button" className="confirm" disabled={!draftDate} onClick={apply}>Aplicar</button></footer>
      </div>, document.body
    )}
  </div>;
}

export function DatePicker({ value, onChange, disabled = false, ariaLabel }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const parsed = value ? new Date(`${value}T12:00:00`) : new Date();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  const { triggerRef, panelRef, position } = useFloating(open, 330);

  useEffect(() => {
    if (!open) return;
    const next = value ? new Date(`${value}T12:00:00`) : new Date();
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [open, value]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const node = event.target as Node;
      if (triggerRef.current?.contains(node) || panelRef.current?.contains(node)) return;
      setOpen(false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [open, triggerRef]);
  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first); start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  }, [cursor]);
  const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(cursor);
  const display = value ? new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(parsed).replace('.', '') : 'Seleccionar fecha';
  return <div className="lb-field lb-date-picker">
    <button ref={triggerRef} type="button" className="lb-field-trigger lb-date-trigger" disabled={disabled} onClick={() => setOpen((current) => !current)} aria-label={ariaLabel} aria-expanded={open}><span>{display}</span><CalendarGlyph /></button>
    {open && typeof document !== 'undefined' && createPortal(<div ref={panelRef} className="lb-popover lb-date-popover" style={position}>
      <div className="lb-calendar-head"><button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button><strong>{monthLabel}</strong><button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button></div>
      <div className="lb-calendar-weekdays">{['L','M','X','J','V','S','D'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="lb-calendar-grid">{days.map((day) => { const key = dateKey(day); return <button type="button" key={key} className={`${key === value ? 'selected' : ''} ${day.getMonth() !== cursor.getMonth() ? 'outside' : ''}`} onClick={() => { onChange(key); setOpen(false); }}>{day.getDate()}</button>; })}</div>
    </div>, document.body)}
  </div>;
}
