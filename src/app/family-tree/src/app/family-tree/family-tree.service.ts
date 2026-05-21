import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AddHeritierRequest } from '../../../../shared/models/models';
import { FamilyMember } from './family-tree.model';
import { FAMILY_DATA } from './family-tree.data';
import { ApiService } from '../../../../core/services/api.service';

@Injectable({ providedIn: 'root' })
export class FamilyTreeService {
  private membersSubject = new BehaviorSubject<FamilyMember[]>(FAMILY_DATA);
  members$ = this.membersSubject.asObservable();
  
  private currentDossierId: string | null = null;
  private useBackend = false;

  constructor(private apiService: ApiService) {}

  getCurrentDossierId(): string | null {
    return this.currentDossierId;
  }

  setDossier(dossierId: string | null): void {
    this.currentDossierId = dossierId;
    this.useBackend = !!dossierId;
    if (dossierId) {
      this.loadFromBackend(dossierId);
    } else {
      this.membersSubject.next(FAMILY_DATA);
    }
  }

  private loadFromBackend(dossierId: string): void {
    this.apiService.getFamilyTree(dossierId).subscribe({
      next: (members: any) => {
        const parsed = this.parseMembers(members);
        if (parsed && parsed.length > 0) {
          console.log(`Loaded ${parsed.length} family members from database for dossier ${dossierId}`);
          this.membersSubject.next(parsed);
          return;
        }

        console.warn('No family members returned from family-tree endpoint, trying dossier detail fallback.');
        this.loadFromDossierDetailFallback(dossierId);
      },
      error: (error: any) => {
        console.warn(`Failed to load family tree from backend (${error?.status}). Trying dossier detail fallback.`);
        this.loadFromDossierDetailFallback(dossierId);
      }
    });
  }

  private loadFromDossierDetailFallback(dossierId: string): void {
    this.apiService.getDossier(dossierId).subscribe({
      next: (detail: any) => {
        const parsed = this.parseMembers(detail?.relations_familiales ?? detail?.familyMembers ?? detail?.relationsFamiliales ?? detail?.arbre ?? []);
        if (parsed && parsed.length > 0) {
          console.log(`Loaded ${parsed.length} family members from dossier detail fallback for dossier ${dossierId}`);
          this.membersSubject.next(parsed);
        } else {
          console.warn('Fallback dossier detail did not contain family members. Using demo data.');
          this.membersSubject.next(FAMILY_DATA);
        }
      },
      error: (error: any) => {
        console.error(`Failed to load dossier detail fallback (${error?.status}). Using demo data.`);
        this.membersSubject.next(FAMILY_DATA);
      }
    });
  }

  private parseMembers(payload: any): FamilyMember[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload === 'object' && payload.data && Array.isArray(payload.data)) {
      return payload.data;
    }
    return [];
  }

  private toAddHeritierRequest(member: FamilyMember): AddHeritierRequest {
    return {
      nom: member.lastName || '',
      prenom: member.firstName || '',
      email: undefined,
      telephone: undefined,
      dateNaissance: member.birthYear ? `${member.birthYear}-01-01` : undefined,
      adresse: member.city,
      part: 0,
      role: member.profession ?? 'Héritier arbre',
      gender: member.gender,
      validated: member.validated ?? false,
      isHeir: member.isHeir ?? false,
    };
  }

  getAll(): FamilyMember[] {
    return this.membersSubject.getValue();
  }

  getById(id: string): FamilyMember | undefined {
    return this.getAll().find(m => m.id === id);
  }

  getChildren(parentId: string): FamilyMember[] {
    return this.getAll().filter(m => m.parentIds?.includes(parentId));
  }

  getRoots(): FamilyMember[] {
    return this.getAll().filter(m => !m.parentIds || m.parentIds.length === 0);
  }

  addMember(member: FamilyMember): Observable<FamilyMember> {
    if (this.useBackend && this.currentDossierId) {
      return new Observable(observer => {
        const request = this.toAddHeritierRequest(member);
        this.apiService.addHeritier(this.currentDossierId!, request).subscribe(
          (newHeritier: any) => {
            const persistedMember: FamilyMember = {
              ...member,
              id: newHeritier.personneId || newHeritier.id || member.id,
              personneId: newHeritier.personneId || newHeritier.id,
              validated: newHeritier.validated ?? member.validated ?? false,
              isHeir: newHeritier.isHeir ?? member.isHeir ?? false,
            };
            const current = this.getAll();
            this.membersSubject.next([...current, persistedMember]);
            observer.next(persistedMember);
            observer.complete();
          },
          (error: any) => {
            console.error('Error adding member via heritier API:', error);
            observer.error(error);
          }
        );
      });
    } else {
      // Fallback to local state
      const current = this.getAll();
      this.membersSubject.next([...current, member]);
      return new Observable(observer => {
        observer.next(member);
        observer.complete();
      });
    }
  }

  updateMember(updated: FamilyMember): Observable<FamilyMember> {
    if (this.useBackend && this.currentDossierId) {
      return new Observable(observer => {
        this.apiService.updateFamilyMember(this.currentDossierId!, updated.personneId || updated.id, updated).subscribe(
          (updatedMember: any) => {
            const current = this.getAll().map(m => m.id === updated.id ? updatedMember : m);
            this.membersSubject.next(current);
            observer.next(updatedMember);
            observer.complete();
          },
          (error: any) => {
            console.error('Error updating member:', error);
            observer.error(error);
          }
        );
      });
    } else {
      // Fallback to local state
      const current = this.getAll().map(m => m.id === updated.id ? updated : m);
      this.membersSubject.next(current);
      return new Observable(observer => {
        observer.next(updated);
        observer.complete();
      });
    }
  }

  deleteMember(id: string): Observable<void> {
    if (this.useBackend && this.currentDossierId) {
      return new Observable(observer => {
        this.apiService.deleteFamilyMember(this.currentDossierId!, id).subscribe({
          next: () => {
            const current = this.getAll().filter(m => m.id !== id);
            this.membersSubject.next(current);
            observer.next();
            observer.complete();
          },
          error: (error: any) => {
            console.error('Error deleting member:', error);
            observer.error(error);
          }
        });
      });
    } else {
      // Fallback to local state
      const current = this.getAll().filter(m => m.id !== id);
      this.membersSubject.next(current);
      return new Observable(observer => {
        observer.next();
        observer.complete();
      });
    }
  }

  search(query: string): FamilyMember[] {
    const q = query.toLowerCase();
    return this.getAll().filter(m =>
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      m.city?.toLowerCase().includes(q) ||
      m.profession?.toLowerCase().includes(q)
    );
  }
}
