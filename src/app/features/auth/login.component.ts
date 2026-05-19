import { Component, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  template: `
    <div class="login-page">
      <div class="login-left">
        <div class="brand">
          <div class="brand-emblem">⚖</div>
          <h1>HériConsent</h1>
          <p>Plateforme de gestion du consentement des héritiers</p>
        </div>
        <div class="features">
          <div class="feat"><span>⊙</span> Arbre généalogique dynamique</div>
          <div class="feat"><span>⊙</span> Signatures électroniques certifiées</div>
          <div class="feat"><span>⊙</span> Workflow 100% légal & sécurisé</div>
          <div class="feat"><span>⊙</span> Interface notaires intégrée</div>
        </div>
      </div>

      <div class="login-right">
        <div class="login-card">
          <div class="card-header">
            <h2>Connexion</h2>
            <p>Accédez à votre espace sécurisé</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="login-form">
            <div class="field">
              <label>Adresse email</label>
              <input type="email" formControlName="email"
                     placeholder="vous@exemple.fr"
                     [class.error]="hasError('email')">
              @if (hasError('email')) {
                <span class="err">Email invalide</span>
              }
            </div>

            <div class="field">
              <label>Mot de passe</label>
              <input [type]="showPwd() ? 'text' : 'password'"
                     formControlName="password"
                     placeholder="••••••••"
                     [class.error]="hasError('password')">
              <button type="button" class="pwd-toggle" (click)="showPwd.set(!showPwd())">
                {{ showPwd() ? '🙈' : '👁' }}
              </button>
            </div>

            @if (error()) {
              <div class="alert-error">{{ error() }}</div>
            }

            <button type="submit" class="btn-submit" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> }
              {{ loading() ? 'Connexion...' : 'Se connecter' }}
            </button>
          </form>

          <div class="card-footer">
            <p>Pas encore de compte ? <a routerLink="/auth/register">Créer un compte</a></p>
          </div>

          <div class="test-accounts">
            <div class="test-label">Comptes de test</div>
            <div class="test-btns">
              <button (click)="fillAdmin()" class="test-btn">Admin</button>
              <button (click)="fillNotaire()" class="test-btn">Notaire</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    .login-page {
      display: flex; min-height: 100vh;
      font-family: 'DM Sans', sans-serif;
    }

    /* LEFT */
    .login-left {
      flex: 1;
      background: #1a1a2e;
      display: flex; flex-direction: column;
      justify-content: center;
      padding: 60px;
    }

    .brand-emblem {
      font-size: 48px; margin-bottom: 16px;
      background: linear-gradient(135deg, #c9a96e, #e8c98a);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }

    .brand h1 {
      font-family: 'Playfair Display', serif;
      font-size: 36px; color: #fff;
      margin: 0 0 12px; font-weight: 700;
    }

    .brand p {
      color: rgba(255,255,255,0.45);
      font-size: 15px; max-width: 320px; line-height: 1.6;
    }

    .features { margin-top: 48px; display: flex; flex-direction: column; gap: 16px; }

    .feat {
      display: flex; align-items: center; gap: 12px;
      color: rgba(255,255,255,0.6); font-size: 14px;
    }

    .feat span { color: #c9a96e; font-size: 18px; }

    /* RIGHT */
    .login-right {
      width: 480px; min-width: 480px;
      background: #f5f2ee;
      display: flex; align-items: center; justify-content: center;
      padding: 40px;
    }

    .login-card {
      width: 100%; max-width: 380px;
    }

    .card-header { margin-bottom: 32px; }

    .card-header h2 {
      font-family: 'Playfair Display', serif;
      font-size: 28px; font-weight: 700;
      color: #1a1a2e; margin: 0 0 8px;
    }

    .card-header p { color: #888; font-size: 14px; }

    /* FORM */
    .login-form { display: flex; flex-direction: column; gap: 20px; }

    .field { display: flex; flex-direction: column; gap: 6px; position: relative; }

    label { font-size: 13px; font-weight: 600; color: #444; }

    input {
      padding: 13px 16px;
      border: 1.5px solid #ddd;
      border-radius: 10px;
      font-size: 14px;
      font-family: 'DM Sans', sans-serif;
      background: #fff;
      color: #1a1a2e;
      transition: all 0.2s; outline: none;
    }

    input:focus { border-color: #c9a96e; box-shadow: 0 0 0 3px rgba(201,169,110,0.12); }
    input.error { border-color: #e05; }

    .err { font-size: 12px; color: #e05; }

    .pwd-toggle {
      position: absolute; right: 12px; bottom: 11px;
      background: none; border: none; cursor: pointer; font-size: 16px;
    }

    .alert-error {
      background: rgba(220,50,50,0.08);
      border: 1px solid rgba(220,50,50,0.2);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px; color: #c33;
    }

    .btn-submit {
      padding: 14px;
      background: linear-gradient(135deg, #c9a96e, #b8935a);
      border: none; border-radius: 10px;
      color: #fff; font-size: 15px; font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.2s;
      font-family: 'DM Sans', sans-serif;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(201,169,110,0.4);
    }

    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .card-footer {
      margin-top: 20px; text-align: center;
      font-size: 13px; color: #888;
    }

    .card-footer a { color: #c9a96e; font-weight: 600; text-decoration: none; }
    .card-footer a:hover { text-decoration: underline; }

    .test-accounts {
      margin-top: 24px;
      padding: 16px;
      background: rgba(26,26,46,0.05);
      border-radius: 10px;
    }

    .test-label { font-size: 11px; color: #aaa; text-align: center; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }

    .test-btns { display: flex; gap: 8px; }

    .test-btn {
      flex: 1; padding: 8px;
      background: #1a1a2e;
      border: none; border-radius: 7px;
      color: #c9a96e; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      font-family: 'DM Sans', sans-serif;
    }

    .test-btn:hover { background: #2a2a4e; }

    @media (max-width: 768px) {
      .login-left { display: none; }
      .login-right { width: 100%; min-width: unset; }
    }
  `]
})
export class LoginComponent {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = signal(false);
  error = signal('');
  showPwd = signal(false);

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  hasError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.error.set(e.error?.message ?? 'Email ou mot de passe incorrect');
        this.loading.set(false);
      }
    });
  }

  fillAdmin(): void { this.form.setValue({ email: 'admin@hericonsent.fr', password: 'admin123' }); }
  fillNotaire(): void { this.form.setValue({ email: 'notaire@hericonsent.fr', password: 'admin123' }); }
}
