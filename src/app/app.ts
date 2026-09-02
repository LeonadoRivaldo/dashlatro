import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';

type LanguageCode = 'en' | 'pt-br' | 'es' | 'fr';

interface LanguageOption {
  code: LanguageCode;
  flag: string;
  label: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);

  readonly user = this.authService.user;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly languageMenuOpen = signal(false);

  readonly languageOptions: LanguageOption[] = [
    { code: 'en', flag: 'flags/en.png', label: 'English' },
    { code: 'pt-br', flag: 'flags/pt-br.png', label: 'Portuguese (Brazil)' },
    { code: 'es', flag: 'flags/es.png', label: 'Spanish' },
    { code: 'fr', flag: 'flags/fr.png', label: 'French' }
  ];

  readonly currentLanguage = signal<LanguageCode>('en');

  constructor() {
    const saved = localStorage.getItem('dashlatro-language');
    const initial = this.isLanguageCode(saved) ? saved : 'en';
    this.currentLanguage.set(initial);

    this.translateService.addLangs(this.languageOptions.map((option) => option.code));
    this.translateService.setFallbackLang('en');
    this.translateService.use(initial);
  }

  toggleLanguageMenu(): void {
    this.languageMenuOpen.set(!this.languageMenuOpen());
  }

  setLanguage(code: LanguageCode): void {
    this.currentLanguage.set(code);
    this.translateService.use(code);
    localStorage.setItem('dashlatro-language', code);
    this.languageMenuOpen.set(false);
  }

  currentFlag(): string {
    return this.languageOptions.find((option) => option.code === this.currentLanguage())?.flag ?? 'flags/en.png';
  }

  private isLanguageCode(value: string | null): value is LanguageCode {
    return value === 'en' || value === 'pt-br' || value === 'es' || value === 'fr';
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.logout();
      this.languageMenuOpen.set(false);
      await this.router.navigateByUrl('/login');
    } catch {
      // Ignore logout errors in navbar action.
    }
  }
}
