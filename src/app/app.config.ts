import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader, TranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

const hasFirebaseConfig =
  !!environment.firebase.apiKey &&
  environment.firebase.apiKey !== 'YOUR_API_KEY' &&
  !!environment.firebase.projectId &&
  environment.firebase.projectId !== 'YOUR_PROJECT_ID';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
    ...provideTranslateService({
      lang: 'en',
      fallbackLang: 'en',
      loader: TranslateHttpLoader
    }),
    ...provideTranslateHttpLoader({
      prefix: './i18n/',
      suffix: '.json'
    }),
    ...(hasFirebaseConfig
      ? [
          provideFirebaseApp(() => initializeApp(environment.firebase)),
          provideAuth(() => getAuth()),
          provideFirestore(() => getFirestore())
        ]
      : [])
  ]
};
