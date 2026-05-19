import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FamilyMember } from './family-tree.model';
import { FAMILY_DATA } from './family-tree.data';

@Injectable({ providedIn: 'root' })
export class FamilyTreeService {
  private membersSubject = new BehaviorSubject<FamilyMember[]>(FAMILY_DATA);
  members$ = this.membersSubject.asObservable();

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

  addMember(member: FamilyMember): void {
    const current = this.getAll();
    this.membersSubject.next([...current, member]);
  }

  updateMember(updated: FamilyMember): void {
    const current = this.getAll().map(m => m.id === updated.id ? updated : m);
    this.membersSubject.next(current);
  }

  deleteMember(id: string): void {
    const current = this.getAll().filter(m => m.id !== id);
    this.membersSubject.next(current);
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
