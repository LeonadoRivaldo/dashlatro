import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  deleteDoc,
  getDocs,
  doc,
  docData,
  getDoc,
  serverTimestamp,
  setDoc
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { CurrentPlaying, MatchEntry, MatchResult, UserStats, UserRanking, WinStreak } from './stats.model';
import { ModImportResult, ModRunEvent } from './mod-events.model';
import { normalizeStake } from './stake.utils';

const DEFAULT_CURRENT_PLAYING: CurrentPlaying = {
  deck: '',
  stake: null,
  notes: ''
};

const DEFAULT_STATS: UserStats = {
  history: [],
  currentPlaying: DEFAULT_CURRENT_PLAYING,
  winStreak: {
    current: 0,
    best: 0
  },
  rerollsRemaining: 0
};

const DEFAULT_WIN_STREAK: WinStreak = {
  current: 0,
  best: 0
};

function normalizeWinStreak(value: unknown): WinStreak {
  const input = (value ?? {}) as Partial<WinStreak>;
  const currentRaw = Number(input.current);
  const bestRaw = Number(input.best);
  const current = Number.isFinite(currentRaw) && currentRaw > 0 ? Math.floor(currentRaw) : 0;
  const bestBase = Number.isFinite(bestRaw) && bestRaw > 0 ? Math.floor(bestRaw) : 0;
  return {
    current,
    best: Math.max(bestBase, current)
  };
}

