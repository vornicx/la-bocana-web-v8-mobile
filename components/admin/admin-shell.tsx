'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { StaffSession } from '@/lib/admin/types';
import { BookingIcon, CalendarIcon, FloorIcon, HomeIcon, SettingsIcon, UsersIcon } from './admin-icons';

const nav = [
  {href:'/admin',label:'Resumen',Icon:HomeIcon},
  {href:'/admin/reservas',label:'Reservas',Icon:BookingIcon},
  {href:'/admin/calendario',label:'Calendario',Icon:CalendarIcon},
  {href:'/admin/sala',label:'Sala',Icon:FloorIcon},
  {href:'/admin/clientes',label:'Clientes',Icon:UsersIcon},
  {href:'/admin/configuracion',label:'Configuración',Icon:SettingsIcon},
];

function initials(name:string){
  return name.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join('') || 'LB';
}

function todayLabel(){
  const text = new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',weekday:'short',day:'numeric',month:'short'}).format(new Date());
  return text.replace('.', '');
}

export function AdminShell({children,staff}:{children:ReactNode;staff:StaffSession}){
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
      <div className="admin-sidebar-foot"><div className="dev-dot supabase-dot live"/><div><strong>Backend operativo</strong><small>Supabase conectado</small></div></div>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar"><div className="admin-mobile-brand">LA BOCANA</div><div className="admin-topbar-context"><span>Operaciones</span><strong>La Bocana · Marbella</strong></div><div className="admin-topbar-right"><span className="admin-system-pill live"><i/>Sistema conectado</span><span className="admin-date">{todayLabel()}</span><div className="admin-profile"><span className="admin-avatar">{initials(staff.fullName)}</span><div><strong>{staff.fullName}</strong><small>{staff.role === 'manager' ? 'Manager' : staff.role === 'host' ? 'Host' : staff.role === 'editor' ? 'Editor' : 'Consulta'}</small></div><form action="/auth/signout" method="post"><button type="submit" aria-label="Cerrar sesión">Salir</button></form></div></div></header>
      <div className="admin-mobile-nav">{nav.slice(0,5).map(({href,label,Icon})=>{const active=href==='/admin'?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} className={active?'active':''}><Icon/><span>{label}</span></Link>})}</div>
      <main className="admin-content">{children}</main>
    </div>
  </div>
}
