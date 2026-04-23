import { KpiCard } from './kpi-card';
import { formatCurrency, formatPercent, formatCount } from '@/lib/format';
import { TARGETS } from '@/lib/targets';
import type { KpiResult } from '@/lib/kpis';

type Props = {
  kpis: KpiResult;
  year: 2025 | 2026 | 'all';
};

function targetLabel(year: 2025 | 2026 | 'all', key: keyof typeof TARGETS[2025]['annual'], formatter: (n: number) => string): string {
  if (year === 'all') return '—';
  const val = TARGETS[year]?.annual[key] as number | undefined;
  return val != null ? formatter(val) : '—';
}

export function KpiGrid({ kpis, year }: Props) {
  const cards = [
    {
      title: 'New Business Won',
      value: formatCurrency(kpis.newBusinessWon),
      target: targetLabel(year, 'newBusinessWon', formatCurrency),
      attainment: kpis.targetAttainment.newBusinessWon,
      yoy: kpis.yoy.newBusinessWon,
      tooltip:
        'Sum of annualised contract value (one-time + recurring × 12) for Closed Won deals from new customers in the selected period.',
    },
    {
      title: 'MRR Added',
      value: formatCurrency(kpis.mrrAdded),
      target: targetLabel(year, 'mrrAdded', formatCurrency),
      attainment: kpis.targetAttainment.mrrAdded,
      yoy: kpis.yoy.mrrAdded,
      tooltip:
        'Monthly Recurring Revenue added from all Closed Won deals in the selected period. Computed as annual recurring revenue ÷ 12.',
    },
    {
      title: 'Managed Services Revenue',
      value: formatCurrency(kpis.managedServicesRevenue),
      target: targetLabel(year, 'managedServicesRevenue', formatCurrency),
      attainment: kpis.targetAttainment.managedServicesRevenue,
      yoy: kpis.yoy.managedServicesRevenue,
      tooltip:
        'Annualised contract value of Closed Won Managed Services deals. This is a proxy — the source sheet does not contain monthly recognised revenue, so we use contracted value as the best available signal.',
      isProxy: true,
    },
    {
      title: 'Qualified Pipeline (90d)',
      value: formatCurrency(kpis.qualifiedPipeline90d),
      target: targetLabel(year, 'qualifiedPipeline', formatCurrency),
      attainment: year !== 'all' ? kpis.qualifiedPipeline90d / (TARGETS[year]?.annual.qualifiedPipeline ?? 1) : 0,
      yoy: null,
      tooltip:
        'Total annualised value of Open deals with a closing date within the next 90 days. Always forward-looking from today — period filter does not apply to this KPI.',
    },
    {
      title: 'Win Rate',
      value: formatPercent(kpis.winRate),
      target: year !== 'all' ? formatPercent(TARGETS[year]?.annual.winRate ?? 0) : '—',
      attainment: kpis.targetAttainment.winRate,
      yoy: kpis.yoy.winRate,
      tooltip:
        'Closed Won ÷ (Closed Won + Closed Lost) in the selected period. Open deals are excluded from this calculation.',
    },
    {
      title: 'Average Deal Size',
      value: formatCurrency(kpis.averageDealSize),
      target: year !== 'all' ? formatCurrency(TARGETS[year]?.annual.averageDealSize ?? 0) : '—',
      attainment:
        year !== 'all' && TARGETS[year]?.annual.averageDealSize
          ? kpis.averageDealSize / TARGETS[year].annual.averageDealSize
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
