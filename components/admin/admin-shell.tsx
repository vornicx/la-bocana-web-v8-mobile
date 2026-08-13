'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import type { StaffSession } from '@/lib/admin/types';
import {
  AnalyticsIcon,
  BookingIcon,
  CalendarIcon,
  CloseIcon,
  CommunicationIcon,
  FloorIcon,
  HomeIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  WaitlistIcon,
} from './admin-icons';

const serviceNav = [
  { href: '/control', label: 'Resumen', description: 'Pulso del servicio', Icon: HomeIcon },
  { href: '/control/reservas', label: 'Reservas', description: 'Llegadas y gestión', Icon: BookingIcon },
  { href: '/control/sala', label: 'Sala', description: 'Mesas en tiempo real', Icon: FloorIcon },
  { href: '/control/espera', label: 'Espera', description: 'Demanda sin mesa', Icon: WaitlistIcon },
  { href: '/control/calendario', label: 'Calendario', description: 'Capacidad y presión', Icon: CalendarIcon },
];

const managementNav = [
  { href: '/control/clientes', label: 'Clientes', description: 'Historial y preferencias', Icon: UsersIcon },
  { href: '/control/carta', label: 'Carta', description: 'Oferta gastronómica', Icon: MenuIcon },
  { href: '/control/analitica', label: 'Analítica', description: 'Rendimiento', Icon: AnalyticsIcon },
  { href: '/control/comunicaciones', label: 'Comunicaciones', description: 'Mensajes al cliente', Icon: CommunicationIcon },
  { href: '/control/configuracion', label: 'Configuración', description: 'Reglas del negocio', Icon: SettingsIcon },
];

const allNav = [...serviceNav, ...managementNav];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'LB';
}

function todayLabel() {
  const text = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());
  return text.replace('.', '');
}

function isActive(pathname: string, href: string) {
  return href === '/control' ? pathname === href : pathname.startsWith(href);
}

