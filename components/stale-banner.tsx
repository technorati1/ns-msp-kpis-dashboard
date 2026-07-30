import type { TabHealth } from '@/lib/health';

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function StaleBanner({ tabs }: { tabs: TabHealth[] }) {
  const staleTabs = tabs.filter((t) => t.isStale);
  if (staleTabs.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
      {staleTabs.map((t) => (
        <p key={t.tabKey}>
          {t.tabName} last synced {timeAgo(t.lastVerifiedAt)} ago — showing last known data.
        </p>
      ))}
    </div>
  );
}
