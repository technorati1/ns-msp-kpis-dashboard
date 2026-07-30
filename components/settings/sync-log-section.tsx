import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export type SyncLogRow = {
  id: number;
  tabKey: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  rowsRead: number | null;
  rowsUpserted: number | null;
  rowsSoftDeleted: number | null;
  errorMessage: string | null;
};

function statusVariant(status: string): 'default' | 'destructive' | 'secondary' {
  if (status === 'success') return 'default';
  if (status === 'error') return 'destructive';
  return 'secondary';
}

export function SyncLogSection({ logs }: { logs: SyncLogRow[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">Sync Log</h2>
      <p className="mt-1 text-sm text-muted-foreground">Last {logs.length} sync runs, most recent first.</p>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Tab</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Rows changed</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                No sync runs yet.
              </TableCell>
            </TableRow>
          )}
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-xs">{log.tabKey}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(log.startedAt).toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
              </TableCell>
              <TableCell className="text-xs">
                {log.rowsUpserted != null || log.rowsSoftDeleted != null
                  ? `+${log.rowsUpserted ?? 0} / -${log.rowsSoftDeleted ?? 0}`
                  : '—'}
              </TableCell>
              <TableCell className="max-w-xs truncate text-xs text-destructive" title={log.errorMessage ?? ''}>
                {log.errorMessage ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
