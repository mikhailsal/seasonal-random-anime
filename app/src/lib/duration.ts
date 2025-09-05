export function parseDurationToMinutes(duration: string | null | undefined): number | null {
  if (!duration || typeof duration !== 'string') return null;
  const s = duration.toLowerCase();
  let total = 0;

  const hrMatch = s.match(/(\d+)\s*hr/);
  if (hrMatch) total += parseInt(hrMatch[1], 10) * 60;

  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) total += parseInt(minMatch[1], 10);

  return total > 0 ? total : null;
}