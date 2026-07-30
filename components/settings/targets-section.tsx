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
import { Button } from '@/components/ui/button';

export type TargetRow = {
  id: number;
  year: number;
  segmentKey: string | null;
  metric: string;
  value: string;
  updatedAt: string;
};

const METRIC_LABELS: Record<string, string> = {
  newBusinessWon: 'New Business Won',
  mrrAdded: 'MRR Added',
  managedServicesRevenue: 'Managed Services Revenue',
  newLogosWon: 'New Logos Won',
  qualifiedPipeline: 'Qualified Pipeline',
  winRate: 'Win Rate',
  averageDealSize: 'Average Deal Size',
};

export function TargetsSection({ initialTargets }: { initialTargets: TargetRow[] }) {
  const [rows, setRows] = useState(initialTargets);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [errorId, setErrorId] = useState<number | null>(null);

  async function handleSave(id: number) {
    const draft = drafts[id];
    if (draft === undefined) return;
    const value = Number(draft);
    if (!Number.isFinite(value)) {
      setErrorId(id);
      return;
    }

    setSavingId(id);
    setErrorId(null);
    try {
      const res = await fetch('/api/settings/targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, value }),
      });
      if (!res.ok) throw new Error('save failed');
      const { target } = await res.json();
      setRows((prev) => prev.map((r) => (r.id === id ? target : r)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSavedId(id);
      setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      setErrorId(id);
    } finally {
      setSavingId(null);
    }
  }

  const byYear = rows.reduce<Record<number, TargetRow[]>>((acc, r) => {
    (acc[r.year] ??= []).push(r);
    return acc;
  }, {});

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">Targets</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Edit a value and click Save — the dashboard picks it up on next load, no deploy needed.
      </p>

      {Object.entries(byYear).map(([year, yearRows]) => (
        <div key={year} className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">{year}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{METRIC_LABELS[row.metric] ?? row.metric}</TableCell>
                  <TableCell className="w-40">
                    <Input
                      type="number"
                      defaultValue={row.value}
                      aria-invalid={errorId === row.id}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(row.updatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => handleSave(row.id)} disabled={savingId === row.id}>
                      {savingId === row.id ? 'Saving…' : savedId === row.id ? 'Saved' : 'Save'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </section>
  );
}
