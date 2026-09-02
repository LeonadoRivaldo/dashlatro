import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth, { optional: true });
  private readonly currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly firebaseReady = computed(() => !!this.auth);

  constructor() {
    if (this.auth) {
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser.set(user);
      });
    }
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.auth) {
      throw new Error('Firebase Auth not configured');
    }
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async logout(): Promise<void> {
    if (!this.auth) {
      return;
    }
    await signOut(this.auth);
  }
}
