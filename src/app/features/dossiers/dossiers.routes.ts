// dossiers.routes.ts
import { Routes } from '@angular/router';

export const DOSSIER_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./dossiers-list.component').then(m => m.DossiersListComponent) },
  { path: 'nouveau', loadComponent: () => import('./dossier-form.component').then(m => m.DossierFormComponent) },
  { path: ':id', loadComponent: () => import('./dossier-detail.component').then(m => m.DossierDetailComponent) },
];
