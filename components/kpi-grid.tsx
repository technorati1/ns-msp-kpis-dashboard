import { KpiCard } from './kpi-card';
import { formatCurrency, formatPercent, formatCount } from '@/lib/format';
import type { KpiResult } from '@/lib/kpis';
import type { TargetsMap } from '@/lib/targets-map';

type Props = {
  kpis: KpiResult;
  year: 2025 | 2026 | 'all';
  targets: TargetsMap;
};

function targetLabel(
  year: 2025 | 2026 | 'all',
  targets: TargetsMap,
  key: keyof TargetsMap[2025],
  formatter: (n: number) => string
): string {
  if (year === 'all') return '—';
  const val = targets[year]?.[key];
  return val != null ? formatter(val) : '—';
}

export function KpiGrid({ kpis, year, targets }: Props) {
  const cards = [
    {
      title: 'New Business Won',
      value: formatCurrency(kpis.newBusinessWon),
      target: targetLabel(year, targets, 'newBusinessWon', formatCurrency),
      attainment: kpis.targetAttainment.newBusinessWon,
      yoy: kpis.yoy.newBusinessWon,
      tooltip:
        'Sum of annualised contract value (one-time + recurring × 12) for Closed Won deals from new customers in the selected period.',
    },
    {
      title: 'MRR Added',
      value: formatCurrency(kpis.mrrAdded),
      target: targetLabel(year, targets, 'mrrAdded', formatCurrency),
      attainment: kpis.targetAttainment.mrrAdded,
      yoy: kpis.yoy.mrrAdded,
      tooltip:
        'Monthly Recurring Revenue added from all Closed Won deals in the selected period. Computed as annual recurring revenue ÷ 12.',
    },
    {
      title: 'Managed Services Revenue',
      value: formatCurrency(kpis.managedServicesRevenue),
      target: targetLabel(year, targets, 'managedServicesRevenue', formatCurrency),
      attainment: kpis.targetAttainment.managedServicesRevenue,
      yoy: kpis.yoy.managedServicesRevenue,
      tooltip:
        'Annualised contract value of Closed Won Managed Services deals. This is a proxy — the source sheet does not contain monthly recognised revenue, so we use contracted value as the best available signal.',
      isProxy: true,
    },
    {
      title: 'Qualified Pipeline (90d)',
      value: formatCurrency(kpis.qualifiedPipeline90d),
      target: targetLabel(year, targets, 'qualifiedPipeline', formatCurrency),
      attainment: year !== 'all' ? kpis.qualifiedPipeline90d / (targets[year]?.qualifiedPipeline ?? 1) : 0,
      yoy: null,
      tooltip:
        'Total annualised value of Open deals with a closing date within the next 90 days. Always forward-looking from today — period filter does not apply to this KPI.',
    },
    {
      title: 'Win Rate',
      value: formatPercent(kpis.winRate),
      target: year !== 'all' ? formatPercent(targets[year]?.winRate ?? 0) : '—',
      attainment: kpis.targetAttainment.winRate,
      yoy: kpis.yoy.winRate,
      tooltip:
        'Closed Won ÷ (Closed Won + Closed Lost) in the selected period. Open deals are excluded from this calculation.',
    },
    {
      title: 'Average Deal Size',
      value: formatCurrency(kpis.averageDealSize),
      target: year !== 'all' ? formatCurrency(targets[year]?.averageDealSize ?? 0) : '—',
      attainment:
        year !== 'all' && targets[year]?.averageDealSize
          ? kpis.averageDealSize / targets[year].averageDealSize
          : 0,
      yoy: kpis.yoy.averageDealSize,
      tooltip:
        'Average annualised contract value across all Closed Won deals in the selected period.',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} />
      ))}
    </div>
  );
}
