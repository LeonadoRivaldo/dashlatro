export interface UserProfile {
  userId: string;
  displayName: string;
  email?: string | null;
  photoUrl?: string | null;
  updatedAt?: unknown;
  createdAt?: unknown;
}

export interface UserRanking extends UserProfile {
  wins: number;
  losses: number;
  winRate: number;
  bestStreak: number;
  currentStreak: number;
}
