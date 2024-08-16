import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { isNotAuthenticatedGuard, isAuthenticatedGuard } from './auth/guards';
import { NavigationGuard } from './auth/guards/navigation.guard';

const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [NavigationGuard],
    loadChildren: () =>
      import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'website',
    canActivate: [NavigationGuard, isAuthenticatedGuard],
    loadChildren: () =>
      import('./website/website.module').then((m) => m.WebsiteModule),
  },
  {
    path: 'auth',
    canActivate: [NavigationGuard, isNotAuthenticatedGuard],
    loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'sales',
    canActivate: [NavigationGuard, isAuthenticatedGuard],
    loadChildren: () =>
      import('./sales/sales.module').then((m) => m.SalesModule),
  },
  {
    path: 'support',
    canActivate: [NavigationGuard, isAuthenticatedGuard],
    loadChildren: () =>
      import('./support/support.module').then((m) => m.SupportModule),
  },
  {
    path: 'users',
    canActivate: [NavigationGuard, isAuthenticatedGuard],
    loadChildren: () =>
      import('./users/users.module').then((m) => m.UsersModule),
  },
  {
    path: 'chat',
    canActivate: [NavigationGuard, isAuthenticatedGuard],
    loadChildren: () => import('./chat/chat.module').then((m) => m.ChatModule),
  },
  {
    path: '**',
    redirectTo: 'auth',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
