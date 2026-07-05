import type { AiredRange } from './types';

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatAired(aired: AiredRange | null | undefined): string {
  if (!aired) return 'N/A';
  const from = aired.from ? new Date(aired.from).toLocaleDateString() : 'N/A';
  const to = aired.to ? new Date(aired.to).toLocaleDateString() : 'Ongoing';
  return `${from} - ${to}`;
}

export function placeholderImageUrl(title: string): string {
  const label = encodeURIComponent(title.split(' ').slice(0, 2).join(' '));
  return `https://via.placeholder.com/200x280/4a69bd/ffffff?text=${label}`;
}
