export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  deathYear?: number;
  gender: 'male' | 'female';
  profession?: string;
  city?: string;
  spouseId?: string;
  parentIds?: string[];
  photoInitials?: string;
}

export interface FamilyNode {
  member: FamilyMember;
  generation: number;
  x: number;
  y: number;
  children: FamilyNode[];
  spouse?: FamilyNode;
}
