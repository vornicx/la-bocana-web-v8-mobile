import { weekDays } from '@/lib/admin/mock-data';
const blocks=[
 {day:1,top:16,h:18,label:'58 pax',sub:'Comida 24 · Cena 34'},
 {day:2,top:10,h:24,label:'71 pax',sub:'Comida 31 · Cena 40'},
 {day:3,top:14,h:21,label:'64 pax',sub:'Comida 25 · Cena 39'},
 {day:4,top:8,h:31,label:'86 pax',sub:'Comida 34 · Cena 52'},
 {day:5,top:5,h:39,label:'112 pax',sub:'Alta demanda'},
 {day:6,top:7,h:35,label:'104 pax',sub:'Alta demanda'},
];
export default function CalendarPage(){return <div className="admin-page"><div className="admin-page-head"><div><span className="admin-kicker">Planificación</span><h1>Calendario</h1><p>Capacidad prevista y presión por servicio.</p></div><div className="admin-head-actions"><button className="admin-secondary">‹</button><strong>10–16 agosto 2026</strong><button className="admin-secondary">›</button></div></div><div className="calendar-week">{weekDays.map((d,i)=><div key={d.date} className={`calendar-day ${d.active?'active':''}`}><header><span>{d.day}</span><strong>{d.date}</strong></header><div className="calendar-canvas">{d.closed?<div className="closed-card">Cerrado</div>:blocks.filter(b=>b.day===i).map(b=><div key={b.label} className="calendar-block" style={{top:`${b.top}%`,height:`${b.h}%`}}><strong>{b.label}</strong><small>{b.sub}</small></div>)}</div></div>)}</div></div>}
