import { StakeKey } from '../../utils/stake.utils';

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
  userId: string;
  history: MatchEntry[];
  currentPlaying: CurrentPlaying;
  winStreak: WinStreak;
  rerollsRemaining: number;
  processedRunIds?: string[];
  updatedAt?: unknown;
  createdAt?: unknown;
}
