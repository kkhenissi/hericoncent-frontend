// dossier-form.component.ts
import { Component, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

import { Component as NgComponent } from '@angular/core';

@NgComponent({
  selector: 'app-dossier-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="page">
      <div class="card">
        <h1>Nouveau dossier</h1>
        <p>Créez un dossier de gestion d'indivision</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label>Titre du dossier *</label>
            <input formControlName="titre" placeholder="Ex : Maison familiale rue des Lilas">
          </div>

          <div class="field">
            <label>Description</label>
            <textarea formControlName="description" rows="3"
                      placeholder="Décrivez brièvement le bien et la situation successorale..."></textarea>
          </div>

          <div class="row">
            <div class="field">
              <label>Référence cadastrale</label>
              <input formControlName="referenceCadastrale" placeholder="AA1234567">
            </div>
            <div class="field">
              <label>Valeur estimée (€)</label>
              <input type="number" formControlName="valeurEstimee" placeholder="250000">
            </div>
          </div>

          <div class="field">
            <label>Adresse du bien</label>
            <input formControlName="adresseBien" placeholder="12 rue des Lilas, 75001 Paris">
          </div>

          @if (error()) {
            <div class="alert-error">{{ error() }}</div>
          }

          <div class="btn-row">
            <button type="button" class="btn-cancel" (click)="router.navigate(['/dossiers'])">Annuler</button>
            <button type="submit" class="btn-submit" [disabled]="loading()">
              {{ loading() ? 'Création...' : 'Créer le dossier' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');

    .page { padding: 40px; font-family: 'DM Sans', sans-serif; }

    .card {
      background: #fff; border-radius: 16px; padding: 36px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.06); max-width: 680px;
    }

    h1 { font-family: 'Playfair Display', serif; font-size: 24px; color: #1a1a2e; margin: 0 0 6px; }
    p { color: #888; font-size: 14px; margin: 0 0 28px; }

    form { display: flex; flex-direction: column; gap: 18px; }

    .row { display: flex; gap: 14px; }
    .row .field { flex: 1; }

    .field { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 13px; font-weight: 600; color: #444; }

    input, textarea {
      padding: 11px 14px; border: 1.5px solid #ddd; border-radius: 10px;
      font-size: 14px; font-family: 'DM Sans', sans-serif;
      background: #fff; outline: none; transition: all 0.2s; resize: vertical;
    }

    input:focus, textarea:focus { border-color: #c9a96e; box-shadow: 0 0 0 3px rgba(201,169,110,0.1); }

    .alert-error {
      background: rgba(220,50,50,0.08); border: 1px solid rgba(220,50,50,0.2);
      border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #c33;
    }

    .btn-row { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }

    .btn-cancel {
      padding: 11px 22px; background: #f5f2ee;
      border: 1.5px solid #ddd; border-radius: 10px;
      color: #666; font-size: 14px; font-weight: 600;
      cursor: pointer; font-family: 'DM Sans', sans-serif;
    }

    .btn-submit {
      padding: 11px 28px;
      background: linear-gradient(135deg, #c9a96e, #b8935a);
      border: none; border-radius: 10px; color: #fff;
      font-size: 14px; font-weight: 600; cursor: pointer;
      font-family: 'DM Sans', sans-serif; transition: all 0.2s;
    }

    .btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,169,110,0.4); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class DossierFormComponent {
  form = this.fb.group({
    titre: ['', Validators.required],
    description: [''],
    referenceCadastrale: [''],
    valeurEstimee: [null],
    adresseBien: ['']
  });

  loading = signal(false);
  error = signal('');

  constructor(private fb: FormBuilder, private api: ApiService, public router: Router, private auth: AuthService) {}

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    const payload = {
      ...this.form.value,
      notaireId: this.auth.currentUser()?.userId
    };
    this.api.createDossier(payload as any).subscribe({
      next: (d) => this.router.navigate(['/dossiers', d.id]),
      error: (e) => { this.error.set(e.error?.message ?? 'Erreur'); this.loading.set(false); }
    });
  }
}
