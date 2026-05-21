export interface FamilyMember {
  id: string;
  personneId?: string;  // Backend personne ID for family tree operations
  firstName: string;
  lastName: string;
  email?: string;
  birthYear: number;
  deathYear?: number;
  gender: 'male' | 'female';
  profession?: string;
  city?: string;
  spouseId?: string;
  parentIds?: string[];
  photoInitials?: string;
  displayOrder?: number;
  validated?: boolean;
  isHeir?: boolean;
}

export interface FamilyNode {
  member: FamilyMember;
  generation: number;
  x: number;
  y: number;
  children: FamilyNode[];
  spouse?: FamilyNode;
}
