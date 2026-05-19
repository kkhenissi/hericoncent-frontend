import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Dossier } from '../../shared/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <h1>Bonjour, {{ prenom() }} 👋</h1>
          <p>Voici l'état de vos dossiers successoraux</p>
        </div>
        @if (auth.isNotaire()) {
          <a routerLink="/dossiers/nouveau" class="btn-primary">
            + Nouveau dossier
          </a>
        }
      </div>

      <!-- STATS -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon gold">⊟</div>
          <div class="stat-body">
            <div class="stat-value">{{ total() }}</div>
            <div class="stat-label">Dossiers au total</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">◎</div>
          <div class="stat-body">
            <div class="stat-value">{{ ouverts() }}</div>
            <div class="stat-label">Dossiers ouverts</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">✦</div>
          <div class="stat-body">
            <div class="stat-value">{{ enVente() }}</div>
            <div class="stat-label">En cours de vente</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">△</div>
          <div class="stat-body">
            <div class="stat-value">{{ totalHeritiers() }}</div>
            <div class="stat-label">Héritiers gérés</div>
          </div>
        </div>
      </div>

      <!-- DOSSIERS RÉCENTS -->
      <div class="section">
        <div class="section-header">
          <h2>Dossiers récents</h2>
          <a routerLink="/dossiers" class="link-all">Voir tous →</a>
        </div>

        @if (loading()) {
          <div class="loading">
            <div class="spinner"></div>
            <span>Chargement des dossiers...</span>
          </div>
        } @else if (dossiers().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">⊟</div>
            <h3>Aucun dossier</h3>
            <p>Vous n'avez pas encore de dossier successoral.</p>
            @if (auth.isNotaire()) {
              <a routerLink="/dossiers/nouveau" class="btn-primary">Créer un dossier</a>
            }
          </div>
        } @else {
          <div class="dossiers-list">
            @for (d of dossiers().slice(0, 5); track d.id) {
              <a [routerLink]="['/dossiers', d.id]" class="dossier-row">
                <div class="dossier-ref">{{ d.reference }}</div>
                <div class="dossier-info">
                  <div class="dossier-titre">{{ d.titre }}</div>
                  <div class="dossier-meta">
                    {{ d.nombreHeritiers }} héritiers · {{ d.nombreConsentements }} consentements
                  </div>
                </div>
                <div class="dossier-statut" [class]="'statut-' + d.statut.toLowerCase()">
                  {{ statutLabel(d.statut) }}
                </div>
                <div class="dossier-arrow">→</div>
              </a>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');

    .page { padding: 40px; font-family: 'DM Sans', sans-serif; max-width: 1100px; }

    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 36px;
    }

    .page-header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 28px; color: #1a1a2e; margin: 0 0 6px;
    }

    .page-header p { color: #888; font-size: 14px; margin: 0; }

    .btn-primary {
      padding: 12px 24px;
      background: linear-gradient(135deg, #c9a96e, #b8935a);
      border-radius: 10px; color: #fff;
      font-size: 14px; font-weight: 600;
      text-decoration: none; white-space: nowrap;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(201,169,110,0.4);
    }

    /* STATS */
    .stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin-bottom: 36px;
    }

    .stat-card {
      background: #fff; border-radius: 14px;
      padding: 20px; display: flex; gap: 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
      transition: transform 0.2s;
    }

    .stat-card:hover { transform: translateY(-2px); }

    .stat-icon {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }

    .gold { background: rgba(201,169,110,0.15); color: #c9a96e; }
    .green { background: rgba(72,187,120,0.15); color: #38a169; }
    .blue { background: rgba(66,153,225,0.15); color: #3182ce; }
    .orange { background: rgba(237,137,54,0.15); color: #dd6b20; }

    .stat-value {
      font-size: 28px; font-weight: 700; color: #1a1a2e;
      line-height: 1;
    }

    .stat-label { font-size: 12px; color: #888; margin-top: 4px; }

    /* SECTION */
    .section {
      background: #fff; border-radius: 16px;
      padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    }

    .section-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      font-family: 'Playfair Display', serif;
      font-size: 18px; color: #1a1a2e; margin: 0;
    }

    .link-all { font-size: 13px; color: #c9a96e; font-weight: 600; text-decoration: none; }

    /* DOSSIERS LIST */
    .dossiers-list { display: flex; flex-direction: column; gap: 2px; }

    .dossier-row {
      display: flex; align-items: center; gap: 16px;
      padding: 14px 16px; border-radius: 10px;
      text-decoration: none; color: inherit;
      transition: background 0.15s;
    }

    .dossier-row:hover { background: #f5f2ee; }

    .dossier-ref {
      font-size: 11px; font-weight: 700; color: #c9a96e;
      background: rgba(201,169,110,0.1); border-radius: 6px;
      padding: 3px 8px; white-space: nowrap;
    }

    .dossier-info { flex: 1; }

    .dossier-titre { font-size: 14px; font-weight: 600; color: #1a1a2e; }
    .dossier-meta { font-size: 12px; color: #aaa; margin-top: 2px; }

    .dossier-statut {
      font-size: 11px; font-weight: 600; padding: 4px 10px;
      border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;
    }

    .statut-ouvert { background: rgba(72,187,120,0.12); color: #38a169; }
    .statut-en_vente { background: rgba(66,153,225,0.12); color: #3182ce; }
    .statut-bloque { background: rgba(237,137,54,0.12); color: #dd6b20; }
    .statut-archive { background: rgba(160,160,160,0.12); color: #888; }
    .statut-resolu { background: rgba(130,90,200,0.12); color: #805ad5; }

    .dossier-arrow { color: #ccc; font-size: 16px; }

    /* LOADING & EMPTY */
    .loading {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; padding: 40px; color: #888; font-size: 14px;
    }

    .spinner {
      width: 20px; height: 20px;
      border: 2px solid #eee; border-top-color: #c9a96e;
      border-radius: 50%; animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      text-align: center; padding: 48px 20px;
    }

    .empty-icon { font-size: 40px; color: #ddd; margin-bottom: 12px; }
    .empty-state h3 { color: #1a1a2e; margin: 0 0 8px; }
    .empty-state p { color: #888; font-size: 14px; margin: 0 0 20px; }

    @media (max-width: 900px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .page { padding: 20px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  dossiers = signal<Dossier[]>([]);
  loading = signal(true);

  total = computed(() => this.dossiers().length);
  ouverts = computed(() => this.dossiers().filter(d => d.statut === 'OUVERT').length);
  enVente = computed(() => this.dossiers().filter(d => d.statut === 'EN_VENTE').length);
  totalHeritiers = computed(() => this.dossiers().reduce((s, d) => s + d.nombreHeritiers, 0));

  prenom = computed(() => {
    const email = this.auth.currentUser()?.email ?? '';
    return email.split('@')[0];
  });

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.api.getDossiers(this.auth.currentUser()?.userId ?? undefined).subscribe({
      next: (d) => { this.dossiers.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  statutLabel(s: string): string {
    const m: Record<string, string> = {
      OUVERT: 'Ouvert', EN_VENTE: 'En vente',
      BLOQUE: 'Bloqué', ARCHIVE: 'Archivé', RESOLU: 'Résolu'
    };
    return m[s] ?? s;
  }
}