export function AdminShell({ children, staff }: { children: ReactNode; staff: StaffSession }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [navigating, setNavigating] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const current = allNav.find((item) => isActive(pathname, item.href)) ?? serviceNav[0];
  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    setNavigating(false);
  }, [routeKey]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;
    setQuery('');
    const timer = window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [paletteOpen]);

  const commands = useMemo(() => {
    const navigation = allNav.map((item) => ({
      id: item.href,
      label: item.label,
      description: item.description,
      href: item.href,
      Icon: item.Icon,
      group: 'Ir a',
    }));
    const actions = [
      { id: 'new-reservation', label: 'Nueva reserva', description: 'Crear una reserva manual con disponibilidad real', href: '/control/reservas?new=1', Icon: PlusIcon, group: 'Acciones' },
      { id: 'unassigned', label: 'Reservas sin mesa', description: 'Asignar reservas pendientes directamente desde el plano', href: '/control/sala', Icon: FloorIcon, group: 'Acciones' },
      { id: 'floor', label: 'Abrir sala', description: 'Ver ocupación y mover mesas', href: '/control/sala', Icon: FloorIcon, group: 'Acciones' },
      { id: 'waitlist', label: 'Gestionar lista de espera', description: 'Resolver demanda pendiente', href: '/control/espera', Icon: WaitlistIcon, group: 'Acciones' },
    ];
    const normalized = query.trim().toLowerCase();
    return [...actions, ...navigation].filter((item) => !normalized || `${item.label} ${item.description}`.toLowerCase().includes(normalized));
  }, [query]);

  function go(href: string) {
    setPaletteOpen(false);
    setNavigating(true);
    router.push(href);
  }

  function handleCommandKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && commands[0]) {
      event.preventDefault();
      go(commands[0].href);
    }
  }

  function NavGroup({ label, items }: { label: string; items: typeof serviceNav }) {
    return <div className="control-nav-group">
      <span className="control-nav-label">{label}</span>
      <nav className="admin-nav" aria-label={label}>
        {items.map(({ href, label: itemLabel, Icon }) => (
          <Link key={href} href={href} prefetch className={isActive(pathname, href) ? 'active' : ''} onNavigate={() => setNavigating(true)}>
            <Icon />
            <span>{itemLabel}</span>
          </Link>
        ))}
      </nav>
    </div>;
  }

  return <div className="admin-app control-app">
    <aside className="admin-sidebar control-sidebar">
      <Link href="/control" prefetch className="control-brand" aria-label="La Bocana Control · Inicio" onNavigate={() => setNavigating(true)}>
        <span className="control-monogram">LB</span>
        <div><strong>La Bocana</strong><small>Control</small></div>
      </Link>

      <button className="control-new-reservation" onClick={() => go('/control/reservas?new=1')}>
        <PlusIcon />
        <span>Nueva reserva</span>
      </button>

      <div className="control-nav-scroll">
        <NavGroup label="Servicio" items={serviceNav} />
        <NavGroup label="Gestión" items={managementNav} />
      </div>

      <div className="control-sidebar-status">
        <span className="control-live-dot" />
        <div><strong>Control conectado</strong><small>Datos operativos en vivo</small></div>
      </div>
    </aside>

    <div className="admin-main control-main">
      <header className="admin-topbar control-topbar">
        <div className={`control-route-progress ${navigating ? 'active' : ''}`} aria-hidden="true"><i /></div>
        <div className="control-topbar-context">
          <span>La Bocana · Puerto Banús</span>
          <strong>{current.label}</strong>
        </div>

        <button className="control-command-trigger" onClick={() => setPaletteOpen(true)} aria-label="Abrir búsqueda y comandos">
          <SearchIcon />
          <span>Buscar o ejecutar…</span>
          <kbd>⌘ K</kbd>
        </button>

        <div className="admin-topbar-right control-topbar-right">
          <span className="control-system-pill"><i />En vivo</span>
          <span className="admin-date">{todayLabel()}</span>
          <div className="admin-profile control-profile">
            <span className="admin-avatar">{initials(staff.fullName)}</span>
            <div><strong>{staff.fullName}</strong><small>{staff.role === 'manager' ? 'Manager' : staff.role === 'host' ? 'Host' : staff.role === 'editor' ? 'Editor' : 'Consulta'}</small></div>
            <form action="/auth/signout" method="post"><button type="submit" aria-label="Cerrar sesión">Salir</button></form>
          </div>
        </div>
      </header>

      <main className={`admin-content control-content ${navigating ? 'is-navigating' : ''}`} id="main-content">{children}</main>

      <nav className="control-mobile-nav" aria-label="Navegación móvil">
        {serviceNav.slice(0, 4).map(({ href, label, Icon }) => <Link key={href} href={href} prefetch onNavigate={() => setNavigating(true)} className={isActive(pathname, href) ? 'active' : ''}><Icon /><span>{label}</span></Link>)}
        <button onClick={() => setPaletteOpen(true)}><SearchIcon /><span>Más</span></button>
      </nav>
    </div>

    {paletteOpen && <div className="control-command-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setPaletteOpen(false); }}>
      <section className="control-command-palette" role="dialog" aria-modal="true" aria-label="Buscar o ejecutar una acción">
        <header>
          <SearchIcon />
          <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleCommandKeyDown} placeholder="Reserva, sala, cliente, configuración…" />
          <button onClick={() => setPaletteOpen(false)} aria-label="Cerrar"><CloseIcon /></button>
        </header>
        <div className="control-command-results">
          {commands.length ? commands.map(({ id, label, description, href, Icon, group }, index) => (
            <button key={id} onClick={() => go(href)}>
              <span className="control-command-icon"><Icon /></span>
              <div><small>{group}</small><strong>{label}</strong><p>{description}</p></div>
              {index === 0 && <kbd>↵</kbd>}
            </button>
          )) : <div className="control-command-empty">No hay acciones que coincidan con la búsqueda.</div>}
        </div>
        <footer><span><kbd>⌘K</kbd> abrir</span><span><kbd>Esc</kbd> cerrar</span><span>Control · Archic</span></footer>
      </section>
    </div>}
  </div>;
}
