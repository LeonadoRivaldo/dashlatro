import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { of, switchMap } from 'rxjs';
import { StatsService } from '../../../../core/services/stats.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StakeKey, stakeToLabel, stakeWeight } from '../../../../utils/stake.utils';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-dashboard-win-rate-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppButtonComponent],
  templateUrl: './dashboard-win-rate-card.component.html',
  styleUrl: './dashboard-win-rate-card.component.scss'
})
export class DashboardWinRateCardComponent {
  private readonly authService = inject(AuthService);
  private readonly statsService = inject(StatsService);

  readonly user = this.authService.user;
  readonly isBusy = signal(false);
  readonly errorMessage = signal('');

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

  readonly winStreakCurrent = computed(() => this.stats()?.winStreak.current ?? 0);
  readonly winStreakBest = computed(() => this.stats()?.winStreak.best ?? 0);
  readonly mostPlayed = computed(() => this.rankingAll()[0] ?? null);

  stakeLabel(stake: StakeKey): string {
    return stakeToLabel(stake);
  }

  deckImage(deck: string): string {
    const slug = deck
      .trim()
      .toLowerCase()
      .replace(/\s+deck$/, '')
      .replace(/\s+/g, '-');
    return `decks/${slug}.png`;
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
    } catch {
      this.errorMessage.set('Nao foi possivel resetar os stats.');
    } finally {
      this.isBusy.set(false);
    }
  }
}
