import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from '@angular/fire/firestore';
import { UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly firestore = inject(Firestore, { optional: true });
  private readonly localStore = new Map<string, UserProfile>();

  async ensureUserProfile(profile: UserProfile): Promise<void> {
    if (!this.firestore) {
      this.localStore.set(profile.userId, profile);
      return;
    }

    const ref = doc(this.firestore, 'users', profile.userId);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      await setDoc(
        ref,
        {
          userId: profile.userId,
          displayName: profile.displayName,
          email: profile.email ?? null,
          photoUrl: profile.photoUrl ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      return;
    }

    await setDoc(
      ref,
      {
        userId: profile.userId,
        displayName: profile.displayName,
        email: profile.email ?? null,
        photoUrl: profile.photoUrl ?? null,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }
}
