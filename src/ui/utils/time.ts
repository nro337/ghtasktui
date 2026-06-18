const MINUTE = 60_000;
const HOUR   = 60 * MINUTE;
const DAY    = 24 * HOUR;
const WEEK   = 7  * DAY;

export function relativeTime(isoDate: string): string {
  if (!isoDate) return '';
  const delta = Date.now() - new Date(isoDate).getTime();
  if (!isFinite(delta))    return '';
  if (delta < MINUTE)      return 'now';
  if (delta < HOUR)        return `${Math.floor(delta / MINUTE)}m`;
  if (delta < DAY)         return `${Math.floor(delta / HOUR)}h`;
  if (delta < WEEK)        return `${Math.floor(delta / DAY)}d`;
  return `${Math.floor(delta / WEEK)}w`;
}

export function shortDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
