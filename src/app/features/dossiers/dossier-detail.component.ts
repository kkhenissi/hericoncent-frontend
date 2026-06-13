import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DossierDetail } from '../../shared/models/models';

@Component({
  selector: 'app-dossier-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="loading"><div class="spinner"></div> Chargement...</div>
      } @else if (dossier()) {
        <!-- HEADER -->
        <div class="dossier-header">
          <div class="header-left">
            <span class="ref-tag">{{ dossier()!.reference }}</span>
            <h1>{{ dossier()!.titre }}</h1>
            @if (dossier()!.adresseBien) {
              <div class="addr">📍 {{ dossier()!.adresseBien }}</div>
            }
          </div>
          <div class="header-right">
            <span class="statut" [class]="'s-' + dossier()!.statut.toLowerCase()">
              {{ statutLabel(dossier()!.statut) }}
            </span>
            @if (dossier()!.valeurEstimee) {
              <div class="valeur">
                {{ dossier()!.valeurEstimee | currency:'EUR':'symbol':'1.0-0':'fr' }}
              </div>
            }
          </div>
        </div>

        <!-- TABS -->
        <div class="tabs">
          <button (click)="switchTab('heritiers')" [class.active]="activeTab() === 'heritiers'" class="tab">
            Héritiers ({{ heritiersActifs().length }})
          </button>
          <button (click)="switchTab('consentements')" [class.active]="activeTab() === 'consentements'" class="tab">
            Consentements ({{ dossier()!.consentements.length }})
          </button>
          <button (click)="switchTab('documents')" [class.active]="activeTab() === 'documents'" class="tab">
            Documents ({{ dossier()!.documents.length }})
          </button>
        </div>

        <!-- TAB: HÉRITIERS -->
        @if (activeTab() === 'heritiers') {
          <div class="tab-content">
            <!-- Formulaire ajout -->
            @if (auth.isNotaire()) {
              <div class="form-card">
                <div class="form-card__header">
                  <h3>Ajouter un héritier</h3>
                  <a [routerLink]="['/dossiers', dossier()!.id, 'arbre']" class="btn-secondary">Voir l'arbre familial</a>
                </div>
                <form [formGroup]="heritierForm" (ngSubmit)="ajouterHeritier()">
                  <div class="form-row">
                    <div class="field"><label>Prénom</label><input formControlName="prenom" placeholder="Jean"></div>
                    <div class="field"><label>Nom</label><input formControlName="nom" placeholder="Dupont"></div>
                    <div class="field"><label>Email</label><input formControlName="email" placeholder="jean@ex.fr" type="email"></div>
                    <div class="field"><label>Part (0–1)</label><input formControlName="part" placeholder="0.25" type="number" step="0.01" min="0" max="1"></div>
                  </div>
                  <button type="submit" [disabled]="addingHeritier()">
                    {{ addingHeritier() ? 'Ajout...' : '+ Ajouter' }}
                  </button>
                </form>
              </div>
            }

            <!-- Liste (uniquement les membres cochés comme héritiers dans l'arbre) -->
            <div class="cards-grid">
              @for (h of heritiersActifs(); track h.id) {
                <div class="heritier-card" [class.heritier-card--editing]="editingHeritierId() === h.id">
                  <div class="h-avatar">{{ h.nomComplet.charAt(0) }}</div>
                  <div class="h-info">
                    <div class="h-name">{{ h.nomComplet }}</div>

                    @if (editingHeritierId() === h.id) {
                      <!-- Mode édition -->
                      <div class="h-edit-fields">
                        <div class="h-edit-field">
                          <label>Email</label>
                          <input type="email" [(ngModel)]="editEmail" placeholder="email@exemple.com" />
                        </div>
                        <div class="h-edit-field">
                          <label>
                            Part (0–1)
                            <span class="part-dispo">
                              disponible : {{ partDisponible(h.id) | number:'1.0-2' }}
                              ({{ (partDisponible(h.id) * 100) | number:'1.0-0' }}&nbsp;%)
                            </span>
                          </label>
                          <input type="number" [(ngModel)]="editPart"
                                 step="0.01" min="0" [max]="partDisponible(h.id)"
                                 placeholder="0.25"
                                 [class.input-error]="editPart !== null && editPart > partDisponible(h.id)" />
                          @if (editPart !== null && editPart > partDisponible(h.id)) {
                            <span class="part-error">
                              Dépasse la limite — max {{ (partDisponible(h.id) * 100) | number:'1.0-0' }}&nbsp;%
                            </span>
                          }
                        </div>
                      </div>
                      @if (saveHeritierError()) {
                        <div class="save-error">{{ saveHeritierError() }}</div>
                      }
                      <div class="h-edit-actions">
                        <button class="btn-save-heir"
                                (click)="saveHeritier(h.id)"
                                [disabled]="savingHeritierId() === h.id || (editPart !== null && editPart > partDisponible(h.id))">
                          @if (savingHeritierId() === h.id) { ... } @else { Enregistrer }
                        </button>
                        <button class="btn-cancel-heir" (click)="cancelEditHeritier()">Annuler</button>
                      </div>
                    } @else {
                      <!-- Mode affichage -->
                      <div class="h-email" [class.h-email--missing]="!h.email">
                        {{ h.email || 'Email non renseigné' }}
                      </div>
                      <div class="h-meta">
                        <span class="part-badge" [class.part-badge--zero]="!h.part">
                          {{ h.part ? (h.part * 100).toFixed(0) + '%' : 'Part non définie' }}
                        </span>
                        <span class="contact-badge" [class]="'c-' + h.statutContact.toLowerCase()">
                          {{ contactLabel(h.statutContact) }}
                        </span>
                      </div>
                      @if (auth.isNotaire()) {
                        <button class="btn-edit-heir" (click)="startEditHeritier(h)">Modifier</button>
                      }
                    }
                  </div>
                  @if (h.identityVerified) {
                    <div class="verified-badge" title="Identité vérifiée">✓</div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB: CONSENTEMENTS -->
        @if (activeTab() === 'consentements') {
          <div class="tab-content">
            <div class="refresh-bar">
              <span class="refresh-hint">Mise à jour automatique toutes les 10s</span>
              <button class="btn-refresh" (click)="silentRefresh()" title="Actualiser maintenant">↻ Actualiser</button>
            </div>
            @if (auth.isNotaire()) {
              <div class="form-card">
                <h3>Créer une demande de consentement</h3>
                <form [formGroup]="consentForm" (ngSubmit)="creerConsentement()">
                  <div class="form-row">
                    <div class="field"><label>Titre</label><input formControlName="titre" placeholder="Vente du bien"></div>
                    <div class="field">
                      <label>Type d'action</label>
                      <select formControlName="typeAction">
                        <option value="VENTE">Vente</option>
                        <option value="PARTAGE">Partage</option>
                        <option value="DONATION">Donation</option>
                        <option value="MANDAT">Mandat</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    </div>
                    <div class="field"><label>Description</label><input formControlName="description" placeholder="Détails..."></div>
                  </div>
                  <button type="submit" [disabled]="addingConsent()">
                    {{ addingConsent() ? 'Création...' : '+ Créer la demande' }}
                  </button>
                </form>
              </div>
            }

            <div class="consent-list">
              @for (c of dossier()!.consentements; track c.id) {
                <div class="consent-card">
                  <div class="consent-header">
                    <div>
                      <div class="consent-titre">{{ c.titre }}</div>
                      <div class="consent-type">{{ typeLabel(c.typeAction) }}</div>
                    </div>
                    <span class="c-statut" [class]="'cs-' + c.statut.toLowerCase()">
                      {{ consentStatutLabel(c.statut) }}
                    </span>
                  </div>

                  <!-- Barre de progression -->
                  <div class="progress-section">
                    <div class="progress-bar-wrap">
                      <div class="progress-bar"
                           [style.width.%]="c.progressPercent"
                           [class]="'pb-' + c.statut.toLowerCase()"></div>
                    </div>
                    <div class="progress-stats">
                      <span class="green-num">{{ c.reponsesAcceptees }} acceptés</span>
                      <span class="red-num">{{ c.reponsesRejetees }} refusés</span>
                      <span class="gray-num">{{ c.reponsesEnAttente }} en attente</span>
                    </div>
                  </div>

                  <!-- Réponses détaillées -->
                  @if (c.reponses && c.reponses.length > 0) {
                    <div class="reponses">
                      @for (r of c.reponses; track r.id) {
                        <div class="reponse-row">
                          <div class="r-nom">{{ r.heritierNom }}</div>
                          <span class="r-status" [class]="'r-' + (r.reponse || 'en_attente').toLowerCase()">
                            {{ reponseLabel(r.reponse) }}
                          </span>
                          @if (r.reponduLe) {
                            <span class="r-date">{{ r.reponduLe | date:'dd/MM/yy HH:mm' }}</span>
                          }
                        </div>
                      }
                    </div>
                  }

                  @if (auth.isNotaire()) {
                    <div class="relancer-row">
                      <button class="btn-relancer"
                              [disabled]="relancerLoadingId() === c.id"
                              (click)="relancer(c.id)">
                        {{ relancerLoadingId() === c.id ? '...' : '📨 Relancer' }}
                      </button>
                      @if (relancerSuccessId() === c.id) {
                        <span class="relancer-ok">✓ Relances envoyées</span>
                      }
                    </div>
                  }
                </div>
              }

              @if (dossier()!.consentements.length === 0) {
                <div class="empty">Aucune demande de consentement créée.</div>
              }
            </div>
          </div>
        }

        <!-- TAB: DOCUMENTS -->
        @if (activeTab() === 'documents') {
          <div class="tab-content">

            @if (auth.isNotaire()) {
              <div class="form-card">
                <h3>Ajouter un document</h3>
                <div class="upload-zone" (click)="fileInput.click()"
                     [class.upload-zone--has-file]="selectedFile()">
                  <input #fileInput type="file" hidden (change)="onFileSelected($event)" />
                  @if (selectedFile()) {
                    <span class="upload-filename">📄 {{ selectedFile()!.name }}</span>
                  } @else {
                    <span class="upload-hint">Cliquez pour sélectionner un fichier</span>
                  }
                </div>
                <div class="upload-row">
                  <select [(ngModel)]="selectedTypeDoc" class="type-select">
                    <option value="ACTE_PROPRIETE">Acte de propriété</option>
                    <option value="PIECE_IDENTITE">Pièce d'identité</option>
                    <option value="ACTE_NAISSANCE">Acte de naissance</option>
                    <option value="PROCURATION">Procuration</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                  <button class="btn-upload"
                          [disabled]="!selectedFile() || uploadingDoc()"
                          (click)="uploadDocument()">
                    @if (uploadingDoc()) { Envoi en cours... } @else { ↑ Uploader }
                  </button>
                </div>
                @if (uploadError()) {
                  <div class="upload-error">{{ uploadError() }}</div>
                }
              </div>
            }

            <div class="docs-list">
              @for (doc of dossier()!.documents; track doc.id) {
                <div class="doc-row">
                  <div class="doc-icon">{{ mimeIcon(doc.mimeType) }}</div>
                  <div class="doc-info">
                    <div class="doc-nom">{{ doc.nom }}</div>
                    <div class="doc-meta">{{ typeDocLabel(doc.typeDoc) }} · {{ formatSize(doc.taille) }}</div>
                  </div>
                  <span class="doc-date">{{ doc.uploadedAt | date:'dd/MM/yyyy' }}</span>
                  <div class="doc-actions">
                    <button class="btn-dl" (click)="downloadDocument(doc.id, doc.nom)"
                            title="Télécharger">⬇</button>
                    @if (auth.isNotaire()) {
                      <button class="btn-del-doc" (click)="deleteDocument(doc.id)"
                              title="Supprimer">✕</button>
                    }
                  </div>
                </div>
              }
              @if (dossier()!.documents.length === 0) {
                <div class="empty">Aucun document uploadé.</div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');

    .page { padding: 32px; font-family: 'DM Sans', sans-serif; max-width: 1000px; }

    /* HEADER */
    .dossier-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 28px;
    }

    .ref-tag {
      display: inline-block; font-size: 11px; font-weight: 700;
      color: #c9a96e; background: rgba(201,169,110,0.12);
      border-radius: 6px; padding: 3px 10px; margin-bottom: 8px;
    }

    h1 { font-family: 'Playfair Display', serif; font-size: 24px; color: #1a1a2e; margin: 0 0 6px; }
    .addr { font-size: 13px; color: #888; }

    .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }

    .statut {
      font-size: 12px; font-weight: 700; padding: 6px 14px;
      border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;
    }

    .s-ouvert { background: rgba(72,187,120,0.12); color: #38a169; }
    .s-en_vente { background: rgba(66,153,225,0.12); color: #3182ce; }
    .s-bloque { background: rgba(237,137,54,0.12); color: #dd6b20; }

    .valeur { font-size: 22px; font-weight: 700; color: #1a1a2e; }

    /* TABS */
    .tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 2px solid #eee; }

    .tab {
      padding: 10px 20px; background: none; border: none;
      font-size: 14px; font-weight: 600; color: #888;
      cursor: pointer; border-bottom: 2px solid transparent;
      margin-bottom: -2px; transition: all 0.2s;
      font-family: 'DM Sans', sans-serif;
    }

    .tab.active { color: #c9a96e; border-bottom-color: #c9a96e; }
    .tab:hover { color: #1a1a2e; }

    .tab-content { }

    /* FORM CARD */
    .form-card {
      background: #fff; border-radius: 14px; padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.05); margin-bottom: 20px;
    }

    .form-card h3 { margin: 0; font-size: 15px; color: #1a1a2e; }
    .form-card__header { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:16px; }
    .btn-secondary {
      display:inline-flex; align-items:center; justify-content:center;
      padding: 10px 18px; border: 1px solid #c9a96e; border-radius: 10px;
      background: #fff; color: #1a1a2e; font-weight:700; text-decoration:none;
      transition: background 0.2s, color 0.2s;
    }
    .btn-secondary:hover { background: #f7f2e8; color: #1a1a2e; }


    .form-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }

    .field { flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 5px; }
    label { font-size: 12px; font-weight: 600; color: #666; }

    input, select {
      padding: 9px 12px; border: 1.5px solid #ddd; border-radius: 8px;
      font-size: 13px; font-family: 'DM Sans', sans-serif;
      background: #fff; outline: none; transition: all 0.2s;
    }

    input:focus, select:focus { border-color: #c9a96e; }

    .form-card button[type="submit"] {
      padding: 10px 22px;
      background: linear-gradient(135deg, #c9a96e, #b8935a);
      border: none; border-radius: 8px; color: #fff;
      font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: 'DM Sans', sans-serif; transition: all 0.2s;
    }

    .form-card button:disabled { opacity: 0.6; cursor: not-allowed; }

    /* HÉRITIERS */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }

    .heritier-card {
      background: #fff; border-radius: 12px; padding: 16px;
      display: flex; gap: 12px; align-items: flex-start;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .heritier-card:hover:not(.heritier-card--editing) { transform: translateY(-2px); }

    .heritier-card--editing {
      box-shadow: 0 0 0 2px #c9a96e, 0 4px 16px rgba(0,0,0,0.08);
    }

    .h-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, #c9a96e, #e8c98a);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 16px; color: #1a1a2e; flex-shrink: 0;
    }

    .h-info { flex: 1; }
    .h-name { font-weight: 600; color: #1a1a2e; font-size: 14px; margin-bottom: 2px; }
    .h-email { font-size: 12px; color: #888; margin: 2px 0 8px; }
    .h-email--missing { color: #e0a060; font-style: italic; }

    .h-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }

    .part-badge {
      background: rgba(201,169,110,0.12); color: #b8935a;
      font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px;
    }
    .part-badge--zero { background: #f5f5f5; color: #bbb; font-style: italic; }

    .contact-badge {
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px;
    }

    .c-non_contacte { background: #f5f5f5; color: #999; }
    .c-contacte { background: rgba(66,153,225,0.12); color: #3182ce; }
    .c-identifie { background: rgba(72,187,120,0.12); color: #38a169; }
    .c-injoignable { background: rgba(237,137,54,0.12); color: #dd6b20; }

    .btn-edit-heir {
      margin-top: 6px; padding: 4px 12px;
      background: none; border: 1px solid #ddd; border-radius: 6px;
      font-size: 11px; color: #888; cursor: pointer; transition: all 0.15s;
    }
    .btn-edit-heir:hover { border-color: #c9a96e; color: #b8935a; }

    .h-edit-fields { display: flex; flex-direction: column; gap: 8px; margin: 6px 0; }
    .h-edit-field { display: flex; flex-direction: column; gap: 3px; }
    .h-edit-field label { font-size: 11px; font-weight: 600; color: #888; }
    .h-edit-field input {
      padding: 6px 10px; border: 1.5px solid #ddd; border-radius: 7px;
      font-size: 13px; outline: none; transition: border-color 0.15s;
      font-family: 'DM Sans', sans-serif;
    }
    .h-edit-field input:focus { border-color: #c9a96e; }

    .h-edit-actions { display: flex; gap: 8px; margin-top: 8px; }

    .btn-save-heir {
      padding: 5px 14px; background: linear-gradient(135deg, #c9a96e, #b8935a);
      border: none; border-radius: 7px; color: #fff;
      font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
    }
    .btn-save-heir:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-cancel-heir {
      padding: 5px 12px; background: none; border: 1px solid #ddd;
      border-radius: 7px; color: #888; font-size: 12px; cursor: pointer;
    }
    .btn-cancel-heir:hover { background: #f5f5f5; }

    .verified-badge {
      width: 22px; height: 22px; background: #38a169;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 12px; font-weight: 700; flex-shrink: 0;
    }

    /* CONSENTEMENTS */
    .consent-list { display: flex; flex-direction: column; gap: 14px; }

    .consent-card {
      background: #fff; border-radius: 14px; padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .consent-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
    .consent-titre { font-weight: 600; color: #1a1a2e; font-size: 15px; }
    .consent-type { font-size: 12px; color: #888; margin-top: 2px; }

    .c-statut {
      font-size: 11px; font-weight: 700; padding: 4px 12px;
      border-radius: 20px; text-transform: uppercase; white-space: nowrap;
    }

    .cs-en_attente { background: #fff8e1; color: #e65100; }
    .cs-partiel { background: rgba(66,153,225,0.12); color: #3182ce; }
    .cs-valide { background: rgba(72,187,120,0.12); color: #38a169; }
    .cs-rejete { background: rgba(220,50,50,0.1); color: #c33; }

    .progress-section { margin-bottom: 14px; }

    .progress-bar-wrap {
      height: 6px; background: #eee; border-radius: 10px; overflow: hidden; margin-bottom: 8px;
    }

    .progress-bar { height: 100%; border-radius: 10px; transition: width 0.5s; }

    .pb-valide { background: linear-gradient(90deg, #38a169, #48bb78); }
    .pb-rejete { background: linear-gradient(90deg, #e53e3e, #fc8181); }
    .pb-partiel, .pb-en_attente { background: linear-gradient(90deg, #c9a96e, #e8c98a); }

    .progress-stats { display: flex; gap: 16px; font-size: 12px; }

    .green-num { color: #38a169; font-weight: 600; }
    .red-num { color: #e53e3e; font-weight: 600; }
    .gray-num { color: #aaa; }

    .reponses { border-top: 1px solid #f0ede8; padding-top: 12px; display: flex; flex-direction: column; gap: 6px; }

    .reponse-row {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px;
    }

    .r-nom { flex: 1; color: #444; }

    .r-status {
      font-size: 11px; font-weight: 700; padding: 2px 8px;
      border-radius: 20px; text-transform: uppercase;
    }

    .r-accepte { background: rgba(72,187,120,0.12); color: #38a169; }
    .r-rejete { background: rgba(220,50,50,0.1); color: #c33; }
    .r-en_attente { background: #f5f5f5; color: #aaa; }
    .r-delegue { background: rgba(130,90,200,0.1); color: #805ad5; }

    .r-date { font-size: 11px; color: #bbb; }

    .btn-relancer {
      margin-top: 12px; padding: 7px 14px;
      background: rgba(201,169,110,0.1); border: 1px solid rgba(201,169,110,0.3);
      border-radius: 8px; color: #b8935a; font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s;
    }

    .btn-relancer:hover { background: rgba(201,169,110,0.2); }

    /* DOCUMENTS */
    .docs-list { display: flex; flex-direction: column; gap: 8px; }

    .doc-row {
      display: flex; align-items: center; gap: 14px;
      background: #fff; border-radius: 10px; padding: 14px 16px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.04);
    }

    .doc-icon { font-size: 22px; }
    .doc-info { flex: 1; }
    .doc-nom { font-weight: 600; color: #1a1a2e; font-size: 14px; }
    .doc-meta { font-size: 12px; color: #aaa; margin-top: 2px; }
    .doc-date { font-size: 12px; color: #bbb; white-space: nowrap; }

    .doc-actions { display: flex; gap: 6px; }

    .btn-dl {
      padding: 6px 10px; background: rgba(201,169,110,0.1);
      border: 1px solid rgba(201,169,110,0.3); border-radius: 8px;
      font-size: 14px; cursor: pointer; transition: all 0.2s;
    }
    .btn-dl:hover { background: rgba(201,169,110,0.2); }

    .btn-del-doc {
      padding: 6px 10px; background: rgba(220,50,50,0.07);
      border: 1px solid rgba(220,50,50,0.2); border-radius: 8px;
      font-size: 12px; color: #c33; cursor: pointer; transition: all 0.2s;
    }
    .btn-del-doc:hover { background: rgba(220,50,50,0.15); }

    /* UPLOAD */
    .upload-zone {
      border: 2px dashed #e0dbd3; border-radius: 12px; padding: 24px;
      text-align: center; cursor: pointer; transition: all 0.2s;
      margin-bottom: 14px;
    }
    .upload-zone:hover, .upload-zone--has-file { border-color: #c9a96e; background: rgba(201,169,110,0.05); }
    .upload-hint { font-size: 13px; color: #aaa; }
    .upload-filename { font-size: 13px; color: #1a1a2e; font-weight: 600; }

    .upload-row { display: flex; gap: 10px; align-items: center; }

    .type-select {
      flex: 1; padding: 10px 12px; border: 1.5px solid #ddd;
      border-radius: 10px; font-size: 13px; font-family: 'DM Sans', sans-serif;
      background: #fff; outline: none;
    }
    .type-select:focus { border-color: #c9a96e; }

    .btn-upload {
      padding: 10px 22px;
      background: linear-gradient(135deg, #c9a96e, #e8c98a);
      border: none; border-radius: 10px; color: #fff;
      font-size: 13px; font-weight: 700; cursor: pointer;
      font-family: 'DM Sans', sans-serif; white-space: nowrap;
      transition: all 0.2s;
    }
    .btn-upload:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-upload:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(201,169,110,0.4); }

    .upload-error {
      margin-top: 10px; font-size: 12px; color: #e53e3e;
      background: rgba(229,62,62,0.08); border: 1px solid rgba(229,62,62,0.2);
      border-radius: 8px; padding: 8px 12px;
    }

    /* MISC */
    .loading {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; padding: 80px; color: #888; font-size: 14px;
    }

    .spinner {
      width: 22px; height: 22px;
      border: 2px solid #eee; border-top-color: #c9a96e;
      border-radius: 50%; animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .empty { text-align: center; padding: 32px; color: #bbb; font-size: 14px; }

    /* PART VALIDATION */
    .part-dispo { font-size: 11px; font-weight: 400; color: #888; margin-left: 8px; }
    .input-error { border-color: #e53e3e !important; }
    .part-error { font-size: 11px; color: #e53e3e; margin-top: 3px; display: block; }
    .save-error {
      font-size: 12px; color: #e53e3e;
      background: rgba(229,62,62,0.08); border: 1px solid rgba(229,62,62,0.2);
      border-radius: 8px; padding: 8px 12px; margin-bottom: 8px;
    }

    /* REFRESH BAR */
    .refresh-bar {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; padding: 8px 14px;
      background: rgba(201,169,110,0.06); border-radius: 10px;
      border: 1px solid rgba(201,169,110,0.15);
    }

    .refresh-hint { font-size: 12px; color: #aaa; }

    .btn-refresh {
      padding: 5px 14px; background: none;
      border: 1px solid #c9a96e; border-radius: 8px;
      font-size: 12px; font-weight: 600; color: #c9a96e;
      cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif;
    }

    .btn-refresh:hover { background: rgba(201,169,110,0.1); }

    /* RELANCER */
    .relancer-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; }

    .btn-relancer:disabled { opacity: 0.6; cursor: not-allowed; }

    .relancer-ok {
      font-size: 12px; font-weight: 600; color: #38a169;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  `]
})
export class DossierDetailComponent implements OnInit, OnDestroy {
  dossier = signal<DossierDetail | null>(null);
  loading = signal(true);
  activeTab = signal<'heritiers' | 'consentements' | 'documents'>('heritiers');
  addingHeritier = signal(false);
  addingConsent = signal(false);
  relancerLoadingId = signal<string | null>(null);
  relancerSuccessId = signal<string | null>(null);

  heritiersActifs = computed(() => (this.dossier()?.heritiers ?? []).filter(h => h.isHeir));
  editingHeritierId = signal<string | null>(null);
  savingHeritierId = signal<string | null>(null);
  saveHeritierError = signal('');
  editEmail = '';
  editPart: number | null = null;

  // Documents
  selectedFile = signal<File | null>(null);
  selectedTypeDoc = 'AUTRE';
  uploadingDoc = signal(false);
  uploadError = signal('');

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  heritierForm = this.fb.group({
    prenom: ['', Validators.required],
    nom: ['', Validators.required],
    email: ['', Validators.email],
    part: [0, [Validators.required, Validators.min(0), Validators.max(1)]]
  });

  consentForm = this.fb.group({
    titre: ['', Validators.required],
    typeAction: ['VENTE', Validators.required],
    description: ['']
  });

  private dossierId!: string;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    public auth: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.dossierId = this.route.snapshot.paramMap.get('id')!;
    this.loadDossier();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  switchTab(tab: 'heritiers' | 'consentements' | 'documents'): void {
    this.activeTab.set(tab);
    if (tab === 'consentements') {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollInterval = setInterval(() => this.silentRefresh(), 10_000);
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  silentRefresh(): void {
    this.api.getDossier(this.dossierId).subscribe({
      next: d => this.dossier.set(d),
      error: () => {}
    });
  }

  loadDossier(): void {
    this.loading.set(true);
    this.api.getDossier(this.dossierId).subscribe({
      next: d => { this.dossier.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  ajouterHeritier(): void {
    if (this.heritierForm.invalid) return;
    this.addingHeritier.set(true);
    this.api.addHeritier(this.dossierId, this.heritierForm.value as any).subscribe({
      next: () => { this.heritierForm.reset({ part: 0 }); this.loadDossier(); this.addingHeritier.set(false); },
      error: () => this.addingHeritier.set(false)
    });
  }

  creerConsentement(): void {
    if (this.consentForm.invalid) return;
    this.addingConsent.set(true);
    this.api.createConsentement(this.dossierId, this.consentForm.value as any).subscribe({
      next: () => { this.consentForm.reset({ typeAction: 'VENTE' }); this.loadDossier(); this.addingConsent.set(false); },
      error: () => this.addingConsent.set(false)
    });
  }

  startEditHeritier(h: any): void {
    this.editingHeritierId.set(h.id);
    this.editEmail = h.email ?? '';
    this.editPart = h.part ?? null;
  }

  cancelEditHeritier(): void {
    this.editingHeritierId.set(null);
    this.saveHeritierError.set('');
  }

  /** Part max disponible pour un héritier donné (1 - somme des autres parts) */
  partDisponible(heritierId: string): number {
    const heritiers = this.dossier()?.heritiers ?? [];
    const sommeParts = heritiers
      .filter(h => h.id !== heritierId)
      .reduce((acc, h) => acc + (h.part ?? 0), 0);
    return Math.max(0, Math.round((1 - sommeParts) * 10000) / 10000);
  }

  saveHeritier(heritierId: string): void {
    const payload: { email?: string; part?: number } = {};
    if (this.editEmail?.trim()) payload.email = this.editEmail.trim();
    if (this.editPart !== null && this.editPart !== undefined) payload.part = +this.editPart;

    this.saveHeritierError.set('');
    this.savingHeritierId.set(heritierId);
    this.api.updateHeritier(this.dossierId, heritierId, payload).subscribe({
      next: () => {
        this.editingHeritierId.set(null);
        this.savingHeritierId.set(null);
        this.loadDossier();
      },
      error: (e) => {
        this.savingHeritierId.set(null);
        this.saveHeritierError.set(e.error?.message ?? 'Erreur lors de la sauvegarde.');
      }
    });
  }

  relancer(id: string): void {
    this.relancerLoadingId.set(id);
    this.relancerSuccessId.set(null);
    this.api.relancerConsentement(id).subscribe({
      next: () => {
        this.relancerLoadingId.set(null);
        this.relancerSuccessId.set(id);
        this.silentRefresh();
        setTimeout(() => this.relancerSuccessId.set(null), 4000);
      },
      error: () => this.relancerLoadingId.set(null)
    });
  }

  // ---- DOCUMENTS ----

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.uploadError.set('');
  }

  uploadDocument(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.uploadingDoc.set(true);
    this.uploadError.set('');
    this.api.uploadDocument(this.dossierId, file, this.selectedTypeDoc).subscribe({
      next: () => {
        this.selectedFile.set(null);
        this.uploadingDoc.set(false);
        this.loadDossier();
      },
      error: (e) => {
        this.uploadingDoc.set(false);
        this.uploadError.set(e.error?.message ?? 'Erreur lors de l\'upload.');
      }
    });
  }

  downloadDocument(docId: string, nom: string): void {
    this.api.downloadDocument(docId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nom;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {}
    });
  }

  deleteDocument(docId: string): void {
    if (!confirm('Supprimer ce document ?')) return;
    this.api.deleteDocument(docId).subscribe({
      next: () => this.loadDossier(),
      error: () => {}
    });
  }

  mimeIcon(mime?: string): string {
    if (!mime) return '📄';
    if (mime.startsWith('image/')) return '🖼';
    if (mime === 'application/pdf') return '📕';
    if (mime.includes('word')) return '📝';
    if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
    return '📄';
  }

  typeDocLabel(t: string): string {
    const m: Record<string, string> = {
      ACTE_PROPRIETE: 'Acte de propriété', PIECE_IDENTITE: 'Pièce d\'identité',
      ACTE_NAISSANCE: 'Acte de naissance', PROCURATION: 'Procuration', AUTRE: 'Autre'
    };
    return m[t] ?? t;
  }

  // ---- LABELS ----

  statutLabel(s: string): string {
    const m: Record<string, string> = { OUVERT: 'Ouvert', EN_VENTE: 'En vente', BLOQUE: 'Bloqué', ARCHIVE: 'Archivé', RESOLU: 'Résolu' };
    return m[s] ?? s;
  }

  contactLabel(s: string): string {
    const m: Record<string, string> = { NON_CONTACTE: 'Non contacté', CONTACTE: 'Contacté', IDENTIFIE: 'Identifié', INJOIGNABLE: 'Injoignable' };
    return m[s] ?? s;
  }

  typeLabel(t: string): string {
    const m: Record<string, string> = { VENTE: 'Vente', PARTAGE: 'Partage', DONATION: 'Donation', MANDAT: 'Mandat', AUTRE: 'Autre' };
    return m[t] ?? t;
  }

  consentStatutLabel(s: string): string {
    const m: Record<string, string> = { EN_ATTENTE: 'En attente', PARTIEL: 'Partiel', VALIDE: 'Validé', REJETE: 'Rejeté', EXPIRE: 'Expiré' };
    return m[s] ?? s;
  }

  reponseLabel(r: string): string {
    const m: Record<string, string> = { ACCEPTE: 'Accepté', REJETE: 'Refusé', DELEGUE: 'Délégué', EN_ATTENTE: 'En attente' };
    return m[r] ?? r;
  }

  formatSize(b?: number): string {
    if (!b) return '';
    if (b < 1024) return `${b} o`;
    if (b < 1048576) return `${(b / 1024).toFixed(0)} Ko`;
    return `${(b / 1048576).toFixed(1)} Mo`;
  }
}
