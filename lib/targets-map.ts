import { TARGETS } from './targets';

export type TargetMetric =
  | 'newBusinessWon'
  | 'mrrAdded'
  | 'managedServicesRevenue'
  | 'newLogosWon'
  | 'qualifiedPipeline'
  | 'winRate'
  | 'averageDealSize';

export type YearlyTargets = Record<TargetMetric, number>;
export type TargetsMap = Record<2025 | 2026, YearlyTargets>;

/** Pre-migration hard-coded values — used as a fallback if the targets table is missing rows for a year. */
export const FALLBACK_TARGETS: TargetsMap = {
  2025: { ...TARGETS[2025].annual },
  2026: { ...TARGETS[2026].annual },
};
