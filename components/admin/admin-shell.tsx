'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BookingIcon, CalendarIcon, FloorIcon, HomeIcon, SettingsIcon, UsersIcon } from './admin-icons';

const nav = [
  {href:'/admin',label:'Resumen',Icon:HomeIcon},
  {href:'/admin/reservas',label:'Reservas',Icon:BookingIcon},
  {href:'/admin/calendario',label:'Calendario',Icon:CalendarIcon},
  {href:'/admin/sala',label:'Sala',Icon:FloorIcon},
  {href:'/admin/clientes',label:'Clientes',Icon:UsersIcon},
  {href:'/admin/configuracion',label:'Configuración',Icon:SettingsIcon},
];

export function AdminShell({children}:{children:ReactNode}){
  const pathname=usePathname();
  return <div className="admin-app">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span className="admin-monogram">LB</span><div><strong>La Bocana</strong><small>Puerto Banús · Operaciones</small></div></div>
      <nav className="admin-nav" aria-label="Administración">
        {nav.map(({href,label,Icon})=>{
          const active=href==='/admin'?pathname===href:pathname.startsWith(href);
          return <Link key={href} href={href} className={active?'active':''}><Icon/><span>{label}</span></Link>
        })}
      </nav>
      <div className="admin-sidebar-foot"><div className="dev-dot supabase-dot"/><div><strong>Supabase preparado</strong><small>Secret + migraciones pendientes</small></div></div>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar"><div className="admin-mobile-brand">LA BOCANA</div><div className="admin-topbar-context"><span>Operaciones</span><strong>La Bocana · Marbella</strong></div><div className="admin-topbar-right"><span className="admin-system-pill"><i/>Sistema preparado</span><span className="admin-date">Vie · 14 agosto</span><span className="admin-avatar">AM</span></div></header>
      <div className="admin-mobile-nav">{nav.slice(0,5).map(({href,label,Icon})=>{const active=href==='/admin'?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} className={active?'active':''}><Icon/><span>{label}</span></Link>})}</div>
      <main className="admin-content">{children}</main>
    </div>
  </div>
}
