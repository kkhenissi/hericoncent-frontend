import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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
        if (members && members.length > 0) {
          console.log(`Loaded ${members.length} family members from database for dossier ${dossierId}`);
          this.membersSubject.next(members);
        } else {
          console.warn('No family members found in database. Using demo data.');
          this.membersSubject.next(FAMILY_DATA);
        }
      },
      error: (error: any) => {
        console.warn(`Failed to load family tree from backend (${error.status}). Using demo data.`);
        if (error.status === 404 || error.status === 500) {
          console.info('ℹ️ Make sure your backend implements the endpoint: GET /api/dossiers/{dossierId}/family-tree');
        }
        // Fallback to demo data if backend fails
        this.membersSubject.next(FAMILY_DATA);
      }
    });
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
        this.apiService.createFamilyMember(this.currentDossierId!, member).subscribe(
          (newMember: any) => {
            const current = this.getAll();
            this.membersSubject.next([...current, newMember]);
            observer.next(newMember);
            observer.complete();
          },
          (error: any) => {
            console.error('Error adding member:', error);
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
        this.apiService.updateFamilyMember(this.currentDossierId!, updated.id, updated).subscribe(
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
