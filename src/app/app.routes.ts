import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { DashboardPage } from './dashboard.page';
import { LoginPage } from './login.page';

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
