/**
 * Hard-coded annual targets. Source: user-confirmed figures (Apr 2026).
 * 2025 total: $600,000. 2026 total: $1,000,000.
 * 2026 segment split is proportional to the brief's original ratios
 * (ERP $720k / SCA $210k = ~77% / ~23%). Update these after user review.
 *
 * To update: edit the values below and redeploy. No database needed.
 */
export const TARGETS = {
  2025: {
    annual: {
      newBusinessWon: 600_000,
      mrrAdded: 50_000,          // $600k / 12 ≈ $50k/month MRR target
      managedServicesRevenue: 600_000,
      newLogosWon: 24,           // $600k / ~$25k avg ticket
      qualifiedPipeline: 600_000,
      winRate: 0.25,
      averageDealSize: 25_000,
    },
    bySegment: {
      'ERP|Managed Services': {
        newBusinessWon: 600_000,
        newLogosWon: 24,
      },
    },
    monthly: {
      newBusinessWon: Math.round(600_000 / 12),
      mrrAdded: Math.round(50_000 / 12),
    },
  },
  2026: {
    annual: {
      newBusinessWon: 1_000_000,
      mrrAdded: 83_333,          // $1M / 12
      managedServicesRevenue: 1_000_000,
      newLogosWon: 18,           // ERP: 7 + SCA MS: ~7 + SCA Impl: ~4
      qualifiedPipeline: 1_000_000,
      winRate: 0.25,
      averageDealSize: 55_556,   // $1M / 18 wins
    },
    bySegment: {
      'ERP|Managed Services': {
        newBusinessWon: 770_000,  // ~77% of $1M
        newLogosWon: 11,
      },
      'SuiteCommerce|Managed Services': {
        newBusinessWon: 140_000,  // ~14%
        newLogosWon: 4,
      },
      'SuiteCommerce|Implementation': {
        newBusinessWon: 90_000,   // ~9%
        newLogosWon: 3,
      },
    },
    monthly: {
      newBusinessWon: Math.round(1_000_000 / 12),
      mrrAdded: Math.round(83_333 / 12),
    },
  },
} as const;

export type TargetYear = keyof typeof TARGETS;
