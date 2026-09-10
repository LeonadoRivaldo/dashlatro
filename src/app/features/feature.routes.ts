import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { DashboardPage } from './dashboard/dashboard.page';
import { LoginPage } from './login/login.page';

export const routes: Routes = [
  {
    path: '',
    component: DashboardPage,
    canActivate: [authGuard]
  },
  {
    path: 'login',
    component: LoginPage
  },
  {
    path: '**',
    redirectTo: ''
  }
];
