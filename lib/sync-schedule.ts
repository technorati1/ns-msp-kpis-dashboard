/** Matches the cron schedule in .github/workflows/sync.yml — keep both in sync if the interval changes. */
export const SYNC_INTERVAL_MINUTES = 20;

/** Minimum gap between manual "Sync now" clicks, enforced in /api/sync/trigger. */
export const MANUAL_SYNC_COOLDOWN_SECONDS = 30;
