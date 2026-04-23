export function formatCurrency(value: number): string {
  if (value === 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

export function formatDays(value: number): string {
  return `${value}d`;
}

export function formatYoY(value: number | null): {
  label: string;
  direction: 'up' | 'down' | 'neutral';
} {
  if (value === null) return { label: '—', direction: 'neutral' };
  const abs = Math.abs(value * 100).toFixed(1);
  if (value > 0) return { label: `▲ ${abs}%`, direction: 'up' };
  if (value < 0) return { label: `▼ ${abs}%`, direction: 'down' };
  return { label: '—', direction: 'neutral' };
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
