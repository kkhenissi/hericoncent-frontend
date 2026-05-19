import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FamilyMember } from '../family-tree.model';

@Component({
  selector: 'app-member-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card__header">
        <div class="card__avatar" [class.male]="member.gender==='male'" [class.female]="member.gender==='female'">
          {{ initials }}
        </div>
        <div class="card__title">
          <h3>{{ member.firstName }} {{ member.lastName }}</h3>
          <span class="card__lifespan">{{ lifespan }}</span>
        </div>
        <button class="card__close" (click)="onClose.emit()">✕</button>
      </div>
      <div class="card__body">
        <div class="card__row" *ngIf="member.profession">
          <span class="card__label">Profession</span>
          <span class="card__value">{{ member.profession }}</span>
        </div>
        <div class="card__row" *ngIf="member.city">
          <span class="card__label">Ville</span>
          <span class="card__value">{{ member.city }}</span>
        </div>
        <div class="card__row">
          <span class="card__label">Genre</span>
          <span class="card__value">{{ member.gender === 'male' ? 'Homme' : 'Femme' }}</span>
        </div>
      </div>
      <div class="card__actions">
        <button class="btn btn--edit" (click)="onEdit.emit(member)">Modifier</button>
        <button class="btn btn--delete" (click)="confirmDelete()">Supprimer</button>
      </div>
    </div>
  `,
  styles: [`
    .card { background:#fff; border:1px solid #eee; border-radius:12px; overflow:hidden; }
    .card__header { display:flex; align-items:center; gap:12px; padding:1rem; border-bottom:1px solid #f0f0f0; }
    .card__avatar { width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;flex-shrink:0; }
    .card__avatar.male { background:#E1F5EE;color:#0F6E56; }
    .card__avatar.female { background:#FBEAF0;color:#993556; }
    .card__title h3 { margin:0;font-size:15px;font-weight:600; }
    .card__lifespan { font-size:11px;color:#888; }
    .card__close { margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;color:#aaa; }
    .card__body { padding:1rem; display:grid; grid-template-columns:1fr; gap:6px; }
    .card__row { display:flex;justify-content:space-between;font-size:13px; }
    .card__label { color:#888; }
    .card__value { font-weight:500; }
    .card__actions { padding:.75rem 1rem;border-top:1px solid #f0f0f0;display:flex;gap:8px; }
    .btn { padding:6px 14px;border-radius:8px;border:1px solid #ddd;cursor:pointer;font-size:12px; }
    .btn--edit { background:#E6F1FB;color:#185FA5;border-color:#85B7EB; }
    .btn--delete { background:#FCEBEB;color:#A32D2D;border-color:#F09595; }
  `]
})
export class MemberCardComponent {
  @Input() member!: FamilyMember;
  @Output() onEdit = new EventEmitter<FamilyMember>();
  @Output() onDelete = new EventEmitter<string>();
  @Output() onClose = new EventEmitter<void>();

  get initials(): string {
    return (this.member.firstName[0] + this.member.lastName[0]).toUpperCase();
  }

  get lifespan(): string {
    return this.member.deathYear
      ? `${this.member.birthYear} – ${this.member.deathYear}`
      : `né(e) en ${this.member.birthYear}`;
  }

  confirmDelete(): void {
    if (confirm(`Supprimer ${this.member.firstName} ${this.member.lastName} ?`)) {
      this.onDelete.emit(this.member.id);
    }
  }
}
