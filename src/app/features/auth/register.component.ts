import { Component, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="card">
        <div class="header">
          <div class="logo">⚖</div>
          <h2>Créer un compte</h2>
          <p>Rejoignez HériConsent</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="row">
            <div class="field">
              <label>Prénom</label>
              <input formControlName="prenom" placeholder="Jean">
            </div>
            <div class="field">
              <label>Nom</label>
              <input formControlName="nom" placeholder="Dupont">
            </div>
          </div>

          <div class="field">
            <label>Email</label>
            <input type="email" formControlName="email" placeholder="jean@exemple.fr">
          </div>

          <div class="field">
            <label>Téléphone</label>
            <input formControlName="telephone" placeholder="+33 6 00 00 00 00">
          </div>

          <div class="field">
            <label>Mot de passe</label>
            <input type="password" formControlName="password" placeholder="••••••••">
          </div>

          @if (error()) {
            <div class="alert-error">{{ error() }}</div>
          }

          <button type="submit" [disabled]="loading()">
            {{ loading() ? 'Création...' : 'Créer mon compte' }}
          </button>
        </form>

        <p class="footer-link">Déjà un compte ? <a routerLink="/auth/login">Se connecter</a></p>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');

    .page {
      min-height: 100vh; background: #1a1a2e;
      display: flex; align-items: center; justify-content: center;
      font-family: 'DM Sans', sans-serif; padding: 20px;
    }

    .card {
      background: #f5f2ee; border-radius: 20px;
      padding: 40px; width: 100%; max-width: 460px;
    }

    .header { text-align: center; margin-bottom: 32px; }

    .logo {
      font-size: 36px; margin-bottom: 12px;
      background: linear-gradient(135deg, #c9a96e, #e8c98a);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }

    h2 { font-family: 'Playfair Display', serif; color: #1a1a2e; margin: 0 0 6px; }
    p { color: #888; font-size: 14px; margin: 0; }

    form { display: flex; flex-direction: column; gap: 16px; }

    .row { display: flex; gap: 12px; }
    .row .field { flex: 1; }

    .field { display: flex; flex-direction: column; gap: 5px; }
    label { font-size: 13px; font-weight: 600; color: #444; }

    input {
      padding: 12px 14px; border: 1.5px solid #ddd; border-radius: 10px;
      font-size: 14px; font-family: 'DM Sans', sans-serif;
      background: #fff; color: #1a1a2e; outline: none; transition: all 0.2s;
    }

    input:focus { border-color: #c9a96e; box-shadow: 0 0 0 3px rgba(201,169,110,0.12); }

    .alert-error {
      background: rgba(220,50,50,0.08); border: 1px solid rgba(220,50,50,0.2);
      border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #c33;
    }

    button[type="submit"] {
      padding: 14px; margin-top: 4px;
      background: linear-gradient(135deg, #c9a96e, #b8935a);
      border: none; border-radius: 10px;
      color: #fff; font-size: 15px; font-weight: 600;
      cursor: pointer; font-family: 'DM Sans', sans-serif;
      transition: all 0.2s;
    }

    button[type="submit"]:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(201,169,110,0.4);
    }

    button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }

    .footer-link { text-align: center; margin-top: 20px; font-size: 13px; color: #888; }
    .footer-link a { color: #c9a96e; font-weight: 600; text-decoration: none; }
  `]
})
export class RegisterComponent {
  form = this.fb.group({
    prenom: ['', Validators.required],
    nom: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = signal(false);
  error = signal('');

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');

    this.auth.register(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.error.set(e.error?.message ?? 'Erreur lors de la création du compte');
        this.loading.set(false);
      }
    });
  }
}
