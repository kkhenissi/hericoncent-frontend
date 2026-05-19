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

  setDossier(dossierId: string | null): void {
    this.currentDossierId = dossierId;
    this.useBackend = !!dossierId;
    if (dossierId) {
      this.loadFromBackend(dossierId);
    }
  }

  private loadFromBackend(dossierId: string): void {
    this.apiService.getFamilyTree(dossierId).subscribe(
      (members: any) => {
        this.membersSubject.next(members || []);
      },
      (error: any) => {
        console.error('Error loading family tree from backend:', error);
        // Fallback to empty if backend fails
        this.membersSubject.next([]);
      }
    );
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
    if (this.useBackend) {
      return new Observable(observer => {
        this.apiService.updateFamilyMember(updated.id, updated).subscribe(
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
    if (this.useBackend) {
      return new Observable(observer => {
        this.apiService.deleteFamilyMember(id).subscribe(
          () => {
            const current = this.getAll().filter(m => m.id !== id);
            this.membersSubject.next(current);
            observer.next();
            observer.complete();
          },
          (error: any) => {
            console.error('Error deleting member:', error);
            observer.error(error);
          }
        );
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
