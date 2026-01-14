// Real coin diameter ratios (relative to quarter = 1.0)
// Quarter: 24.26mm, Nickel: 21.21mm, Penny: 19.05mm, Dime: 17.91mm
export const COIN_SIZE_RATIOS: { [key: string]: number } = {
  "0.25": 1.0,      // Quarter - largest (24.26mm)
  "0.05": 0.874,    // Nickel (21.21mm)
  "0.01": 0.785,    // Penny (19.05mm)
  "0.10": 0.738,    // Dime - smallest (17.91mm)
};

export const BASE_COIN_SIZE = 64; // Base size in pixels for quarter

export function getCoinSize(value: number | string, baseSize: number = BASE_COIN_SIZE): number {
  const valueStr = typeof value === 'number' ? value.toString() : value;
  const ratio = COIN_SIZE_RATIOS[valueStr] || 1;
  return Math.round(baseSize * ratio);
}

export function isCoinDenomination(denomination: string): boolean {
  return denomination in COIN_SIZE_RATIOS;
}
