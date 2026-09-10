import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { MatchResult } from '../../core/models/stats.model';
import { StatsService } from '../../core/services/stats.service';
import {
  STAKE_ORDER,
  StakeKey,
  stakeToImage,
  stakeToLabel,
  stakeWeight
} from '../../utils/stake.utils';
import { AppButtonComponent } from '../../shared/components/app-button.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule, TranslatePipe, AppButtonComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
})
export class DashboardPage {
  private readonly authService = inject(AuthService);
  private readonly statsService = inject(StatsService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;

  readonly deckOptions = [
    'Red Deck',
    'Blue Deck',
    'Yellow Deck',
    'Green Deck',
    'Black Deck',
    'Magic Deck',
    'Nebula Deck',
    'Ghost Deck',
    'Abandoned Deck',
    'Checkered Deck',
    'Zodiac Deck',
    'Painted Deck',
    'Anaglyph Deck',
    'Plasma Deck',
    'Erratic Deck'
  ];

  readonly stakeOptions: StakeKey[] = [...STAKE_ORDER];

  readonly activeDeck = signal('');
  readonly activeStake = signal<StakeKey | null>(null);

  readonly isBusy = signal(false);
  readonly errorMessage = signal('');
  readonly isSyncingInbox = signal(false);
  readonly showAllRanking = signal(false);

  private readonly stats = toSignal(
    toObservable(computed(() => this.user()?.uid ?? null)).pipe(
      switchMap((uid) => (uid ? this.statsService.streamUserStats(uid) : of(null)))
    ),
    { initialValue: null }
  );

  readonly wins = computed(() =>
    (this.stats()?.history ?? []).filter((entry) => entry.result === 'win').length
  );

  readonly losses = computed(() =>
    (this.stats()?.history ?? []).filter((entry) => entry.result === 'loss').length
  );

  readonly totalRuns = computed(() => this.wins() + this.losses());

  readonly winRate = computed(() => {
    const total = this.totalRuns();
    if (!total) {
      return 0;
    }
    return (this.wins() / total) * 100;
  });

  readonly rankingAll = computed(() => {
    const mapByCombo = new Map<string, { deck: string; stake: StakeKey; wins: number; losses: number }>();

    for (const entry of this.stats()?.history ?? []) {
      const key = `${entry.deck}::${entry.stake}`;
      const current = mapByCombo.get(key) ?? {
        deck: entry.deck,
        stake: entry.stake,
        wins: 0,
        losses: 0
      };

      if (entry.result === 'win') {
        current.wins += 1;
      } else {
        current.losses += 1;
      }

      mapByCombo.set(key, current);
    }

    return Array.from(mapByCombo.values())
      .map((combo) => ({
        ...combo,
        total: combo.wins + combo.losses,
        ratio: combo.wins + combo.losses ? combo.wins / (combo.wins + combo.losses) : 0
      }))
      .sort(
        (a, b) =>
          b.ratio - a.ratio || b.total - a.total || stakeWeight(b.stake) - stakeWeight(a.stake)
      );
  });

  readonly ranking = computed(() =>
    this.showAllRanking() ? this.rankingAll() : this.rankingAll().slice(0, 8)
  );

  readonly hasMoreRanking = computed(() => this.rankingAll().length > 8);

  readonly winStreakCurrent = computed(() => this.stats()?.winStreak.current ?? 0);
  readonly winStreakBest = computed(() => this.stats()?.winStreak.best ?? 0);
  readonly rerollsRemaining = computed(() => this.stats()?.rerollsRemaining ?? 0);

  readonly mostPlayed = computed(() => this.rankingAll()[0] ?? null);
  readonly hasCurrentPlaying = computed(() => !!this.activeDeck() && !!this.activeStake());

  constructor() {
    effect(() => {
      if (!this.user()) {
        this.router.navigateByUrl('/login');
      }
    });

    effect((onCleanup) => {
      const uid = this.user()?.uid;
      if (!uid) {
        return;
      }

      const tick = () => {
        void this.consumeInbox(uid);
      };

      tick();
      const intervalId = setInterval(tick, 5000);
      onCleanup(() => clearInterval(intervalId));
    });

    effect(() => {
      const data = this.stats();
      if (!data) {
        return;
      }

      this.activeDeck.set(data.currentPlaying.deck);
      this.activeStake.set(data.currentPlaying.stake);
    });
  }

  stakeLabel(stake: StakeKey): string {
    return stakeToLabel(stake);
  }

  stakeImage(stake: StakeKey): string {
    return stakeToImage(stake);
  }

  deckImage(deck: string): string {
    const slug = deck
      .trim()
      .toLowerCase()
      .replace(/\s+deck$/, '')
      .replace(/\s+/g, '-');
    return `decks/${slug}.png`;
  }

  async drawRandomRun(): Promise<void> {
    if (this.hasCurrentPlaying()) {
      return;
    }

    const nextDeck = this.deckOptions[Math.floor(Math.random() * this.deckOptions.length)];
    const nextStake = this.stakeOptions[Math.floor(Math.random() * this.stakeOptions.length)] ?? 'white';
    const uid = this.user()?.uid;
    if (!uid) {
      return;
    }

    this.errorMessage.set('');
    this.isBusy.set(true);
    try {
      await this.statsService.updateCurrentPlaying(
        uid,
        {
          deck: nextDeck,
          stake: nextStake,
          notes: ''
        }
      );
      this.activeDeck.set(nextDeck);
      this.activeStake.set(nextStake);
    } catch {
      this.errorMessage.set('Nao foi possivel iniciar o run atual.');
    } finally {
      this.isBusy.set(false);
    }
  }

  async registerResult(result: MatchResult): Promise<void> {
    const uid = this.user()?.uid;
    const currentDeck = this.activeDeck();
    const currentStake = this.activeStake();
    if (!uid || !currentDeck || !currentStake) {
      return;
    }

    this.errorMessage.set('');
    this.isBusy.set(true);
    try {
      await this.statsService.recordResult(uid, currentDeck, currentStake, result);
      await this.statsService.clearCurrentPlaying(uid);
      this.activeDeck.set('');
      this.activeStake.set(null);
    } catch {
      this.errorMessage.set('Nao foi possivel registrar a partida.');
    } finally {
      this.isBusy.set(false);
    }
  }

  async rerollRun(): Promise<void> {
    if (!this.hasCurrentPlaying() || this.isBusy()) {
      return;
    }

    const uid = this.user()?.uid;
    if (!uid) {
      return;
    }

    this.errorMessage.set('');
    this.isBusy.set(true);
    try {
      await this.statsService.rerollCurrentPlaying(uid, this.deckOptions, this.stakeOptions);
    } catch {
      this.errorMessage.set('Nao foi possivel fazer reroll.');
    } finally {
      this.isBusy.set(false);
    }
  }

  async resetStats(): Promise<void> {
    const uid = this.user()?.uid;
    if (!uid || this.isBusy()) {
      return;
    }

    const confirmed = window.confirm('Reset all your stats? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    this.errorMessage.set('');
    this.isBusy.set(true);
    try {
      await this.statsService.resetUserStats(uid);
      this.activeDeck.set('');
      this.activeStake.set(null);
    } catch {
      this.errorMessage.set('Nao foi possivel resetar os stats.');
    } finally {
      this.isBusy.set(false);
    }
  }

  toggleRankingView(): void {
    this.showAllRanking.update((current) => !current);
  }

  private async consumeInbox(uid: string): Promise<void> {
    if (this.isSyncingInbox()) {
      return;
    }

    this.isSyncingInbox.set(true);
    try {
      await this.statsService.consumeInboxEvents(uid);
    } catch {
      this.errorMessage.set('Falha ao sincronizar eventos do mod.');
    } finally {
      this.isSyncingInbox.set(false);
    }
  }
}
