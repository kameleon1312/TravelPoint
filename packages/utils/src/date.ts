export function formatRelative(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffSec < 60) return 'właśnie teraz';
  if (diffMin < 60) return `${diffMin} min temu`;
  if (diffH < 24) return `${diffH} godz. temu`;
  if (diffD < 7) return `${diffD} dni temu`;
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatCoord(value: number, decimals = 4): string {
  return value.toFixed(decimals);
}

export function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}
