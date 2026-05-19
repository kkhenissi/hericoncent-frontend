import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Dossier } from '../../shared/models/models';

@Component({
  selector: 'app-dossiers-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Dossiers</h1>
          <p>{{ total() }} dossier(s) au total</p>
        </div>
        @if (auth.isNotaire()) {
          <a routerLink="/dossiers/nouveau" class="btn-primary">+ Nouveau dossier</a>
        }
      </div>

      <!-- FILTRES -->
      <div class="filters">
        <input [(ngModel)]="search" placeholder="Rechercher par titre ou référence..." class="search-input">
        <div class="statut-filters">
          @for (s of statuts; track s.value) {
            <button (click)="filtreStatut.set(s.value)"
                    [class.active]="filtreStatut() === s.value"
                    class="filter-btn">
              {{ s.label }}
            </button>
          }
        </div>
      </div>

      <!-- TABLE -->
      @if (loading()) {
        <div class="loading"><div class="spinner"></div> Chargement...</div>
      } @else if (filtered().length === 0) {
        <div class="empty">
          <div class="empty-icon">⊟</div>
          <p>Aucun dossier trouvé</p>
        </div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Titre</th>
                <th>Adresse</th>
                <th>Héritiers</th>
                <th>Valeur estimée</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (d of filtered(); track d.id) {
                <tr>
                  <td><span class="ref-badge">{{ d.reference }}</span></td>
                  <td>
                    <div class="titre">{{ d.titre }}</div>
                    @if (d.description) {
                      <div class="desc">{{ d.description | slice:0:60 }}...</div>
                    }
                  </td>
                  <td class="addr">{{ d.adresseBien || '—' }}</td>
                  <td class="center">
                    <span class="count-badge">{{ d.nombreHeritiers }}</span>
                  </td>
                  <td>
                    @if (d.valeurEstimee) {
                      {{ d.valeurEstimee | currency:'EUR':'symbol':'1.0-0':'fr' }}
                    } @else { — }
                  </td>
                  <td><span class="statut" [class]="'s-' + d.statut.toLowerCase()">{{ statutLabel(d.statut) }}</span></td>
                  <td>
                    <a [routerLink]="['/dossiers', d.id]" class="btn-detail">Voir →</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');

    .page { padding: 40px; font-family: 'DM Sans', sans-serif; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 28px;
    }

    h1 { font-family: 'Playfair Display', serif; font-size: 26px; color: #1a1a2e; margin: 0 0 4px; }
    p { color: #888; font-size: 13px; margin: 0; }

    .btn-primary {
      padding: 11px 22px;
      background: linear-gradient(135deg, #c9a96e, #b8935a);
      border-radius: 10px; color: #fff;
      font-size: 14px; font-weight: 600;
      text-decoration: none; transition: all 0.2s;
    }

    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,169,110,0.4); }

    /* FILTRES */
    .filters { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }

    .search-input {
      flex: 1; min-width: 200px;
      padding: 10px 16px; border: 1.5px solid #ddd;
      border-radius: 10px; font-size: 14px;
      font-family: 'DM Sans', sans-serif; outline: none;
      background: #fff; transition: all 0.2s;
    }

    .search-input:focus { border-color: #c9a96e; }

    .statut-filters { display: flex; gap: 6px; }

    .filter-btn {
      padding: 8px 14px; border-radius: 20px;
      border: 1.5px solid #ddd; background: #fff;
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all 0.2s; font-family: 'DM Sans', sans-serif; color: #666;
    }

    .filter-btn.active, .filter-btn:hover {
      border-color: #c9a96e; background: rgba(201,169,110,0.1); color: #b8935a;
    }

    /* TABLE */
    .table-wrap {
      background: #fff; border-radius: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.05); overflow: hidden;
    }

    table { width: 100%; border-collapse: collapse; }

    thead { background: #f9f7f4; }

    th {
      padding: 13px 16px; text-align: left;
      font-size: 11px; font-weight: 700;
      color: #999; text-transform: uppercase; letter-spacing: 0.8px;
    }

    td { padding: 14px 16px; border-top: 1px solid #f0ede8; font-size: 13px; }

    tr:hover td { background: #faf8f5; }

    .ref-badge {
      font-size: 11px; font-weight: 700; color: #c9a96e;
      background: rgba(201,169,110,0.1); border-radius: 6px; padding: 3px 8px;
    }

    .titre { font-weight: 600; color: #1a1a2e; }
    .desc { font-size: 12px; color: #aaa; margin-top: 2px; }
    .addr { color: #777; font-size: 12px; }
    .center { text-align: center; }

    .count-badge {
      background: #eee; border-radius: 20px;
      padding: 3px 10px; font-size: 12px; font-weight: 700; color: #555;
    }

    .statut {
      font-size: 11px; font-weight: 600; padding: 4px 10px;
      border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .s-ouvert { background: rgba(72,187,120,0.12); color: #38a169; }
    .s-en_vente { background: rgba(66,153,225,0.12); color: #3182ce; }
    .s-bloque { background: rgba(237,137,54,0.12); color: #dd6b20; }
    .s-archive { background: rgba(160,160,160,0.12); color: #888; }
    .s-resolu { background: rgba(130,90,200,0.12); color: #805ad5; }

    .btn-detail {
      font-size: 12px; font-weight: 600; color: #c9a96e;
      text-decoration: none; padding: 6px 12px;
      border: 1px solid rgba(201,169,110,0.3); border-radius: 7px;
      transition: all 0.15s;
    }

    .btn-detail:hover { background: rgba(201,169,110,0.1); }

    .loading {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; padding: 60px; color: #888; font-size: 14px;
    }

    .spinner {
      width: 20px; height: 20px;
      border: 2px solid #eee; border-top-color: #c9a96e;
      border-radius: 50%; animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .empty { text-align: center; padding: 60px; color: #aaa; }
    .empty-icon { font-size: 36px; margin-bottom: 12px; }
  `]
})
export class DossiersListComponent implements OnInit {
  dossiers = signal<Dossier[]>([]);
  loading = signal(true);
  search = '';
  filtreStatut = signal('');

  statuts = [
    { value: '', label: 'Tous' },
    { value: 'OUVERT', label: 'Ouverts' },
    { value: 'EN_VENTE', label: 'En vente' },
    { value: 'BLOQUE', label: 'Bloqués' },
    { value: 'ARCHIVE', label: 'Archivés' },
  ];

  total = computed(() => this.filtered().length);

  filtered = computed(() => {
    return this.dossiers().filter(d => {
      const matchSearch = !this.search ||
        d.titre.toLowerCase().includes(this.search.toLowerCase()) ||
        d.reference.toLowerCase().includes(this.search.toLowerCase());
      const matchStatut = !this.filtreStatut() || d.statut === this.filtreStatut();
      return matchSearch && matchStatut;
    });
  });

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.api.getDossiers(this.auth.currentUser()?.userId ?? undefined).subscribe({
      next: d => { this.dossiers.set(d); this.loading.set(false); },
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
