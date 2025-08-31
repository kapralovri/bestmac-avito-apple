export type BuyoutRow = {
  manufacturer: string;
  model: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  gpu?: string;
  basePrice: number;
};

export type AdjustmentConfig = {
  condition: { A: number; B: number; C: number };
  batteryCycles: { thresholds: number[]; penalties: number[] };
  displayDefectPenalty: number;
  bodyDefectPenalty: number;
  noChargerPenalty: number;
  noBoxPenalty: number;
  icloudBlockedZero: boolean;
  minMaxSpreadPct: number;
};

