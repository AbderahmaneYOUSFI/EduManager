'use client';
import FullCalendar from '@fullcalendar/react';
import timeGrid from '@fullcalendar/timegrid';
import dayGrid from '@fullcalendar/daygrid';
import interaction from '@fullcalendar/interaction';
import fr from '@fullcalendar/core/locales/fr';
export function Calendar({ events }: { events: { id: string; title: string; start: string; end: string; status: string; room: string }[] }) {
  return <FullCalendar plugins={[timeGrid, dayGrid, interaction]} initialView="timeGridWeek" locale={fr} firstDay={6} timeZone="UTC" headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' }} allDaySlot={false} slotMinTime="07:00:00" slotMaxTime="22:00:00" height="auto" events={events.filter(e => e.status !== 'CANCELLED').map(e => ({ id: e.id, title: `${e.title} · ${e.room}`, start: e.start.replace('Z', '').slice(0,19), end: e.end.replace('Z', '').slice(0,19) })).map(e => ({ ...e, start: new Date(new Date(e.start + 'Z').getTime() + 3600_000).toISOString(), end: new Date(new Date(e.end + 'Z').getTime() + 3600_000).toISOString() }))} />;
}
