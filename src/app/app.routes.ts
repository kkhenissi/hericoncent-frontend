import { Routes } from '@angular/router';
import { authGuard, notaireGuard } from './core/interceptors/auth.interceptor';
import { FamilyTreeComponent } from '../app/family-tree/src/app/family-tree/family-tree.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'dossiers',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dossiers/dossiers.routes').then(m => m.DOSSIER_ROUTES)
  },
  {
    path: 'consentements/repondre',
    loadComponent: () => import('./features/consentements/repondre-token.component').then(m => m.RepondreTokenComponent)
  },
  
  { path: 'arbre', component: FamilyTreeComponent },
  { path: 'dossiers/:dossierId/arbre', component: FamilyTreeComponent },
  { path: '**', redirectTo: 'dashboard' },
];
