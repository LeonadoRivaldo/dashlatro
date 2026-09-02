export const STAKE_ORDER = [
  'white',
  'red',
  'green',
  'black',
  'blue',
  'purple',
  'orange',
  'gold'
] as const;

export type StakeKey = (typeof STAKE_ORDER)[number];

export const STAKE_LABELS: Record<StakeKey, string> = {
  white: 'White Stake',
  red: 'Red Stake',
  green: 'Green Stake',
  black: 'Black Stake',
  blue: 'Blue Stake',
  purple: 'Purple Stake',
  orange: 'Orange Stake',
  gold: 'Gold Stake'
};

const STAKE_INDEX: Record<StakeKey, number> = {
  white: 1,
  red: 2,
  green: 3,
  black: 4,
  blue: 5,
  purple: 6,
  orange: 7,
  gold: 8
};

export function stakeToLabel(stake: StakeKey): string {
  return STAKE_LABELS[stake];
}

export function stakeToImage(stake: StakeKey): string {
  return `stakes/${stake}.png`;
}

export function normalizeStake(input: unknown): StakeKey {
  if (typeof input === 'number') {
    const fromNumber = STAKE_ORDER[Math.max(1, Math.min(8, Math.floor(input))) - 1];
    return fromNumber ?? 'white';
  }

  if (typeof input === 'string') {
    const normalized = input.trim().toLowerCase().replace(/\s+stake$/, '');
    if ((STAKE_ORDER as readonly string[]).includes(normalized)) {
      return normalized as StakeKey;
    }
  }

  return 'white';
}

export function stakeWeight(stake: StakeKey): number {
  return STAKE_INDEX[stake];
}
