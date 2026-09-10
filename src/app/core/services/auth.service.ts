import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from '@angular/fire/auth';
import { StatsService } from './stats.service';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth, { optional: true });
  private readonly statsService = inject(StatsService);
  private readonly userService = inject(UserService);
  private readonly currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly firebaseReady = computed(() => !!this.auth);

  constructor() {
    if (this.auth) {
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser.set(user);

        if (user) {
          void Promise.all([
            this.userService.ensureUserProfile({
              userId: user.uid,
              displayName: user.displayName ?? 'Anonymous Player',
              email: user.email,
              photoUrl: user.photoURL
            }),
            this.statsService.ensureUserStats(user.uid)
          ]);
        }
      });
    }
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.auth) {
      throw new Error('Firebase Auth not configured');
    }

    const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
    await Promise.all([
      this.userService.ensureUserProfile({
        userId: credential.user.uid,
        displayName: credential.user.displayName ?? 'Anonymous Player',
        email: credential.user.email,
        photoUrl: credential.user.photoURL
      }),
      this.statsService.ensureUserStats(credential.user.uid)
    ]);
  }

  async logout(): Promise<void> {
    if (!this.auth) {
      return;
    }
    await signOut(this.auth);
  }
}
