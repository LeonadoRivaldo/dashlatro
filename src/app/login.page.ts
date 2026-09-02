import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login-page',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly errorMessage = signal('');

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) {
        this.router.navigateByUrl('/');
      }
    });
  }

  async signIn(): Promise<void> {
    this.errorMessage.set('');
    try {
      await this.authService.signInWithGoogle();
    } catch {
      this.errorMessage.set('Nao foi possivel autenticar com Google.');
    }
  }
}
