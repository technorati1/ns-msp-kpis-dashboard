import { redirect } from 'next/navigation';
import Link from 'next/link';
import { asc, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { isSettingsAllowed } from '@/lib/settings-auth';
import { db } from '@/lib/db/client';
import { targets, syncConfig, syncLog } from '@/lib/db/schema';
import { TargetsSection } from '@/components/settings/targets-section';
import { SyncConfigSection } from '@/components/settings/sync-config-section';
import { SyncLogSection } from '@/components/settings/sync-log-section';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!isSettingsAllowed(session?.user?.email)) {
    redirect('/');
  }

  const [targetRows, syncConfigRows, syncLogRows] = await Promise.all([
    db.select().from(targets).orderBy(asc(targets.year), asc(targets.metric)),
    db.select().from(syncConfig).orderBy(asc(syncConfig.year), asc(syncConfig.tabKey)),
    db.select().from(syncLog).orderBy(desc(syncLog.startedAt)).limit(20),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <h1 className="text-base font-semibold tracking-tight text-foreground">Settings</h1>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <TargetsSection
          initialTargets={targetRows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }))}
        />
        <SyncConfigSection
          initialConfig={syncConfigRows.map((r) => ({
            ...r,
            lastVerifiedAt: r.lastVerifiedAt ? r.lastVerifiedAt.toISOString() : null,
          }))}
        />
        <SyncLogSection
          logs={syncLogRows.map((r) => ({
            ...r,
            startedAt: r.startedAt.toISOString(),
            finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
          }))}
        />
      </main>
    </div>
  );
}
