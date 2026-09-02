import { StakeKey } from './stake.utils';

export type MatchResult = 'win' | 'loss';

export interface MatchEntry {
  deck: string;
  stake: StakeKey;
  result: MatchResult;
  playedAt: string;
}

export interface CurrentPlaying {
  deck: string;
  stake: StakeKey | null;
  notes: string;
}

export interface WinStreak {
  current: number;
  best: number;
}

export interface UserStats {
  history: MatchEntry[];
  currentPlaying: CurrentPlaying;
  winStreak: WinStreak;
  processedRunIds?: string[];
  updatedAt?: unknown;
  createdAt?: unknown;
}
