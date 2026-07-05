/** Convert a Jikan duration string like "24 min per ep" or "1 hr 30 min" to minutes. */
export function parseDurationToMinutes(duration: string | null | undefined): number | null {
  if (!duration || typeof duration !== 'string') return null;
  const s = duration.toLowerCase();
  let total = 0;

  const hours = /(\d+)\s*hr/.exec(s)?.[1];
  if (hours) total += Number.parseInt(hours, 10) * 60;

  const minutes = /(\d+)\s*min/.exec(s)?.[1];
  if (minutes) total += Number.parseInt(minutes, 10);

  return total > 0 ? total : null;
}
