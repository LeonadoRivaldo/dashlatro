import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { StatsService } from '../../../../core/services/stats.service';
import { StakeKey, stakeToImage, stakeToLabel, stakeWeight } from '../../../../utils/stake.utils';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-dashboard-ranking-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppButtonComponent],
  templateUrl: './dashboard-ranking-card.component.html',
  styleUrl: './dashboard-ranking-card.component.scss'
})
export class DashboardRankingCardComponent {
  private readonly authService = inject(AuthService);
  private readonly statsService = inject(StatsService);

  readonly user = this.authService.user;
  readonly showAllRanking = signal(false);

  private readonly stats = toSignal(
    toObservable(computed(() => this.user()?.uid ?? null)).pipe(
      switchMap((uid) => (uid ? this.statsService.streamUserStats(uid) : of(null)))
    ),
    { initialValue: null }
  );

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

  toggleRankingView(): void {
    this.showAllRanking.update((current) => !current);
  }
}
