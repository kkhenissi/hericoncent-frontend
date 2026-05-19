import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Consentement } from '../../shared/models/models';

@Component({
  selector: 'app-repondre-token',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="card">
        <!-- BRAND -->
        <div class="brand">
          <div class="brand-icon">⚖</div>
          <div class="brand-name">HériConsent</div>
        </div>

        @if (loading()) {
          <div class="loading"><div class="spinner"></div> Chargement...</div>
        }

        @if (!loading() && !token) {
          <div class="error-state">
            <div class="error-icon">⚠</div>
            <h2>Lien invalide</h2>
            <p>Ce lien de consentement est invalide ou a expiré.</p>
          </div>
        }

        @if (!loading() && done()) {
          <div class="success-state">
            <div class="success-icon">✓</div>
            <h2>Réponse enregistrée</h2>
            <p>Votre réponse a bien été prise en compte. Merci pour votre participation.</p>
          </div>
        }

        @if (!loading() && !done() && token) {
          <div class="content">
            <h2>Demande de consentement</h2>
            <p class="subtitle">Vous avez reçu une demande de consentement successoral. Veuillez lire attentivement avant de répondre.</p>

            @if (consentement()) {
              <div class="consent-info">
                <div class="info-row">
                  <span class="info-label">Objet</span>
                  <span class="info-value">{{ consentement()!.titre }}</span>
                </div>
                @if (consentement()!.description) {
                  <div class="info-row">
                    <span class="info-label">Détails</span>
                    <span class="info-value">{{ consentement()!.description }}</span>
                  </div>
                }
                <div class="info-row">
                  <span class="info-label">Type</span>
                  <span class="info-value">{{ consentement()!.typeAction }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Progression</span>
                  <div class="mini-progress">
                    <div class="mini-bar" [style.width.%]="consentement()!.progressPercent"></div>
                  </div>
                </div>
              </div>
            }

            <div class="legal-notice">
              <strong>⚖ Notice légale :</strong> Votre réponse sera horodatée et conservée comme preuve légale.
              Elle sera transmise au notaire responsable du dossier. Cette action est irrévocable.
            </div>

            <form [formGroup]="form" (ngSubmit)="submit()">
              <div class="field">
                <label>Commentaire (optionnel)</label>
                <textarea formControlName="commentaire" rows="3"
                          placeholder="Ajoutez un commentaire ou des réserves..."></textarea>
              </div>

              @if (error()) {
                <div class="alert-error">{{ error() }}</div>
              }

              <div class="action-btns">
                <button type="button" class="btn-rejeter"
                        (click)="form.patchValue({reponse: 'REJETE'}); submit()">
                  ✗ Je refuse
                </button>
                <button type="button" class="btn-accepter"
                        (click)="form.patchValue({reponse: 'ACCEPTE'}); submit()">
                  ✓ J'accepte
                </button>
              </div>
            </form>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');

    .page {
      min-height: 100vh; background: #1a1a2e;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; font-family: 'DM Sans', sans-serif;
    }

    .card {
      background: #f5f2ee; border-radius: 20px;
      padding: 40px; width: 100%; max-width: 520px;
    }

    .brand {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 28px; padding-bottom: 20px;
      border-bottom: 1px solid #e8e4de;
    }

    .brand-icon {
      font-size: 24px;
      background: linear-gradient(135deg, #c9a96e, #e8c98a);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }

    .brand-name {
      font-family: 'Playfair Display', serif;
      font-size: 18px; font-weight: 700; color: #1a1a2e;
    }

    h2 { font-family: 'Playfair Display', serif; font-size: 22px; color: #1a1a2e; margin: 0 0 8px; }

    .subtitle { color: #777; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }

    /* CONSENT INFO */
    .consent-info {
      background: #fff; border-radius: 12px; padding: 18px;
      display: flex; flex-direction: column; gap: 10px;
      margin-bottom: 18px; border: 1px solid #e8e4de;
    }

    .info-row { display: flex; align-items: flex-start; gap: 12px; }
    .info-label { font-size: 12px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; min-width: 80px; padding-top: 1px; }
    .info-value { font-size: 13px; color: #1a1a2e; font-weight: 500; }

    .mini-progress {
      flex: 1; height: 6px; background: #eee; border-radius: 10px; overflow: hidden; margin-top: 6px;
    }

    .mini-bar { height: 100%; background: linear-gradient(90deg, #c9a96e, #e8c98a); border-radius: 10px; }

    /* LEGAL */
    .legal-notice {
      background: rgba(201,169,110,0.08); border: 1px solid rgba(201,169,110,0.2);
      border-radius: 10px; padding: 14px 16px;
      font-size: 13px; color: #7a6030; line-height: 1.6;
      margin-bottom: 20px;
    }

    /* FORM */
    form { display: flex; flex-direction: column; gap: 16px; }

    .field { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 13px; font-weight: 600; color: #444; }

    textarea {
      padding: 11px 14px; border: 1.5px solid #ddd; border-radius: 10px;
      font-size: 14px; font-family: 'DM Sans', sans-serif;
      background: #fff; outline: none; transition: all 0.2s; resize: vertical;
    }

    textarea:focus { border-color: #c9a96e; }

    .alert-error {
      background: rgba(220,50,50,0.08); border: 1px solid rgba(220,50,50,0.2);
      border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #c33;
    }

    .action-btns { display: flex; gap: 10px; }

    .btn-accepter {
      flex: 2; padding: 14px;
      background: linear-gradient(135deg, #38a169, #2f855a);
      border: none; border-radius: 10px; color: #fff;
      font-size: 15px; font-weight: 700; cursor: pointer;
      font-family: 'DM Sans', sans-serif; transition: all 0.2s;
    }

    .btn-accepter:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(56,161,105,0.4); }

    .btn-rejeter {
      flex: 1; padding: 14px;
      background: rgba(220,50,50,0.08); border: 1.5px solid rgba(220,50,50,0.2);
      border-radius: 10px; color: #c33;
      font-size: 14px; font-weight: 600; cursor: pointer;
      font-family: 'DM Sans', sans-serif; transition: all 0.2s;
    }

    .btn-rejeter:hover { background: rgba(220,50,50,0.15); }

    /* STATES */
    .loading, .error-state, .success-state {
      text-align: center; padding: 40px 20px;
    }

    .loading { display: flex; align-items: center; justify-content: center; gap: 12px; color: #888; }

    .spinner {
      width: 22px; height: 22px;
      border: 2px solid #eee; border-top-color: #c9a96e;
      border-radius: 50%; animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-icon { font-size: 40px; color: #e05; margin-bottom: 12px; }
    .success-icon {
      width: 60px; height: 60px; background: #38a169;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 28px; color: #fff; margin: 0 auto 16px;
    }

    .error-state p, .success-state p { color: #777; font-size: 14px; }
  `]
})
export class RepondreTokenComponent implements OnInit {
  token: string | null = null;
  consentement = signal<Consentement | null>(null);
  loading = signal(true);
  done = signal(false);
  error = signal('');

  form = this.fb.group({
    reponse: ['', Validators.required],
    commentaire: ['']
  });

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (this.token) {
      // Charger info du consentement via token serait idéal;
      // pour l'instant on montre le formulaire directement
      this.loading.set(false);
    } else {
      this.loading.set(false);
    }
  }

  submit(): void {
    if (!this.token || !this.form.value.reponse) return;
    this.error.set('');

    this.api.repondreParToken(this.token, this.form.value as any).subscribe({
      next: (c) => {
        this.consentement.set(c);
        this.done.set(true);
      },
      error: (e) => {
        this.error.set(e.error?.message ?? 'Une erreur est survenue. Le lien est peut-être expiré.');
      }
    });
  }
}
