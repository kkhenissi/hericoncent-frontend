import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FamilyMember } from '../family-tree.model';

@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form">
      <h3 class="form__title">{{ member ? 'Modifier' : 'Ajouter' }} un membre</h3>

      <div class="form__row">
        <div class="form__field">
          <label>Prénom *</label>
          <input [(ngModel)]="draft.firstName" placeholder="Prénom" />
        </div>
        <div class="form__field">
          <label>Nom *</label>
          <input [(ngModel)]="draft.lastName" placeholder="Nom de famille" />
        </div>
      </div>

      <div class="form__row">
        <div class="form__field">
          <label>Email</label>
          <input type="email" [(ngModel)]="draft.email" placeholder="exemple@domaine.com" />
        </div>
        <div class="form__field">
          <label>Année de naissance *</label>
          <input type="number" [(ngModel)]="draft.birthYear" placeholder="1980" />
        </div>
      </div>
      <div class="form__row">
        <div class="form__field">
          <label>Année de décès</label>
          <input type="number" [(ngModel)]="draft.deathYear" placeholder="(si décédé)" />
        </div>
      </div>

      <div class="form__row">
        <div class="form__field">
          <label>Genre *</label>
          <select [(ngModel)]="draft.gender">
            <option value="male">Homme</option>
            <option value="female">Femme</option>
          </select>
        </div>
        <div class="form__field">
          <label>Ville</label>
          <input [(ngModel)]="draft.city" placeholder="Lyon" />
        </div>
      </div>

      <div class="form__field">
        <label>Profession</label>
        <input [(ngModel)]="draft.profession" placeholder="Ingénieur, Médecin..." />
      </div>

      <div class="form__field">
        <label>Validé</label>
        <label class="form__checkbox">
          <input type="checkbox" [(ngModel)]="draft.validated" />
          <span>Oui</span>
        </label>
      </div>

      <div class="form__field">
        <label>Parents (IDs séparés par virgule)</label>
        <input [ngModel]="draft.parentIds?.join(',')" (ngModelChange)="setParents($event)"
               placeholder="henri,marguerite" />
        <small class="form__hint">IDs disponibles : {{ memberIds }}</small>
      </div>

      <div class="form__field">
        <label>Conjoint (ID)</label>
        <input [(ngModel)]="draft.spouseId" placeholder="ex: henri" />
      </div>

      <div class="form__actions">
        <button class="btn btn--cancel" (click)="onCancel.emit()">Annuler</button>
        <button class="btn btn--save" (click)="save()" [disabled]="!isValid()">Enregistrer</button>
      </div>
    </div>
  `,
  styles: [`
    .form__title { margin:0 0 1rem;font-size:16px;font-weight:600; }
    .form__row { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px; }
    .form__field { display:flex;flex-direction:column;gap:4px;margin-bottom:12px; }
    .form__field label { font-size:11px;font-weight:500;color:#666; }
    .form__field input, .form__field select {
      padding:7px 10px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;
      &:focus { border-color:#378ADD; }
    }
    .form__hint { font-size:10px;color:#aaa;margin-top:2px; }
    .form__actions { display:flex;gap:8px;justify-content:flex-end;margin-top:1rem; }
    .btn { padding:7px 16px;border-radius:8px;border:1px solid #ddd;cursor:pointer;font-size:13px; }
    .btn--save { background:#185FA5;color:#fff;border-color:#185FA5; }
    .btn--save:disabled { opacity:0.5;cursor:not-allowed; }
    .btn--cancel { background:transparent;color:#666; }
  `]
})
export class MemberFormComponent implements OnInit {
  @Input() member: FamilyMember | null = null;
  @Input() allMembers: FamilyMember[] = [];
  @Output() onSave = new EventEmitter<FamilyMember>();
  @Output() onCancel = new EventEmitter<void>();

  draft: Partial<FamilyMember> = {};

  get memberIds(): string {
    return this.allMembers.map(m => m.id).join(', ');
  }

  ngOnInit(): void {
    this.draft = this.member ? { ...this.member } : {
      firstName: '', lastName: '', email: '', birthYear: new Date().getFullYear(),
      gender: 'male', parentIds: [], validated: false,
    };
  }

  setParents(val: string): void {
    this.draft.parentIds = val.split(',').map(s => s.trim()).filter(Boolean);
  }

  isValid(): boolean {
    return !!(this.draft.firstName && this.draft.lastName && this.draft.birthYear);
  }

  save(): void {
    if (!this.isValid()) return;
    this.onSave.emit(this.draft as FamilyMember);
  }
}