function getNextWinStreak(previous: WinStreak, result: MatchResult): WinStreak {
  if (result === 'loss') {
    return {
      current: 0,
      best: previous.best
    };
  }

  const current = previous.current + 1;
  return {
    current,
    best: Math.max(previous.best, current)
  };
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly firestore = inject(Firestore, { optional: true });
  private readonly localStore = new Map<string, BehaviorSubject<UserStats>>();

  private getLocalSubject(uid: string): BehaviorSubject<UserStats> {
    const existing = this.localStore.get(uid);
    if (existing) {
      return existing;
    }

    const created = new BehaviorSubject<UserStats>({
      history: [],
      currentPlaying: { ...DEFAULT_CURRENT_PLAYING },
      winStreak: { ...DEFAULT_WIN_STREAK },
      rerollsRemaining: 0
    });
    this.localStore.set(uid, created);
    return created;
  }

  streamUserStats(uid: string): Observable<UserStats> {
    if (!this.firestore) {
      return this.getLocalSubject(uid).asObservable();
    }

    const ref = doc(this.firestore, 'userStats', uid);
    return docData(ref).pipe(
      map((value) => {
        if (!value) {
          return DEFAULT_STATS;
        }

        const data = value as Partial<UserStats>;
        const currentStake = data.currentPlaying?.stake;
        const normalizedWinStreak = normalizeWinStreak(data.winStreak);
        const rerollsRaw = Number(data.rerollsRemaining);
        const rerollsRemaining = Number.isFinite(rerollsRaw) && rerollsRaw >= 0 ? Math.floor(rerollsRaw) : normalizedWinStreak.best;
        return {
          history: Array.isArray(data.history)
            ? data.history
                .filter((entry): entry is MatchEntry => !!entry && typeof entry.deck === 'string')
                .map((entry) => ({
                  ...entry,
                  stake: normalizeStake(entry.stake)
                }))
            : [],
          currentPlaying: {
            deck: data.currentPlaying?.deck ?? DEFAULT_CURRENT_PLAYING.deck,
            stake:
              currentStake === null || currentStake === undefined
                ? null
                : normalizeStake(currentStake),
            notes: data.currentPlaying?.notes ?? ''
          },
          winStreak: normalizedWinStreak,
          rerollsRemaining,
          processedRunIds: Array.isArray(data.processedRunIds)
            ? data.processedRunIds.filter((id): id is string => typeof id === 'string')
            : [],
          updatedAt: data.updatedAt,
          createdAt: data.createdAt
        };
      })
    );
  }

  async updateCurrentPlaying(uid: string, payload: CurrentPlaying, displayName?: string): Promise<void> {
    if (!this.firestore) {
      const subject = this.getLocalSubject(uid);
      subject.next({
        ...subject.value,
        currentPlaying: payload
      });
      return;
    }

    const ref = doc(this.firestore, 'userStats', uid);
    const data: Record<string, unknown> = {
      currentPlaying: payload,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    };
    
    if (displayName) {
      data['displayName'] = displayName;
    }
    
    await setDoc(ref, data, { merge: true });
  }

  async recordResult(
    uid: string,
    deck: string,
    stake: MatchEntry['stake'],
    result: MatchResult,
    displayName?: string
  ): Promise<void> {
    if (!this.firestore) {
      const subject = this.getLocalSubject(uid);
      const nextEntry: MatchEntry = {
        deck,
        stake: normalizeStake(stake),
        result,
        playedAt: new Date().toISOString()
      };
      const nextWinStreak = getNextWinStreak(
        normalizeWinStreak(subject.value.winStreak),
        result
      );

      subject.next({
        ...subject.value,
        history: [nextEntry, ...subject.value.history].slice(0, 500),
        winStreak: nextWinStreak,
        rerollsRemaining: nextWinStreak.best
      });
      return;
    }

    const ref = doc(this.firestore, 'userStats', uid);
    const snapshot = await getDoc(ref);
    const existing = snapshot.data() as Partial<UserStats> | undefined;
    const history = Array.isArray(existing?.history) ? existing.history : [];
    const existingWinStreak = normalizeWinStreak(existing?.winStreak);

    const nextEntry: MatchEntry = {
      deck,
      stake: normalizeStake(stake),
      result,
      playedAt: new Date().toISOString()
    };

    const nextHistory = [nextEntry, ...history].slice(0, 500);
    const nextWinStreak = getNextWinStreak(existingWinStreak, result);

    const data: Record<string, unknown> = {
      history: nextHistory,
      winStreak: nextWinStreak,
      rerollsRemaining: nextWinStreak.best,
      updatedAt: serverTimestamp(),
      createdAt: existing?.createdAt ?? serverTimestamp()
    };
    
    if (displayName) {
      data['displayName'] = displayName;
    }

    await setDoc(ref, data, { merge: true }
    );
  }

  async clearCurrentPlaying(uid: string): Promise<void> {
    const cleared: CurrentPlaying = {
      deck: '',
      stake: null,
      notes: ''
    };

    if (!this.firestore) {
      const subject = this.getLocalSubject(uid);
      subject.next({
        ...subject.value,
        currentPlaying: cleared
      });
      return;
    }

    const ref = doc(this.firestore, 'userStats', uid);
    await setDoc(
      ref,
      {
        currentPlaying: cleared,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  async resetUserStats(uid: string): Promise<void> {
    if (!this.firestore) {
      const subject = this.getLocalSubject(uid);
      subject.next({
        history: [],
        currentPlaying: { ...DEFAULT_CURRENT_PLAYING },
        winStreak: { ...DEFAULT_WIN_STREAK },
        rerollsRemaining: 0,
        processedRunIds: []
      });
      return;
    }

    const ref = doc(this.firestore, 'userStats', uid);
    await setDoc(
      ref,
      {
        history: [],
        currentPlaying: { ...DEFAULT_CURRENT_PLAYING },
        winStreak: { ...DEFAULT_WIN_STREAK },
        rerollsRemaining: 0,
        processedRunIds: [],
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  async rerollCurrentPlaying(uid: string, deckOptions: string[], stakeOptions: string[]): Promise<void> {
    if (!this.firestore) {
      const subject = this.getLocalSubject(uid);
      if (subject.value.rerollsRemaining <= 0) {
        throw new Error('No rerolls remaining');
      }

      const nextDeck = deckOptions[Math.floor(Math.random() * deckOptions.length)];
      const nextStake = stakeOptions[Math.floor(Math.random() * stakeOptions.length)] ?? 'white';

      subject.next({
        ...subject.value,
        currentPlaying: {
          deck: nextDeck,
          stake: normalizeStake(nextStake),
          notes: subject.value.currentPlaying.notes
        },
        rerollsRemaining: Math.max(0, subject.value.rerollsRemaining - 1)
      });
      return;
    }

    const ref = doc(this.firestore, 'userStats', uid);
    const snapshot = await getDoc(ref);
    const existing = snapshot.data() as Partial<UserStats> | undefined;
    const rerollsRemaining = Number(existing?.rerollsRemaining ?? 0);

    if (rerollsRemaining <= 0) {
      throw new Error('No rerolls remaining');
    }

    const nextDeck = deckOptions[Math.floor(Math.random() * deckOptions.length)];
    const nextStake = stakeOptions[Math.floor(Math.random() * stakeOptions.length)] ?? 'white';

    await setDoc(
      ref,
      {
        currentPlaying: {
          deck: nextDeck,
          stake: normalizeStake(nextStake),
          notes: existing?.currentPlaying?.notes ?? ''
        },
        rerollsRemaining: Math.max(0, rerollsRemaining - 1),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  async importModEvents(uid: string, events: ModRunEvent[]): Promise<ModImportResult> {
    if (!events.length) {
      return { imported: 0, skipped: 0, currentUpdated: false };
    }

    if (!this.firestore) {
      const subject = this.getLocalSubject(uid);
      const processed = new Set(subject.value.processedRunIds ?? []);
      const history = [...subject.value.history];
      let currentPlaying = { ...subject.value.currentPlaying };
      let winStreak = normalizeWinStreak(subject.value.winStreak);
      let imported = 0;
      let skipped = 0;
      let currentUpdated = false;

      for (const event of events) {
        if (event.eventType === 'run_started') {
          currentPlaying = {
            deck: event.deck,
            stake: event.stake,
            notes: `Run ${event.runId}`
          };
          currentUpdated = true;
          continue;
        }

        if (processed.has(event.runId)) {
          skipped += 1;
          continue;
        }

        processed.add(event.runId);
        history.unshift({
          deck: event.deck,
          stake: event.stake,
          result: event.result ?? 'loss',
          playedAt: event.timestamp
        });
        winStreak = getNextWinStreak(winStreak, event.result ?? 'loss');
        imported += 1;
        currentPlaying = { ...DEFAULT_CURRENT_PLAYING };
        currentUpdated = true;
      }

      subject.next({
        ...subject.value,
        history: history.slice(0, 500),
        currentPlaying,
        winStreak,
        rerollsRemaining: winStreak.best,
        processedRunIds: Array.from(processed).slice(-2000)
      });

      return { imported, skipped, currentUpdated };
    }

    const ref = doc(this.firestore, 'userStats', uid);
    const snapshot = await getDoc(ref);
    const existing = snapshot.data() as Partial<UserStats> | undefined;
    const history = Array.isArray(existing?.history)
      ? existing.history
          .filter((entry): entry is MatchEntry => !!entry && typeof entry.deck === 'string')
          .map((entry) => ({ ...entry, stake: normalizeStake(entry.stake) }))
      : [];
    const processed = new Set(
      Array.isArray(existing?.processedRunIds)
        ? existing.processedRunIds.filter((id): id is string => typeof id === 'string')
        : []
    );

    let currentPlaying: CurrentPlaying = {
      deck: existing?.currentPlaying?.deck ?? '',
      stake:
        existing?.currentPlaying?.stake === null || existing?.currentPlaying?.stake === undefined
          ? null
          : normalizeStake(existing.currentPlaying.stake),
      notes: existing?.currentPlaying?.notes ?? ''
    };
    let winStreak = normalizeWinStreak(existing?.winStreak);
    let imported = 0;
    let skipped = 0;
    let currentUpdated = false;

    for (const event of events) {
      if (event.eventType === 'run_started') {
        currentPlaying = {
          deck: event.deck,
          stake: event.stake,
          notes: `Run ${event.runId}`
        };
        currentUpdated = true;
        continue;
      }

      if (processed.has(event.runId)) {
        skipped += 1;
        continue;
      }

      processed.add(event.runId);
      history.unshift({
        deck: event.deck,
        stake: event.stake,
        result: event.result ?? 'loss',
        playedAt: event.timestamp
      });
      winStreak = getNextWinStreak(winStreak, event.result ?? 'loss');
      imported += 1;
      currentPlaying = { ...DEFAULT_CURRENT_PLAYING };
      currentUpdated = true;
    }

    await setDoc(
      ref,
      {
        history: history.slice(0, 500),
        currentPlaying,
        winStreak,
        rerollsRemaining: winStreak.best,
        processedRunIds: Array.from(processed).slice(-2000),
        updatedAt: serverTimestamp(),
        createdAt: existing?.createdAt ?? serverTimestamp()
      },
      { merge: true }
    );

    return { imported, skipped, currentUpdated };
  }

  async consumeInboxEvents(uid: string): Promise<ModImportResult & { received: number }> {
    if (!this.firestore) {
      return { received: 0, imported: 0, skipped: 0, currentUpdated: false };
    }

    const inboxRef = collection(this.firestore, 'modInbox', uid, 'events');
    const snapshot = await getDocs(inboxRef);
    if (snapshot.empty) {
      return { received: 0, imported: 0, skipped: 0, currentUpdated: false };
    }

    const events: ModRunEvent[] = [];
    const consumedDocRefs: Array<(typeof snapshot.docs)[number]['ref']> = [];

    for (const item of snapshot.docs) {
      const data = item.data() as Record<string, unknown>;
      const eventType = data['eventType'];
      const runId = data['runId'];
      const deck = data['deck'];
      const timestamp = data['timestamp'];
      const stakeRaw = data['stake'];
      const result = data['result'];

      if (eventType !== 'run_started' && eventType !== 'run_finished') {
        continue;
      }
      if (typeof runId !== 'string' || !runId.trim()) {
        continue;
      }
      if (typeof deck !== 'string' || !deck.trim()) {
        continue;
      }
      if (typeof timestamp !== 'string' || !timestamp.trim()) {
        continue;
      }

      events.push({
        eventType,
        runId,
        deck,
        timestamp,
        stake: normalizeStake(stakeRaw),
        result: result === 'win' ? 'win' : result === 'loss' ? 'loss' : undefined
      });
      consumedDocRefs.push(item.ref);
    }

    if (!events.length) {
      return { received: snapshot.docs.length, imported: 0, skipped: 0, currentUpdated: false };
    }

    events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const imported = await this.importModEvents(uid, events);

    await Promise.all(consumedDocRefs.map((ref) => deleteDoc(ref)));

    return {
      received: events.length,
      ...imported
    };
  }

  async getGlobalRankings(): Promise<UserRanking[]> {
    if (!this.firestore) {
      return [];
    }

    const ref = collection(this.firestore, 'userStats');
    const snapshot = await getDocs(ref);
    
    const rankings: UserRanking[] = snapshot.docs
      .map((doc) => {
        const data = doc.data() as Partial<UserStats>;
        const history = Array.isArray(data.history) ? data.history : [];
        const winStreak = normalizeWinStreak(data.winStreak);
        
        const wins = history.filter((h) => h.result === 'win').length;
        const losses = history.filter((h) => h.result === 'loss').length;
        const total = wins + losses;
        const winRate = total > 0 ? (wins / total) * 100 : 0;

        return {
          uid: doc.id,
          displayName: data.displayName || 'Jogador Anônimo',
          wins,
          losses,
          winRate,
          bestStreak: winStreak.best,
          currentStreak: winStreak.current
        };
      })
      .sort((a, b) => {
        // Sort by win rate first, then by best streak
        if (Math.abs(a.winRate - b.winRate) > 0.01) {
          return b.winRate - a.winRate;
        }
        return b.bestStreak - a.bestStreak;
      });

    return rankings;
  }
}
