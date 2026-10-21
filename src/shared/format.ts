// Display formatters. All times show in Singapore time.

const TZ = 'Asia/Singapore';

/** "2026-09-13T19:40:00+08:00" -> "7:40 pm" */
export function formatTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-SG', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '';
  const period = (parts.find((p) => p.type === 'dayPeriod')?.value ?? '').toLowerCase().replace(/\./g, '');
  return `${hour}:${minute} ${period}`.trim();
}

/** 12 -> "0:12", 75 -> "1:15" */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-13" -> "Sun 13 Sep". Fixed names: some locales print "Sept". */
export function formatDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "2026-09" -> "September 2026" */
export function formatMonth(yearMonth: string): string {
  const d = new Date(`${yearMonth}-01T12:00:00Z`);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
