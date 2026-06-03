import FullCalendar from '@/components/full-calendar'

export default function CalendarPage() {
  return (
    <div className="h-screen flex flex-col bg-white">
      <FullCalendar storageKey="cal_events_main" />
    </div>
  )
}
