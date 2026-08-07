import type { AdminReservation, DiningTable } from './types';

export const dashboardMetrics = {
  covers: 86,
  coversDelta: '+12% vs. viernes anterior',
  reservations: 27,
  occupancy: 74,
  waitlist: 4,
  noShows: 1,
};

export const reservations: AdminReservation[] = [
  { id:'R-0827', time:'13:30', duration:90, customer:'María Fernández', phone:'+34 611 204 918', email:'maria.fernandez@example.com', partySize:2, adults:2, children:0, table:'T03', area:'Terraza', status:'confirmed', source:'website', visits:5, notes:'Prefiere sombra', preferences:'Terraza · mesa con sombra', internalNotes:'Cliente habitual. Recibir por nombre si es posible.' },
  { id:'R-0828', time:'14:00', duration:105, customer:'Javier Romero', phone:'+34 620 382 761', email:'javier.romero@example.com', partySize:4, adults:4, children:0, table:'T07', area:'Interior', status:'confirmed', source:'phone', visits:2, allergies:'Marisco — confirmar alcance', internalNotes:'Confirmar alergia con cocina antes de sentar.' },
  { id:'R-0829', time:'14:15', duration:120, customer:'Sophie Martin', phone:'+33 6 12 44 80 32', email:'sophie.martin@example.com', partySize:5, adults:3, children:2, table:'T11 + T12', area:'Terraza', status:'seated', source:'website', visits:1, notes:'Trona solicitada', preferences:'Trona · terraza' },
  { id:'R-0830', time:'14:30', duration:90, customer:'Álvaro Méndez', phone:'+34 690 442 182', partySize:2, adults:2, children:0, table:'T05', area:'Terraza', status:'seated', source:'walk_in', visits:8 },
  { id:'R-0831', time:'15:00', duration:120, customer:'Lucía Delgado', phone:'+34 633 911 504', partySize:6, adults:6, children:0, table:'T14', area:'Interior', status:'pending', source:'admin', visits:3, notes:'Cumpleaños' },
  { id:'R-0832', time:'20:30', duration:105, customer:'Daniel Ortega', phone:'+34 657 220 118', partySize:4, adults:4, children:0, table:'T02', area:'Terraza', status:'confirmed', source:'website', visits:4 },
  { id:'R-0833', time:'21:00', duration:120, customer:'Isabel Costa', phone:'+351 912 083 462', email:'isabel.costa@example.com', partySize:6, adults:5, children:1, table:'T09 + T10', area:'Terraza', status:'confirmed', source:'website', visits:2, notes:'Carrito de bebé', preferences:'Terraza · espacio para carrito' },
  { id:'R-0834', time:'21:30', duration:105, customer:'Marc Dubois', phone:'+33 6 88 71 09 40', partySize:4, adults:4, children:0, table:'T06', area:'Interior', status:'confirmed', source:'website', visits:1, allergies:'Frutos secos' },
  { id:'R-0835', time:'22:00', duration:90, customer:'Carmen Ruiz', phone:'+34 644 702 613', partySize:2, adults:2, children:0, table:null, area:'Terraza', status:'pending', source:'phone', visits:6 },
];

export const waitlist = [
  { id:'W1', time:'21:00', party:4, name:'Nuria Gómez', flexibility:'20:30–22:00', since:'18:42' },
  { id:'W2', time:'21:30', party:2, name:'Thomas Klein', flexibility:'± 45 min', since:'19:04' },
  { id:'W3', time:'22:00', party:5, name:'Elena Vidal', flexibility:'21:30–22:30', since:'19:26' },
  { id:'W4', time:'14:30', party:3, name:'Pedro Muñoz', flexibility:'14:00–15:30', since:'12:11' },
];

export const tables: DiningTable[] = [
  {id:'T01',label:'T01',seats:2,area:'Terraza',x:7,y:13,w:10,h:14,shape:'round',state:'free'},
  {id:'T02',label:'T02',seats:4,area:'Terraza',x:22,y:11,w:13,h:16,shape:'round',state:'reserved',reservationId:'R-0832'},
  {id:'T03',label:'T03',seats:2,area:'Terraza',x:41,y:12,w:10,h:14,shape:'round',state:'reserved',reservationId:'R-0827'},
  {id:'T04',label:'T04',seats:4,area:'Terraza',x:57,y:10,w:13,h:16,shape:'round',state:'free'},
  {id:'T05',label:'T05',seats:2,area:'Terraza',x:76,y:13,w:10,h:14,shape:'round',state:'seated',reservationId:'R-0830'},
  {id:'T06',label:'T06',seats:4,area:'Interior',x:8,y:50,w:15,h:16,shape:'rect',state:'reserved',reservationId:'R-0834'},
  {id:'T07',label:'T07',seats:4,area:'Interior',x:29,y:49,w:15,h:16,shape:'rect',state:'reserved',reservationId:'R-0828'},
  {id:'T08',label:'T08',seats:4,area:'Interior',x:50,y:49,w:15,h:16,shape:'rect',state:'free'},
  {id:'T09',label:'T09',seats:4,area:'Terraza',x:67,y:46,w:12,h:15,shape:'rect',state:'reserved',reservationId:'R-0833'},
  {id:'T10',label:'T10',seats:2,area:'Terraza',x:82,y:46,w:9,h:15,shape:'rect',state:'reserved',reservationId:'R-0833'},
  {id:'T11',label:'T11',seats:4,area:'Terraza',x:10,y:76,w:12,h:15,shape:'rect',state:'seated',reservationId:'R-0829'},
  {id:'T12',label:'T12',seats:2,area:'Terraza',x:25,y:76,w:9,h:15,shape:'rect',state:'seated',reservationId:'R-0829'},
  {id:'T13',label:'T13',seats:4,area:'Interior',x:47,y:76,w:14,h:15,shape:'rect',state:'blocked'},
  {id:'T14',label:'T14',seats:6,area:'Interior',x:69,y:73,w:22,h:18,shape:'rect',state:'reserved',reservationId:'R-0831'},
];

export const weekDays = [
  {day:'Lun',date:'10',covers:0,closed:true},
  {day:'Mar',date:'11',covers:58},
  {day:'Mié',date:'12',covers:71},
  {day:'Jue',date:'13',covers:64},
  {day:'Vie',date:'14',covers:86,active:true},
  {day:'Sáb',date:'15',covers:112},
  {day:'Dom',date:'16',covers:104},
];
