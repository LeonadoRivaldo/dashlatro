import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StatsService } from '../../core/services/stats.service';
import { DashboardCurrentRunCardComponent } from './components/dashboard-current-run-card/dashboard-current-run-card.component';
import { DashboardRankingCardComponent } from './components/dashboard-ranking-card/dashboard-ranking-card.component';
import { DashboardWinRateCardComponent } from './components/dashboard-win-rate-card/dashboard-win-rate-card.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CommonModule,
    DashboardWinRateCardComponent,
    DashboardCurrentRunCardComponent,
    DashboardRankingCardComponent
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
})
export class DashboardPage {
  private readonly authService = inject(AuthService);
  private readonly statsService = inject(StatsService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly errorMessage = signal('');
  readonly isSyncingInbox = signal(false);

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
