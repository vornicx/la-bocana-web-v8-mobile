import { requireStaffSession } from '@/lib/admin/auth';
import { loadSettingsData } from '@/lib/admin/overview-data';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireStaffSession();
  const counts = await loadSettingsData();
  return <div className="admin-page"><div className="admin-page-head"><div><span className="admin-kicker">Sistema · verificación real</span><h1>Configuración</h1><p>Estado actual del inventario conectado; los valores operativos definitivos se cerrarán con el restaurante.</p></div></div><div className="settings-grid"><section className="admin-panel"><h2>Servicios</h2><p>{counts.services} servicios y {counts.availability_rules} reglas horarias activos en la base de datos.</p><span className="pending-tag connected-tag">Supabase conectado</span></section><section className="admin-panel"><h2>Plano y mesas</h2><p>{counts.tables} mesas, {counts.areas} áreas y {counts.table_combinations} combinaciones cargadas para QA.</p><span className="pending-tag">Pendiente de validación física</span></section><section className="admin-panel"><h2>Integración de datos</h2><p>PostgreSQL, Auth, RLS, reservas, Sala, CRM y calendario comparten una única fuente de verdad.</p><span className="pending-tag connected-tag">Operativo</span></section><section className="admin-panel"><h2>Equipo</h2><p>{counts.users} {counts.users === 1 ? 'usuario interno configurado' : 'usuarios internos configurados'} con acceso por roles.</p><span className="pending-tag connected-tag">Acceso protegido</span></section><section className="admin-panel"><h2>Automatizaciones</h2><p>Confirmaciones, recordatorios y recuperación automática de huecos.</p><span className="future-tag">Siguiente fase</span></section></div></div>;
}
