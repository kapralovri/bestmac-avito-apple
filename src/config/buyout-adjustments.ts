export const adjustments = {
  condition: { A: 1.0, B: 0.9, C: 0.8 },
  batteryCycles: { thresholds: [200, 400, 600], penalties: [0, 2000, 5000, 9000] },
  displayDefectPenalty: 0.15,
  bodyDefectPenalty: 0.07,
  noChargerPenalty: 1500,
  noBoxPenalty: 500,
  icloudBlockedZero: true,
  minMaxSpreadPct: 0.05,
} as const;

export type ConditionGrade = keyof typeof adjustments.condition; // 'A' | 'B' | 'C'

