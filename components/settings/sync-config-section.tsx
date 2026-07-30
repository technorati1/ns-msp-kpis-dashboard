'use client';

import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export type SyncConfigRow = {
  id: number;
  tabKey: string;
  tabName: string;
  year: number;
  syncMode: string;
  isActive: boolean;
  lastVerifiedAt: string | null;
};

export function SyncConfigSection({ initialConfig }: { initialConfig: SyncConfigRow[] }) {
  const [rows, setRows] = useState(initialConfig);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  async function saveTabName(id: number) {
    const tabName = drafts[id];
    if (tabName === undefined || tabName.trim().length === 0) return;
    await save(id, { tabName: tabName.trim() });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function toggleActive(id: number, isActive: boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isActive } : r)));
    await save(id, { isActive });
  }

  async function save(id: number, body: Record<string, unknown>) {
    setSavingId(id);
    try {
      const res = await fetch('/api/settings/sync-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) throw new Error('save failed');
      const { syncConfig } = await res.json();
      setRows((prev) => prev.map((r) => (r.id === id ? syncConfig : r)));
      setSavedId(id);
      setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2000);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">Sync Configuration</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        If a tab gets renamed upstream, fix it here — the next sync run picks up the new name. No code, no deploy.
      </p>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Tab Key</TableHead>
            <TableHead>Tab Name</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Last Verified</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">{row.tabKey}</TableCell>
              <TableCell className="w-56">
                <Input
                  defaultValue={row.tabName}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                />
              </TableCell>
              <TableCell>{row.year}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.syncMode}</TableCell>
              <TableCell>
                <Switch
                  checked={row.isActive}
                  onCheckedChange={(checked) => toggleActive(row.id, checked)}
                />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.lastVerifiedAt ? new Date(row.lastVerifiedAt).toLocaleString() : 'never'}
              </TableCell>
              <TableCell>
                <Button size="sm" onClick={() => saveTabName(row.id)} disabled={savingId === row.id}>
                  {savingId === row.id ? 'Saving…' : savedId === row.id ? 'Saved' : 'Save'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
