// ============================================
// MODELS — HériConsent
// ============================================

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  email: string;
  role: string;
  userId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// --- Dossier ---
export interface Dossier {
  id: string;
  reference: string;
  titre: string;
  description?: string;
  referenceCadastrale?: string;
  adresseBien?: string;
  statut: DossierStatut;
  valeurEstimee?: number;
  nombreHeritiers: number;
  nombreConsentements: number;
  createdAt: string;
  updatedAt?: string;
}

export interface DossierDetail extends Dossier {
  heritiers: Heritier[];
  consentements: Consentement[];
  documents: Document[];
}

export type DossierStatut = 'OUVERT' | 'EN_VENTE' | 'BLOQUE' | 'ARCHIVE' | 'RESOLU';

export interface CreateDossierRequest {
  titre: string;
  description?: string;
  referenceCadastrale?: string;
  adresseBien?: string;
  valeurEstimee?: number;
  notaireId?: string;
}

// --- Héritier ---
export interface Heritier {
  id: string;
  personneId: string;
  nomComplet: string;
  email?: string;
  telephone?: string;
  part: number;
  role: string;
  statutContact: StatutContact;
  identityVerified: boolean;
  validated?: boolean;
  isHeir?: boolean;
  reponseConsentement?: string;
}

export type StatutContact = 'NON_CONTACTE' | 'CONTACTE' | 'IDENTIFIE' | 'INJOIGNABLE';

export interface AddHeritierRequest {
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  dateNaissance?: string;
  adresse?: string;
  part: number;
  role?: string;
  gender?: string;
  validated?: boolean;
  isHeir?: boolean;
}

// --- Consentement ---
export interface Consentement {
  id: string;
  titre: string;
  description?: string;
  typeAction: TypeAction;
  statut: ConsentementStatut;
  seuilAccord: number;
  expireLe?: string;
  totalHeritiers: number;
  reponsesAcceptees: number;
  reponsesRejetees: number;
  reponsesEnAttente: number;
  progressPercent: number;
  createdAt: string;
  reponses?: ReponseDetail[];
}

export type ConsentementStatut = 'EN_ATTENTE' | 'PARTIEL' | 'VALIDE' | 'REJETE' | 'EXPIRE';
export type TypeAction = 'VENTE' | 'PARTAGE' | 'DONATION' | 'MANDAT' | 'AUTRE';

export interface ReponseDetail {
  id: string;
  heritierId: string;
  heritierNom: string;
  reponse: string;
  commentaire?: string;
  reponduLe?: string;
  signe: boolean;
}

export interface CreateConsentementRequest {
  titre: string;
  description?: string;
  typeAction: TypeAction;
  seuilAccord?: number;
  expireLe?: string;
}

export interface RepondreRequest {
  reponse: 'ACCEPTE' | 'REJETE' | 'DELEGUE';
  commentaire?: string;
}

// --- Document ---
export interface Document {
  id: string;
  nom: string;
  typeDoc: string;
  mimeType?: string;
  taille?: number;
  uploadedAt: string;
  downloadUrl?: string;
}

// --- Family Tree ---
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
