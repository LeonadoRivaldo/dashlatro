import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { of, switchMap } from 'rxjs';
import { MatchResult } from '../../../../core/models/stats.model';
import { AuthService } from '../../../../core/services/auth.service';
import { StatsService } from '../../../../core/services/stats.service';
import { STAKE_ORDER, StakeKey, stakeToImage, stakeToLabel } from '../../../../utils/stake.utils';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppToggleButtonComponent } from '../../../../shared/components/app-button/app-toggle-button';

@Component({
  selector: 'app-dashboard-current-run-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppButtonComponent, AppToggleButtonComponent],
  templateUrl: './dashboard-current-run-card.component.html',
  styleUrl: './dashboard-current-run-card.component.scss'
})
export class DashboardCurrentRunCardComponent {
  private readonly authService = inject(AuthService);
  private readonly statsService = inject(StatsService);

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
  readonly isBusy = signal(false);
  readonly errorMessage = signal('');
  readonly autoDraw = signal(true);
  readonly manualRun = signal(false);
  readonly selectedDeckIndex = signal(0);
  readonly selectedStakeIndex = signal(0);
  readonly runModeStates = [
    {
      state: 'on' as const,
      type: 'success' as const,
      label: 'Manual Run'
    },
    {
      state: 'off' as const,
      type: 'neutral' as const,
      label: 'Auto Run'
    }
  ];
  
  readonly activeDeck = signal('');
  readonly activeStake = signal<StakeKey | null>(null);
  readonly selectedDeck = computed(
    () => this.deckOptions[this.selectedDeckIndex()] ?? this.deckOptions[0] ?? ''
  );
  readonly selectedStake = computed(
    () => this.stakeOptions[this.selectedStakeIndex()] ?? this.stakeOptions[0] ?? 'white'
  );
  


  private readonly stats = toSignal(
    toObservable(computed(() => this.user()?.uid ?? null)).pipe(
      switchMap((uid) => (uid ? this.statsService.streamUserStats(uid) : of(null)))
    ),
    { initialValue: null }
  );



  readonly rerollsRemaining = computed(() => this.stats()?.rerollsRemaining ?? 0);
  readonly hasCurrentPlaying = computed(() => !!this.activeDeck() && !!this.activeStake());

  constructor() {
    effect(() => {
      const data = this.stats();
      if (!data) {
        return;
      }
      const { deck, stake } = data.currentPlaying;
      if(deck && stake){
        this.activeDeck.set(deck);
        this.activeStake.set(stake);
        const deckIndex = this.deckOptions.indexOf(deck);
        if (deckIndex >= 0) {
          this.selectedDeckIndex.set(deckIndex);
        }

        const stakeIndex = this.stakeOptions.indexOf(stake);
        if (stakeIndex >= 0) {
          this.selectedStakeIndex.set(stakeIndex);
        }
      }
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

  private async startRun(deck: string, stake: StakeKey, errorText: string): Promise<void> {
    const uid = this.user()?.uid;
    if (!uid || !deck || !stake) {
      return;
    }

    this.errorMessage.set('');
    this.isBusy.set(true);
    try {
      await this.statsService.updateCurrentPlaying(uid, {
        deck,
        stake,
        notes: ''
      });
      this.activeDeck.set(deck);
      this.activeStake.set(stake);
    } catch {
      this.errorMessage.set(errorText);
    } finally {
      this.isBusy.set(false);
    }
  }

  async drawRandomRun(): Promise<void> {
    if (this.hasCurrentPlaying() && !this.autoDraw()) {
      return;
    }

    const nextDeck = this.deckOptions[Math.floor(Math.random() * this.deckOptions.length)];
    const nextStake = this.stakeOptions[Math.floor(Math.random() * this.stakeOptions.length)] ?? 'white';
    await this.startRun(nextDeck, nextStake, 'Nao foi possivel iniciar o run atual.');
  }

  previousDeck(): void {
    const total = this.deckOptions.length;
    if (!total) {
      return;
    }

    this.selectedDeckIndex.set((this.selectedDeckIndex() - 1 + total) % total);
  }

  nextDeck(): void {
    const total = this.deckOptions.length;
    if (!total) {
      return;
    }

    this.selectedDeckIndex.set((this.selectedDeckIndex() + 1) % total);
  }

  previousStake(): void {
    const total = this.stakeOptions.length;
    if (!total) {
      return;
    }

    this.selectedStakeIndex.set((this.selectedStakeIndex() - 1 + total) % total);
  }

  nextStake(): void {
    const total = this.stakeOptions.length;
    if (!total) {
      return;
    }

    this.selectedStakeIndex.set((this.selectedStakeIndex() + 1) % total);
  }

  async startManualRun(): Promise<void> {
    if (this.hasCurrentPlaying() || this.isBusy()) {
      return;
    }

    const deck = this.selectedDeck();
    const stake = this.selectedStake();
    await this.startRun(deck, stake, 'Nao foi possivel iniciar o run manual.');
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
      
      if(this.autoDraw()){
        await this.drawRandomRun();
        return;
      }
      
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
}
