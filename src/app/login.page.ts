import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from './auth.service';
import { StatsService } from './stats.service';
import { UserRanking } from './stats.model';

@Component({
  selector: 'app-login-page',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly statsService = inject(StatsService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly errorMessage = signal('');
  readonly rankings = signal<UserRanking[]>([]);
  readonly isLoadingRankings = signal(false);

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) {
        this.router.navigateByUrl('/');
      }
    });
    
    this.loadRankings();
  }

  async signIn(): Promise<void> {
    this.errorMessage.set('');
    try {
      await this.authService.signInWithGoogle();
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';
      const detail =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : '';

      if (code) {
        this.errorMessage.set(`Falha no login: ${code}`);
      } else if (detail) {
        this.errorMessage.set(`Falha no login: ${detail}`);
      } else {
        this.errorMessage.set('Nao foi possivel autenticar com Google.');
      }
    }
  }

  private async loadRankings(): Promise<void> {
    try {
      this.isLoadingRankings.set(true);
      const data = await this.statsService.getGlobalRankings();
      this.rankings.set(data.slice(0, 10)); // Top 10
    } catch (error) {
      console.error('Erro ao carregar rankings:', error);
    } finally {
      this.isLoadingRankings.set(false);
    }
  }
}
